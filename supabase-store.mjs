// Server-only durable storage. Keep the secret out of public/ and client code.
export function createSupabaseStore({url,key,verify,fetcher=fetch}){
 let parsed;try{parsed=new URL(url)}catch{throw Error('Set SUPABASE_URL to your project URL.')}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=='/'||!parsed.hostname.endsWith('.supabase.co'))throw Error('Use the HTTPS Supabase project URL, without a path.');
 if(typeof key!=='string'||(!key.startsWith('sb_secret_')&&!key.startsWith('eyJ')))throw Error('Set the server-only Supabase secret or legacy service-role key.');
 const base=parsed.origin+'/rest/v1',headers={apikey:key,'Content-Type':'application/json'};
 if(key.startsWith('eyJ'))headers.Authorization='Bearer '+key;
 async function request(path,options={}){
  let response;try{response=await fetcher(base+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(25000)})}catch{throw Error('Storage connection unavailable. Try again shortly.')}
  if(!response.ok){
   // Never forward provider response bodies, URLs or secrets to clients.
   if(response.status===401||response.status===403)throw Error('Storage credentials or permissions are not configured correctly.');
   if(response.status===404)throw Error('Storage schema missing. Run docs/supabase-setup.sql.');
   throw Error('Storage rejected the operation. Check capacity or conflicting records.');
  }
  const text=await response.text();return text?JSON.parse(text):null;
 }
 async function read(){
  const db={studies:[],reviews:[]};
  for(let offset=0;offset<1500;offset+=250){
   const rows=await request('/parry_records?select=kind,payload&order=seq.asc&limit=250&offset='+offset);
   if(!Array.isArray(rows))throw Error('Invalid storage response.');
   for(const row of rows){if(!['studies','reviews'].includes(row.kind))throw Error('Invalid stored record.');db[row.kind].push(JSON.parse(row.payload))}
   if(rows.length<250)return db;
  }
  throw Error('Workspace capacity exceeded.');
 }
 let queue=Promise.resolve();
 function put(kind,record){
  const job=queue.then(async()=>{
   if(!['studies','reviews'].includes(kind)||!record||Array.isArray(record)||typeof record!=='object'||typeof record.id!=='string'||!record.id||record.id.length>100)throw Error('Invalid record.');
   const payload=JSON.stringify(record);if(Buffer.byteLength(payload)>9500000)throw Error('Record too large.');
   const db=await read(),prior=db[kind].find(r=>r.id===record.id);
   if(prior){if(JSON.stringify(prior)!==payload)throw Error('Published records cannot be overwritten.');return}
   if(db[kind].length>=500)throw Error('Workspace capacity reached.');
   await verify(kind,record,db);
   await request('/rpc/parry_append',{method:'POST',body:JSON.stringify({p_kind:kind,p_id:record.id,p_payload:payload})});
  });queue=job.catch(()=>{});return job;
 }
 return {read,put};
}
