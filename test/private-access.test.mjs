import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {Wallet} from 'ethers';
import {createAuth} from '../private-access.mjs';
import {createPrivateApi} from '../private-api.mjs';
test('Sign-in challenges expire, require the right wallet/browser and cannot be replayed',async()=>{
 let time=Date.now();const auth=createAuth('https://parry.example',()=>time),a=Wallet.createRandom(),b=Wallet.createRandom();
 let c=auth.challenge(a.address);const signature=await a.signMessage(c.message);
 assert.throws(()=>auth.verify(c.nonce,'other-browser',signature));
 const session=auth.verify(c.nonce,c.nonce,signature);assert.equal(auth.session(session.token).address,a.address.toLowerCase());
 assert.throws(()=>auth.verify(c.nonce,c.nonce,signature));
 c=auth.challenge(a.address);const wrong=await b.signMessage(c.message);assert.throws(()=>auth.verify(c.nonce,c.nonce,wrong),/does not match/);
 c=auth.challenge(a.address);const expired=await a.signMessage(c.message);time+=300001;assert.throws(()=>auth.verify(c.nonce,c.nonce,expired),/expired/);
 time+=3600000;assert.equal(auth.session(session.token),null);
});
test('HTTP API hides other submissions, enforces authorship, logout and account boundaries',async()=>{
 const owner=Wallet.createRandom(),reviewer=Wallet.createRandom(),other=Wallet.createRandom(),otherOwner=Wallet.createRandom();
 const db={studies:[{id:'one',owner:owner.address},{id:'two',owner:otherOwner.address}],reviews:[{id:'a',study:'one',author:reviewer.address,screenshots:['PRIVATE A']},{id:'b',study:'one',author:other.address,screenshots:['PRIVATE B']},{id:'c',study:'two',author:other.address,screenshots:['PRIVATE C']}]};
 let writes=0;const store={read:async()=>db,put:async()=>{writes++}};let handler;
 const server=http.createServer((req,res)=>handler(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;handler=createPrivateApi(store,origin);
 async function request(path,{method='GET',cookie='',wallet='',body,from=origin}={}){const r=await fetch(origin+path,{method,headers:{Origin:from,Cookie:cookie,'X-Parry-Wallet':wallet,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookies:r.headers.getSetCookie()}}
 async function login(w){const c=await request('/api/auth/challenge',{method:'POST',body:{address:w.address}});const nonceCookie=c.cookies[0].split(';')[0];const v=await request('/api/auth/verify',{method:'POST',cookie:nonceCookie,body:{nonce:c.data.nonce,signature:await w.signMessage(c.data.message)}});assert.equal(v.status,200);assert.match(v.cookies[0],/HttpOnly; SameSite=Strict/);return v.cookies[0].split(';')[0]}
 try{
 const anon=await request('/api/workspace');assert.equal(anon.data.studies.length,2);assert.deepEqual(anon.data.reviews,[]);
 const oc=await login(owner),rc=await login(reviewer),xc=await login(otherOwner);
 assert.deepEqual((await request('/api/workspace',{cookie:oc,wallet:owner.address})).data.reviews.map(x=>x.id),['a','b']);
 assert.deepEqual((await request('/api/workspace',{cookie:rc,wallet:reviewer.address})).data.reviews.map(x=>x.id),['a']);
 assert.deepEqual((await request('/api/workspace',{cookie:xc,wallet:otherOwner.address})).data.reviews.map(x=>x.id),['c']);
 assert.deepEqual((await request('/api/workspace',{cookie:oc,wallet:reviewer.address})).data.reviews,[]);
 assert.equal((await request('/api/workspace',{method:'POST',body:{kind:'reviews',record:db.reviews[0]}})).status,401);
 assert.equal((await request('/api/workspace',{method:'POST',cookie:rc,wallet:reviewer.address,body:{kind:'reviews',record:db.reviews[1]}})).status,403);
 assert.equal((await request('/api/workspace',{method:'POST',cookie:rc,wallet:reviewer.address,body:{kind:'reviews',record:db.reviews[0]}})).status,200);assert.equal(writes,1);
 assert.equal((await request('/api/auth/challenge',{method:'POST',from:'https://other.example',body:{address:owner.address}})).status,403);
 await request('/api/auth/logout',{method:'POST',cookie:oc,body:{}});assert.deepEqual((await request('/api/workspace',{cookie:oc,wallet:owner.address})).data.reviews,[]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
});
