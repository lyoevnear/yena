import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
// URL.fileURLToPath handles Korean/space-containing workspace paths on Windows.
import { fileURLToPath } from 'node:url';
import { illustrationScript } from './illustrations.mjs';
const base = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.md': 'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 3000);
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/data/story-illustrations.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(await illustrationScript());
    }
    const target = resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(resolve(base) + sep)) { res.writeHead(403); return res.end('Forbidden'); }
    if (!(await stat(target)).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
