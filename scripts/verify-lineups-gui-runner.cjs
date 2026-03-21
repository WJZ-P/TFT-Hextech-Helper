const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function resolveNpmCommand() {
  if (process.platform === 'win32') {
    return { command: process.env.comspec || 'cmd.exe', args: ['/d', '/s', '/c', 'npm run dev'] };
  }
  return { command: 'npm', args: ['run', 'dev'] };
}

function waitForMarker(buffer, marker) {
  return buffer.includes(marker);
}

(async function main() {
  const repoRoot = process.cwd();
  const screenshotPath = path.resolve(repoRoot, '.cache', 'gui-lineups-offline.png');
  const summaryPath = path.resolve(repoRoot, '.cache', 'gui-lineups-offline.json');
  const seasonPackDir = path.resolve(repoRoot, 'tests', 'backend', 'fixtures', 'gui-season-pack', 'Resources');

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

  const npmCommand = resolveNpmCommand();
  const opencvDistPath = path.resolve(repoRoot, 'node_modules', '@techstark', 'opencv-js', 'dist', 'opencv.js');
  const opencvBackupPath = path.resolve(repoRoot, '.cache', 'opencv-js-backup.js');
  let didStubOpencv = false;

  const tryRestoreOpencv = () => {
    try {
      if (didStubOpencv && fs.existsSync(opencvBackupPath)) {
        fs.copyFileSync(opencvBackupPath, opencvDistPath);
        try { fs.unlinkSync(opencvBackupPath); } catch (e) {}
        console.log('[verify-lineups] Restored original opencv.js from backup');
      }
    } catch (e) {
      console.warn('Failed to restore opencv dist in exit handler:', e && e.toString ? e.toString() : e);
    }
  };

  process.on('exit', () => tryRestoreOpencv());
  process.on('SIGINT', () => { tryRestoreOpencv(); process.exit(1); });
  process.on('SIGTERM', () => { tryRestoreOpencv(); process.exit(1); });

  try {
    if (fs.existsSync(opencvDistPath)) {
      fs.mkdirSync(path.dirname(opencvBackupPath), { recursive: true });
      fs.copyFileSync(opencvDistPath, opencvBackupPath);
      const stub = `(function(){\n  class Mat {\n    constructor(rows=0, cols=0, type=0){\n      this.rows = rows; this.cols = cols; this.type = type;\n      const channels = (type === 1 ? 3 : 1);\n      const MIN_SIZE = 4 * 1024 * 1024;\n      try { this.data = new Uint8Array(Math.max(MIN_SIZE, rows * cols * channels)); } catch(e) { this.data = new Uint8Array(1024); }\n    }\n    isDeleted(){return false}\n    delete(){this.data = new Uint8Array(0)}\n  }\n  class Scalar { constructor(...vals){ this.vals = vals } }\n  const cv = { Mat, Scalar, CV_8UC1:0, CV_8UC3:1, CV_8UC4:2, COLOR_RGBA2GRAY:0, cvtColor:(src,dst)=>{ if(dst && src && src.data && dst.data) dst.data.set(src.data.subarray(0, Math.min(dst.data.length, src.data.length))); return dst||src }, imread:()=>null, imwrite:()=>null, getBuildInformation:()=> 'mock-opencv', onRuntimeInitialized: undefined };\n  try{ globalThis.cv = cv; }catch(e){}\n  try{ if(typeof module !== 'undefined' && module.exports){ module.exports = cv; module.exports.default = cv; Object.defineProperty(module.exports, '__esModule', { value: true }); } }catch(e){}\n  try{ if(typeof exports !== 'undefined'){ exports.default = cv; } }catch(e){}\n  try{ if(typeof define === 'function' && define.amd) define(()=>cv); }catch(e){}\n})();\n`;
      fs.writeFileSync(opencvDistPath, stub, { encoding: 'utf8' });
      didStubOpencv = true;
    }
  } catch (e) {
    console.warn('Failed to stub opencv.js:', e && e.toString ? e.toString() : e);
  }

  const hasLocalSeasonImages = (() => {
    try {
      const files = fs.readdirSync(seasonPackDir);
      return files.some((f) => /\.(png|webp|jpe?g)$/i.test(f));
    } catch (e) { return false; }
  })();

  if (!hasLocalSeasonImages) console.warn('[verify-lineups] No local season-pack images found; allowing remote assets fallback');

  const child = spawn(npmCommand.command, npmCommand.args, {
    cwd: repoRoot,
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: '',
      TFT_START_ROUTE: '/lineups',
      TFT_GUI_VERIFY: '1',
      TFT_GUI_VERIFY_WAIT_MS: '180000',
      TFT_GUI_VERIFY_EXIT: '1',
      TFT_GUI_VERIFY_SCREENSHOT: screenshotPath,
      TFT_GUI_VERIFY_SUMMARY: summaryPath,
      TFT_BLOCK_REMOTE_ASSETS: hasLocalSeasonImages ? '1' : '0',
      TFT_SEASON_PACK_DIR: seasonPackDir,
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    windowsHide: true,
  });

  let stdout = '';
  let stderr = '';
  const capturedOutput = [];

  child.stdout.on('data', (chunk) => { const text = chunk.toString(); stdout += text; capturedOutput.push(text); process.stdout.write(chunk); });
  child.stderr.on('data', (chunk) => { const text = chunk.toString(); stderr += text; if (capturedOutput.join('').length < 200000) capturedOutput.push(text); process.stderr.write(chunk); });

  const exitCode = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('GUI verification timed out before Electron exited')); }, 45000);
    child.on('error', (error) => { clearTimeout(timeout); reject(error); });
    child.on('close', (code) => { clearTimeout(timeout); resolve(code ?? 0); });
  }).catch(async (e) => { /* on error, try to persist output */
    const combinedOutput = capturedOutput.join('');
    try { const dumpPath = path.resolve(repoRoot, '.cache', 'gui-verify-captured-output.log'); fs.mkdirSync(path.dirname(dumpPath), { recursive: true }); fs.writeFileSync(dumpPath, combinedOutput, { encoding: 'utf8' }); } catch (err) { console.warn('Failed to write captured output dump:', err && err.toString ? err.toString() : err); }
    try { if (didStubOpencv && fs.existsSync(opencvBackupPath)) { fs.copyFileSync(opencvBackupPath, opencvDistPath); fs.unlinkSync(opencvBackupPath); } } catch (err) { console.warn('Failed to restore opencv dist during error path:', err && err.toString ? err.toString() : err); }
    throw e;
  });

  if (!waitForMarker(stdout, '[GUI_VERIFY]')) {
    const combinedOutput = capturedOutput.join('');
    const failureTail = combinedOutput.slice(-4000);
    try { const dumpPath = path.resolve(repoRoot, '.cache', 'gui-verify-captured-output.log'); fs.mkdirSync(path.dirname(dumpPath), { recursive: true }); fs.writeFileSync(dumpPath, combinedOutput, { encoding: 'utf8' }); } catch (e) { console.warn('Failed to write captured output dump:', e && e.toString ? e.toString() : e); }
    try { if (didStubOpencv && fs.existsSync(opencvBackupPath)) { fs.copyFileSync(opencvBackupPath, opencvDistPath); fs.unlinkSync(opencvBackupPath); } } catch (e) { console.warn('Failed to restore opencv dist during error path:', e && e.toString ? e.toString() : e); }
    throw new Error(`GUI verification did not emit summary (exit=${exitCode})\n${failureTail}`);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  if (!summary.lineupPageVisible || summary.localImageCount <= 0 || summary.remoteImageCount !== 0 || summary.brokenImageCount !== 0) {
    throw new Error(`GUI verification summary failed expectations: ${JSON.stringify(summary, null, 2)}`);
  }

  console.log(`[gui-verify] summary=${JSON.stringify(summary)}`);
  console.log(`[gui-verify] screenshot=${screenshotPath}`);
  console.log(`[gui-verify] report=${summaryPath}`);

  try { if (didStubOpencv && fs.existsSync(opencvBackupPath)) { fs.copyFileSync(opencvBackupPath, opencvDistPath); fs.unlinkSync(opencvBackupPath); } } catch (e) { console.warn('Failed to restore opencv dist after success:', e && e.toString ? e.toString() : e); }
})();
