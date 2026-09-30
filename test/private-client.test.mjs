import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('Account switching clears private data and discards a late response for the previous wallet',async()=>{
 const source=readFileSync(new URL('../public/index.html',import.meta.url),'utf8').split('// Private submissions v1:')[1].split('</script>')[0];
 const memory=new Map(),ctx=vm.createContext({state:{studies:[],reviews:[],joins:[]},account:'',localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},document:{querySelector:()=>null,createElement:()=>({})},setTimeout:()=>{},setInterval:()=>{},addEventListener:()=>{},render:()=>{},toast:()=>{},fetch:async()=>({ok:true,json:async()=>({studies:[],reviews:[]})}),Date,console});
 vm.runInContext('// Private submissions v1:'+source,ctx);await ctx.sharedQueue;
 ctx.account='owner';ctx.resetPrivateIdentity();let release,requested;const wait=new Promise(r=>requested=r);const slow=new Promise(r=>release=r);
 ctx.privateRequest=async(path)=>{if(path==='/api/auth/session')return {address:'owner',expires:Date.now()+60000};requested();return slow};
 const old=ctx.syncShared();await wait;
 ctx.state.reviews=[{id:'old-private'}];ctx.account='reviewer';ctx.resetPrivateIdentity();assert.equal(ctx.state.reviews.length,0);
 release({studies:[],reviews:[{id:'owner-private',screenshots:['secret']}]});await old;
 assert.equal(ctx.state.reviews.length,0);assert.equal(JSON.parse(memory.get('parry.v1')).reviews.length,0);
});
