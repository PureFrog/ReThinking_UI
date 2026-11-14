// Tiny static server for mockups under public/ (no deps). usage: node tools/game/serve-static.mjs [port]
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../public/',import.meta.url));
const port=+(process.argv[2]||5180);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.jpg':'image/jpeg'};
createServer(async(req,res)=>{
  const path=normalize(decodeURIComponent(new URL(req.url,'http://x').pathname)).replace(/^([\\/])+/,'');
  const file=join(root,path||'index.html');
  if(!file.startsWith(root)){res.writeHead(403).end();return}
  try{const body=await readFile(file);res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream','cache-control':'no-store'}).end(body)}
  catch{res.writeHead(404).end('not found')}
}).listen(port,'127.0.0.1',()=>console.log(`mockups on http://localhost:${port}/mockups/game-g0.html`));
