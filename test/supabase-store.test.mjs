import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseStore} from '../supabase-store.mjs';
function service(){
 const rows=[];let fail=false;const calls=[];
 return {rows,calls,setFail:x=>fail=x,fetcher:async(url,options)=>{
  calls.push({url,options});if(fail)return new Response('secret details and credentials',{status:503});
  if(options.method==='POST'){const b=JSON.parse(options.body);const prior=rows.find(r=>r.kind===b.p_kind&&JSON.parse(r.payload).id===b.p_id);if(prior&&prior.payload!==b.p_payload)return new Response('conflict',{status:400});if(!prior)rows.push({kind:b.p_kind,payload:b.p_payload});return new Response(null,{status:204})}
  const offset=Number(new URL(url).searchParams.get('offset')||0);return Response.json(rows.slice(offset,offset+250));
 }};
}
const config={url:'https://example.supabase.co',key:'sb_secret_TEST_ONLY'};
test('Durable adapter preserves exact record ordering and image data across instances',async()=>{
 const mock=service(),verified=[];const args={...config,fetcher:mock.fetcher,verify:async(k,r)=>verified.push(r.id)};
 const a=createSupabaseStore(args);const record={id:'one',z:'first',a:'second',screenshots:[{data:'data:image/png;base64,YQ=='}]};
 await a.put('studies',record);await a.put('studies',record);assert.equal(verified.length,1);assert.equal(mock.rows[0].payload,JSON.stringify(record));
 const b=createSupabaseStore(args);assert.equal(JSON.stringify((await b.read()).studies[0]),JSON.stringify(record));
 await assert.rejects(b.put('studies',{...record,z:'altered'}),/overwritten/);
 assert.equal(mock.calls[0].options.headers.apikey,config.key);assert.equal(mock.calls[0].options.headers.Authorization,undefined);
});
test('Failed chain verification never writes; a failure does not block the queue',async()=>{
 const mock=service();const a=createSupabaseStore({...config,fetcher:mock.fetcher,verify:async(k,r)=>{if(r.id==='bad')throw Error('Not funded')}});
 await assert.rejects(a.put('studies',{id:'bad'}),/Not funded/);assert.equal(mock.rows.length,0);
 await a.put('studies',{id:'good'});assert.equal(mock.rows.length,1);
});
test('All pages load and upstream secrets are not exposed through errors',async()=>{
 const mock=service();for(let i=0;i<260;i++)mock.rows.push({kind:'studies',payload:JSON.stringify({id:String(i)})});
 const a=createSupabaseStore({...config,fetcher:mock.fetcher,verify:async()=>{}});assert.equal((await a.read()).studies.length,260);
 mock.setFail(true);await assert.rejects(a.read(),e=>e.message==='Storage rejected the operation. Check capacity or conflicting records.');
});
test('Rejects insecure endpoints and publishable keys',()=>{
 assert.throws(()=>createSupabaseStore({...config,url:'http://example.supabase.co'}),/HTTPS/);
 assert.throws(()=>createSupabaseStore({...config,key:'sb_publishable_abc'}),/server-only/);
});
