import { copyFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const distDir = 'dist';
const indexHtml = join(distDir, 'index.html');

if (existsSync(indexHtml)) {
  // 1. 404.html fallback cho mọi route động (VD: /doi-tac/:id)
  copyFileSync(indexHtml, join(distDir, '404.html'));

  // 2. .nojekyll để GitHub Pages phục vụ nguyên vẹn mọi file tĩnh
  writeFileSync(join(distDir, '.nojekyll'), '');

  // 3. Tạo sẵn index.html cho các route chính để trình duyệt nhận HTTP 200 OK khi F5
  const routes = [
    'login',
    'phe',
    'tai-chinh',
    'ton-kho',
    'nhan-vien',
    'bao-cao',
    'danh-ba',
    'doi-soat',
    'cai-dat',
    'nhap-phe',
    'xay-phe',
    'xuat-phe',
    'can-phe',
    'cong-no',
    'chi-phi',
  ];

  for (const r of routes) {
    const dir = join(distDir, r);
    mkdirSync(dir, { recursive: true });
    copyFileSync(indexHtml, join(dir, 'index.html'));
  }

  console.log('Prepared GitHub Pages SPA routes in dist/');
}
