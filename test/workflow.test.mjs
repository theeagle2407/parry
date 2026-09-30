import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../public/workflow.js',import.meta.url),'utf8');
const {challengePhase,submissionAccess}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const open={funded:true,resolved:false,timestamp:100,deadline:200};
test('Challenge status uses the chain timestamp and closes at the exact deadline',()=>{
 assert.equal(challengePhase(open),'open');assert.equal(challengePhase(open,100),'closed');assert.equal(challengePhase({...open,resolved:true}),'closed');assert.equal(challengePhase(undefined),'checking');assert.equal(challengePhase({error:true}),'unavailable');assert.equal(challengePhase({funded:false}),'unfunded');
});
test('Duplicate submissions, creator entries, closed and unavailable challenges are blocked',()=>{
 assert.equal(submissionAccess(open,{wallet:'0xB',owner:'0xA',submitted:false}).allowed,true);
 assert.equal(submissionAccess(open,{wallet:'0xB',owner:'0xA',submitted:true}).label,'Submission received');
 assert.equal(submissionAccess(open,{wallet:'0xA',owner:'0xa',submitted:false}).allowed,false);
 assert.equal(submissionAccess(open,{wallet:'0xB',owner:'0xA',submitted:false},100).allowed,false);
 assert.equal(submissionAccess({error:true},{wallet:'0xB'}).allowed,false);
 assert.equal(submissionAccess(undefined,{wallet:'0xB'}).allowed,false);
});
