// 从 scripts/logo-assets/*.b64 还原 public/ 下的中国华电 logo PNG（仓库以 base64 文本形式存档 logo，npm install 后自动还原）
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'scripts', 'logo-assets');
const publicDir = join(root, 'public');

if (!existsSync(assetsDir)) {
  console.log('[restore-logos] no logo-assets found, skip');
  process.exit(0);
}
mkdirSync(publicDir, { recursive: true });
let n = 0;
for (const f of readdirSync(assetsDir)) {
  if (!f.endsWith('.b64')) continue;
  const out = join(publicDir, f.replace(/\.b64$/, ''));
  writeFileSync(out, Buffer.from(readFileSync(join(assetsDir, f), 'utf8').replace(/\s/g, ''), 'base64'));
  n++;
}
console.log(`[restore-logos] restored ${n} logo file(s) to public/`);
