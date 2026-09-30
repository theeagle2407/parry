import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('public/index.html','utf8');
function harness(){const updates=[];const source=html.split('\n').find(line=>line.startsWith('async function transact('));const context=vm.createContext({toast:()=>{},showTransaction:(hash,status)=>updates.push({hash,status})});vm.runInContext(source,context);return {run:context.transact,updates}}
test('Receipt confirmation, not transaction submission, marks a payment confirmed',async()=>{
 const {run,updates}=harness();let finish;const waiting=new Promise(resolve=>finish=resolve);
 const result=run(Promise.resolve({hash:'0xsubmitted',wait:()=>waiting}),'Fund');
 await new Promise(resolve=>setImmediate(resolve));assert.equal(updates.at(-1).status,'Pending confirmation');
 finish({hash:'0xsubmitted',status:1});await result;
 assert.equal(updates.at(-1).status,'Confirmed on Arbitrum Sepolia');
});
test('Replaced successful payment uses the replacement receipt',async()=>{
 const {run,updates}=harness();const receipt={hash:'0xreplacement',status:1};
 const result=await run(Promise.resolve({hash:'0xoriginal',wait:async()=>{throw {code:'TRANSACTION_REPLACED',cancelled:false,receipt}}}),'Fund');
 assert.equal(result.hash,receipt.hash);assert.equal(updates.at(-1).hash,receipt.hash);
});
test('Cancelled and unavailable confirmations never display success',async()=>{
 for(const err of [{code:'TRANSACTION_REPLACED',cancelled:true},new Error('RPC unavailable')]){
 const {run,updates}=harness();await assert.rejects(run(Promise.resolve({hash:'0xpending',wait:async()=>{throw err}}),'Fund'));
 assert.ok(!updates.some(x=>x.status==='Confirmed on Arbitrum Sepolia'));
 assert.match(updates.at(-1).status,/Cancelled|unavailable/);
 }
});
