import { mkdir, copyFile, cp } from 'node:fs/promises';
import { prepareIllustrations } from './illustrations.mjs';
await prepareIllustrations();
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'styles.css', 'app.js', 'favicon.svg']) await copyFile(name, `dist/${name}`);
await cp('data', 'dist/data', { recursive: true });
await cp('public', 'dist/public', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
console.log('Static site built in dist/');
