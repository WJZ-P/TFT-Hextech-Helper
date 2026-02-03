const fs = require('fs');
const vm = require('vm');

const sourcePath = 'f:/GithubProjects/TFT-Hextech-Helper/public/TFTInfo/S4/equip.ts';
const targetPath = 'f:/GithubProjects/TFT-Hextech-Helper/src-backend/TFTInfo/equip.ts';

const content = fs.readFileSync(sourcePath, 'utf8')
  .replace(/export const\s+TFT_4_EQUIP\s*=\s*/, 'module.exports = ');

const context = { module: { exports: {} } };
new vm.Script(content, { filename: sourcePath }).runInNewContext(context);

const all = context.module.exports;
const shown = all.filter(item => String(item.isShow) === '1');

const esc = (value) => String(value ?? '')
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"');

const typeOrder = ['1', '2', '3', '4', '6', '7'];
const typeLabels = {
  '1': 'Type 1: 基础散件 (Base Items)',
  '2': 'Type 2: 标准合成装备 (Standard Completed Items)',
  '3': 'Type 3: 光明装备 (Radiant Items)',
  '4': 'Type 4: 特殊道具 (Special Items)',
  '6': 'Type 6: 奥恩神器 (Ornn Artifacts)',
  '7': 'Type 7: 金鳞龙装备 (Shimmerscale Items)'
};

const byType = new Map();
for (const item of shown) {
  const type = String(item.type || '');
  if (!byType.has(type)) byType.set(type, []);
  byType.get(type).push(item);
}

const usedKeys = new Set();
let output = '    ...specialEquip,\n';

for (const type of typeOrder) {
  const list = byType.get(type);
  if (!list || list.length === 0) continue;

  output += `    // ==========================================\n`;
  output += `    // ${typeLabels[type] || `Type ${type}`}\n`;
  output += `    // ==========================================\n`;

  for (const item of list) {
    let key = item.name;
    if (usedKeys.has(key)) {
      if (String(item.englishName || '').includes('_HR')) {
        key = `${key}_HR`;
      } else {
        key = `${key}_${item.equipId}`;
      }
    }

    usedKeys.add(key);

    output += `    "${esc(key)}": {\n`;
    output += `        name: "${esc(item.name)}",\n`;
    output += `        englishName: "${esc(item.englishName)}",\n`;
    output += `        equipId: "${esc(item.equipId)}",\n`;
    output += `        formula: "${esc(item.formula)}"\n`;
    output += `    },\n`;
  }

  output += '\n';
}

const target = fs.readFileSync(targetPath, 'utf8');
const replacement = `export const _TFT_4_EQUIP_DATA: Record<string, TFTEquip> = {\n${output.trimEnd()}\n} satisfies  Record<string, TFTEquip>`;
const updated = target.replace(/export const _TFT_4_EQUIP_DATA:[\s\S]*?}\s*satisfies\s+Record<string, TFTEquip>/, replacement);

if (updated === target) {
  console.log('No changes needed for _TFT_4_EQUIP_DATA.');
  process.exit(0);
}

fs.writeFileSync(targetPath, updated, 'utf8');
console.log('Updated _TFT_4_EQUIP_DATA with', shown.length, 'items.');
