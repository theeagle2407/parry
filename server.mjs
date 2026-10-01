import http from 'node:http';
import {existsSync} from 'node:fs';
import {createSupabaseStore} from './supabase-store.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import {createStore,chainVerifier} from './shared-store.mjs';
import {createPrivateApi} from './private-api.mjs';
const base=fileURLToPath(new URL('.',import.meta.url)),root=resolve(base,'public');
if(existsSync(resolve(base,'.env.local'))){if(!process.loadEnvFile)throw Error('Use Node.js 22 or newer.');process.loadEnvFile(resolve(base,'.env.local'));}
const config=JSON.parse(await readFile(resolve(root,'config.json'),'utf8'));
if(!config.pool)throw Error('Configure the deployed pool in public/config.json first.');
// Parry durable storage v1
const hasCloud=Boolean(process.env.SUPABASE_URL||process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY);
if((process.env.RENDER||process.env.NODE_ENV==='production')&&!hasCloud)throw Error('Configure Supabase before deploying; local storage is not durable on this host.');
const verify=chainVerifier(config);
const store=hasCloud?createSupabaseStore({url:process.env.SUPABASE_URL,key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,verify}):createStore(process.env.PARRY_DATA_DIR||resolve(base,'data'),verify);
if(hasCloud)await store.read();

const port=process.env.PORT||3000,origin=process.env.PARRY_PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||`http://localhost:${port}`;
if(new URL(origin).origin!==origin)throw Error('PARRY_PUBLIC_ORIGIN must be an origin without a trailing slash.');
const api=createPrivateApi(store,origin);
const server=http.createServer(async(req,res)=>{try{
 if(req.method==='GET'&&req.url==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:true}));return;}
 if(await api(req,res))return;
 const pathname=new URL(req.url,origin).pathname;
 if(req.method!=='GET'){res.writeHead(405);return res.end();}
 const file=pathname==='/ethers.js'?resolve(base,'node_modules/ethers/dist/ethers.min.js'):resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(pathname!=='/ethers.js'&&!file.startsWith(root+'/')){res.writeHead(403);return res.end();}
 const data=await readFile(file);res.setHeader('Content-Type',({'.css':'text/css','.html':'text/html','.js':'text/javascript','.json':'application/json'})[extname(file)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.end(data);
}catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}});
server.requestTimeout=30000;
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Stop the other Parry server before restarting.`:e.message);process.exitCode=1});
server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Parry: ${origin}`));
