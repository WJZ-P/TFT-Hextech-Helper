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
  const capturedOutputPath = path.resolve(repoRoot, '.cache', 'gui-verify-captured-output.log');
  const seasonPackDir = path.resolve(repoRoot, 'tests', 'backend', 'fixtures', 'gui-season-pack', 'Resources');
  const verifierProfileName = `gui-verify-profile-${process.pid}-${Date.now()}`;

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  fs.rmSync(summaryPath, { force: true });
  fs.rmSync(capturedOutputPath, { force: true });

  const npmCommand = resolveNpmCommand();
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
      TFT_GUI_VERIFY_WAIT_MS: '5000',
      TFT_GUI_VERIFY_EXIT: '1',
      TFT_GUI_VERIFY_SCREENSHOT: screenshotPath,
      TFT_GUI_VERIFY_SUMMARY: summaryPath,
      TFT_GUI_VERIFY_PROFILE: verifierProfileName,
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
    throw e;
  });

  if (!waitForMarker(stdout, '[GUI_VERIFY]')) {
    const combinedOutput = capturedOutput.join('');
    const failureTail = combinedOutput.slice(-4000);
    try { const dumpPath = path.resolve(repoRoot, '.cache', 'gui-verify-captured-output.log'); fs.mkdirSync(path.dirname(dumpPath), { recursive: true }); fs.writeFileSync(dumpPath, combinedOutput, { encoding: 'utf8' }); } catch (e) { console.warn('Failed to write captured output dump:', e && e.toString ? e.toString() : e); }
    throw new Error(`GUI verification did not emit summary (exit=${exitCode})\n${failureTail}`);
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  if (!summary.lineupPageVisible || summary.localImageCount <= 0 || (summary.remoteLoadedImageCount || 0) !== 0 || (summary.brokenLocalImageCount || 0) !== 0) {
    throw new Error(`GUI verification summary failed expectations: ${JSON.stringify(summary, null, 2)}`);
  }

  console.log(`[gui-verify] summary=${JSON.stringify(summary)}`);
  console.log(`[gui-verify] screenshot=${screenshotPath}`);
  console.log(`[gui-verify] report=${summaryPath}`);
})();
