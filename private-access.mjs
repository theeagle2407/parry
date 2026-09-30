import {randomBytes} from 'node:crypto';
import {isAddress,verifyMessage} from 'ethers';
export function createAuth(origin,now=()=>Date.now()){
 const challenges=new Map(),sessions=new Map();
 const clean=()=>{for(const map of [challenges,sessions])for(const [k,v] of map)if(v.expires<=now())map.delete(k)};
 return {
  challenge(address){clean();if(!isAddress(address))throw Error('Invalid wallet.');if(challenges.size>=1000)throw Error('Too many sign-in attempts.');const nonce=randomBytes(24).toString('hex'),expires=now()+300000;const message=`Sign in to Parry\n\nWebsite: ${origin}\nWallet: ${address.toLowerCase()}\nChain ID: 421614\nNonce: ${nonce}\nIssued at: ${new Date(now()).toISOString()}\nExpires at: ${new Date(expires).toISOString()}\n\nThis signature authenticates your wallet to view and save submissions. It does not approve a transaction or transfer funds.`;challenges.set(nonce,{address:address.toLowerCase(),message,expires});return {nonce,message,expires}},
  verify(nonce,cookieNonce,signature){clean();if(nonce!==cookieNonce)throw Error('Sign-in challenge does not match this browser.');const c=challenges.get(nonce);challenges.delete(nonce);if(!c||c.expires<=now())throw Error('Sign-in expired. Try again.');if(verifyMessage(c.message,signature).toLowerCase()!==c.address)throw Error('Signature does not match wallet.');if(sessions.size>=1000)throw Error('Too many active sessions.');const token=randomBytes(32).toString('hex'),session={address:c.address,expires:now()+3600000};sessions.set(token,session);return {token,...session}},
  session(token){clean();return sessions.get(token)||null},
  logout(token){sessions.delete(token)}
 };
}
export function filterWorkspace(db,address){
 const wallet=address?.toLowerCase();
 const owned=new Set(db.studies.filter(s=>wallet&&s.owner?.toLowerCase()===wallet).map(s=>s.id));
 return {studies:db.studies,reviews:wallet?db.reviews.filter(r=>r.author?.toLowerCase()===wallet||owned.has(r.study)):[]};
}
export function mayWrite(kind,record,address){return !!address&&['studies','reviews'].includes(kind)&&typeof record?.[kind==='studies'?'owner':'author']==='string'&&record[kind==='studies'?'owner':'author'].toLowerCase()===address.toLowerCase()}
