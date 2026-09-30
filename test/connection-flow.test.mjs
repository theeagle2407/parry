import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const source=html.slice(html.indexOf('async function connectAndSignIn(){'),html.indexOf('\nfunction updateWalletHeader(){',html.indexOf('async function connectAndSignIn(){')));
function harness(reject=false){const calls=[],elements={'#connect':{disabled:false,textContent:''},'#error':{textContent:''},'#wallet':{close:()=>calls.push('close')}};const context=vm.createContext({connectionBusy:false,account:'',privateIdentity:'',pending:()=>calls.push('continue'),$:s=>elements[s],window:{ethereum:{request:async()=>{calls.push('connect');return ['0xabc']}}},localStorage:{removeItem:()=>{}},resetPrivateIdentity:()=>{},updateWalletHeader:()=>{},privateSignIn:async()=>{calls.push('sign');if(reject)throw {code:4001};context.privateIdentity=context.account},render:()=>{},toast:()=>{}});vm.runInContext(source,context);return {context,calls,elements}}
test('Connecting immediately requests sign-in before continuing to the app',async()=>{const h=harness();await h.context.connectAndSignIn();assert.deepEqual(h.calls,['connect','sign','close','continue']);assert.equal(h.elements['#connect'].disabled,false)});
test('Cancelled sign-in does not continue or mark the connection authenticated',async()=>{const h=harness(true);await h.context.connectAndSignIn();assert.deepEqual(h.calls,['connect','sign']);assert.match(h.elements['#error'].textContent,/cancelled/)});
