import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(root, 'dist'), { recursive: true });
const child = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  '--yes', '@vscode/vsce', 'package', '--no-dependencies',
  '--out', join(root, 'dist', 'gpt-pixel-office.vsix')
], {
  cwd: join(root, 'extensions', 'vscode'),
  stdio: 'inherit',
  windowsHide: true
});
if (child.error) {
  console.error('VSIX build failed:', child.error.message);
  process.exit(1);
}
process.exit(child.status ?? 1);
