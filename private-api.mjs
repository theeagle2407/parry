import {createAuth,filterWorkspace,mayWrite} from './private-access.mjs';
export function createPrivateApi(store,origin){
 const auth=createAuth(origin),secure=new URL(origin).protocol==='https:';let active=0;
 const cookie=(name,value,age)=>`${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`;
 const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),x.slice(i+1).trim()]}));
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store, private','Vary':'Cookie, X-Parry-Wallet','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body))};
 async function body(req,limit){if(!req.headers['content-type']?.startsWith('application/json'))throw Error('JSON required.');let n=0,parts=[];for await(const part of req){n+=part.length;if(n>limit)throw Error('Request too large.');parts.push(part)}return JSON.parse(Buffer.concat(parts).toString())}
 return async(req,res)=>{
  const path=new URL(req.url,origin).pathname;if(!path.startsWith('/api/'))return false;
  const c=cookies(req),session=auth.session(c.parry_session),wallet=req.headers['x-parry-wallet']?.toLowerCase();
  const address=session&&wallet===session.address?session.address:null;
  try{
   if(req.method==='POST'&&req.headers.origin!==origin){json(res,403,{error:'Request origin not allowed.'});return true}
   if(path==='/api/auth/session'&&req.method==='GET'){json(res,200,address?session:{address:null});return true}
   if(path==='/api/auth/challenge'&&req.method==='POST'){
    const {address:requested}=await body(req,2048);const result=auth.challenge(requested);res.setHeader('Set-Cookie',cookie('parry_nonce',result.nonce,300));json(res,200,result);return true;
   }
   if(path==='/api/auth/verify'&&req.method==='POST'){
    const {nonce,signature}=await body(req,4096);const result=auth.verify(nonce,c.parry_nonce,signature);if(c.parry_session)auth.logout(c.parry_session);res.setHeader('Set-Cookie',[cookie('parry_session',result.token,3600),cookie('parry_nonce','',0)]);json(res,200,{address:result.address,expires:result.expires});return true;
   }
   if(path==='/api/auth/logout'&&req.method==='POST'){auth.logout(c.parry_session);res.setHeader('Set-Cookie',cookie('parry_session','',0));json(res,200,{ok:true});return true}
   if(path==='/api/workspace'&&req.method==='GET'){json(res,200,filterWorkspace(await store.read(),address));return true}
   if(path==='/api/workspace'&&req.method==='POST'){
    if(!address){json(res,401,{error:'Sign in with your wallet to save a submission.'});return true}
    if(active>=4){json(res,429,{error:'Server busy. Try again shortly.'});return true}active++;
    try{const {kind,record}=await body(req,9500000);if(!mayWrite(kind,record,address)){json(res,403,{error:'You can only save records belonging to your signed-in wallet.'});return true}await store.put(kind,record);json(res,200,{ok:true})}finally{active--}return true;
   }
   json(res,404,{error:'Not found.'});return true;
  }catch(e){json(res,400,{error:e.shortMessage||e.message||'Request failed.'});return true}
 };
}
