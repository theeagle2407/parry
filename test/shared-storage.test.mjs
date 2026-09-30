import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ganache from 'ganache';
import {BrowserProvider,ContractFactory,id,parseEther,ZeroAddress} from 'ethers';
import {createStore,chainVerifier} from '../shared-store.mjs';
test('Chain-bound shared briefs and screenshots persist and reject tampering',async()=>{
 const rpc=ganache.provider({logging:{quiet:true},chain:{chainId:421614}}),provider=new BrowserProvider(rpc);provider.pollingInterval=10;
 const directory=await mkdtemp(join(tmpdir(),'parry-shared-'));
 try{
 const creator=await provider.getSigner(0),reviewer=await provider.getSigner(1);
 const artifact=JSON.parse(await readFile(new URL('../public/artifacts/ReviewPool.json',import.meta.url)));
 const pool=await new ContractFactory(artifact.abi,artifact.bytecode,creator).deploy(ZeroAddress);await pool.waitForDeployment();
 const store=createStore(directory,chainVerifier({pool:await pool.getAddress()},provider));
 const now=Number((await provider.getBlock('latest')).timestamp);
 const s={id:'shared-one',title:'Checkout review',team:'Team',description:'Try checkout',audience:'Customers',criteria:'Actionable evidence',duration:'10 minutes',type:'Product review',deadline:new Date((now+3600)*1000).toISOString(),createdAt:new Date().toISOString(),tasks:['Open checkout'],url:'https://example.com',reward:'0.0001',owner:await creator.getAddress(),poolAddress:await pool.getAddress(),tokenAddress:ZeroAddress,assetDecimals:18,assetSymbol:'ETH',chainId:id('shared-one')};
 s.briefHash=id(JSON.stringify(s));
 await assert.rejects(store.put('studies',s),/not confirmed/);
 s.fundingTx=(await (await pool.fund(s.chainId,parseEther(s.reward),now+3600,s.briefHash,{value:parseEther(s.reward)})).wait()).hash;
 await store.put('studies',s);await store.put('studies',s);
 await assert.rejects(store.put('studies',{...s,title:'Replaced'}),/overwritten/);
 const r={id:'feedback-one',study:s.id,title:'Checkout issue',observation:'Button unclear',suggestion:'Label it clearly',createdAt:new Date().toISOString(),rating:3,evidence:'',screenshots:[{name:'screen.png',data:'data:image/png;base64,aGVsbG8='}],author:await reviewer.getAddress()};r.contentHash=id(JSON.stringify(r));
 await assert.rejects(store.put('reviews',r),/not confirmed/);
 await(await pool.connect(reviewer).submit(s.chainId,r.contentHash)).wait();
 await assert.rejects(store.put('reviews',{...r,suggestion:'Changed'}),/not confirmed/);
 await store.put('reviews',r);
 const reopened=createStore(directory,chainVerifier({pool:await pool.getAddress()},provider));const db=await reopened.read();
 assert.equal(db.studies.length,1);assert.deepEqual(db.reviews[0],r);
 console.log('PASS unfunded content rejected; funded brief accepted; duplicate idempotent; overwrite rejected; unsubmitted review rejected; altered content rejected; screenshot roundtrip and restart persistence');
 }finally{await rm(directory,{recursive:true,force:true});await rpc.disconnect()}
});
