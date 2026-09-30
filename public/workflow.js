export function challengePhase(snapshot,elapsed=0){
 if(!snapshot)return 'checking';
 if(snapshot.error)return 'unavailable';
 if(!snapshot.funded)return 'unfunded';
 return snapshot.resolved||snapshot.timestamp+Math.max(0,elapsed)>=snapshot.deadline?'closed':'open';
}
export function submissionAccess(snapshot,{wallet,owner,submitted},elapsed=0){
 const phase=challengePhase(snapshot,elapsed);
 if(wallet&&owner?.toLowerCase()===wallet.toLowerCase())return {allowed:false,label:'Your challenge',reason:'Creators cannot review their own challenge.'};
 if(submitted)return {allowed:false,label:'Submission received',reason:'You have already submitted to this challenge.'};
 if(phase==='closed')return {allowed:false,label:'Submissions closed',reason:'This challenge is no longer accepting submissions.'};
 if(phase!=='open')return {allowed:false,label:phase==='checking'?'Checking availability…':'Unavailable',reason:'Unable to confirm that submissions are open. Please retry.'};
 return {allowed:true,label:wallet?'Submit review':'Join challenge',reason:''};
}
