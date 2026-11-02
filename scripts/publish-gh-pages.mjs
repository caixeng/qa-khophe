import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

function run(cmd, cwd = process.cwd()) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, VITE_BASE_PATH: '/qa-khophe/' } });
}

// 1. Xoá dist/.git cũ nếu có và build production với base path /qa-khophe/
rmSync('dist/.git', { recursive: true, force: true });
run('npm run build');

// 2. Tạo 404.html, .nojekyll và các thư mục route SPA
run('node scripts/prepare-gh-pages.mjs');

// 3. Đẩy dist/ lên nhánh gh-pages của origin (giữ đúng core.sshCommand của repo gốc)
const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
let sshCommand = '';
try {
  sshCommand = execSync('git config --get core.sshCommand', { encoding: 'utf8' }).trim();
} catch {}

run('git init', 'dist');
if (sshCommand) {
  run(`git config core.sshCommand "${sshCommand}"`, 'dist');
}
run('git checkout -B gh-pages', 'dist');
run('git add -A', 'dist');
run('git commit -m "deploy: publish to GitHub Pages"', 'dist');
run(`git push -f "${remoteUrl}" gh-pages:gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log('\n✅ Published dist/ to branch gh-pages -> https://caixeng.github.io/qa-khophe/');
