import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try { if (!(await stat(path)).isFile()) throw Error('Not file'); res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'}); res.end(await readFile(path)); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, () => console.log(`Local calculator: http://localhost:${port}`));
