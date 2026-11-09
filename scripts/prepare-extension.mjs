import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'extensions', 'vscode', 'runtime');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const directory of ['server', 'public']) {
  await cp(join(root, directory), join(target, directory), { recursive: true });
}
console.log('VS Code/Antigravity extension runtime prepared:', target);
