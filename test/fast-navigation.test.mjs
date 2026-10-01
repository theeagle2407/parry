import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=html.indexOf('async function privateSignIn(){');
const source=html.slice(start,html.indexOf('\nfunction syncShared(',start));
function harness(valid){const calls=[];const c=vm.createContext({account:'wallet',privateIdentity:valid?'wallet':'',privateExpiry:valid?Date.now()+60000:0,privateEpoch:0,signing:null,resetPrivateIdentity:()=>{},updateWalletHeader:()=>{},localStorage:{setItem:()=>{}},privateRequest:async()=>{calls.push('session');return {address:'wallet',expires:Date.now()+60000}},syncShared:()=>{calls.push('sync');return new Promise(()=>{})}});vm.runInContext(source,c);return {c,calls}}
test('Valid sign-in returns without workspace requests',async()=>{const {c,calls}=harness(true);await c.privateSignIn();assert.deepEqual(calls,[])});
test('Restored session completes while workspace synchronization is pending',async()=>{const {c,calls}=harness(false);await c.privateSignIn();assert.deepEqual(calls,['session','sync']);assert.equal(c.privateIdentity,'wallet')});
