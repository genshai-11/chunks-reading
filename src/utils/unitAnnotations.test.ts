import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ReadingResource } from '../types';
import { getUnitApprovedSpans } from './unitAnnotations';
const first='We drop out of school.';
const second='They drop out of work.';
const paragraph=first+' '+second;
const resource: ReadingResource={id:'r',ownerId:'t',title:'r',category:'Test',topic:'Test',level:'B1',sourceType:'paste',status:'published',canonicalText:paragraph,sentences:[first,second],paragraphs:[paragraph],annotations:[
 {id:'first',unitType:'sentence',unitIndex:0,text:'drop out of',startOffset:3,endOffset:14,type:'phrasal_verb',meaning:'first meaning',status:'approved',source:'manual'},
 {id:'second',unitType:'sentence',unitIndex:1,text:'drop out of',startOffset:5,endOffset:16,type:'phrasal_verb',meaning:'second meaning',status:'approved',source:'manual'},
]};
test('sentence index does not accidentally pull same-index paragraph or another repeated phrase',()=>{
 const spans=getUnitApprovedSpans(resource,second,1,'sentence');
 assert.deepEqual(spans.map(a=>a.id),['second']);assert.equal(second.slice(spans[0].startOffset,spans[0].endOffset),'drop out of');
});
test('merged/paragraph/full text preserves each source occurrence and meaning',()=>{
 const spans=getUnitApprovedSpans(resource,paragraph,0,'paragraph');
 assert.deepEqual(spans.map(a=>a.meaning),['first meaning','second meaning']);
 assert.deepEqual(spans.map(a=>a.startOffset),[3,first.length+1+5]);
});
test('identical raw units do not leak another occurrence annotations through the continue guard',()=>{
 const repeated={...resource,sentences:[first,first],annotations:resource.annotations.map(a=>({...a,startOffset:3,endOffset:14}))};
 assert.deepEqual(getUnitApprovedSpans(repeated,first,0,'sentence').map(a=>a.id),['first']);
 assert.deepEqual(getUnitApprovedSpans(repeated,first,1,'sentence').map(a=>a.id),['second']);
});
test('unapproved or unrelated source never reaches learner spans',()=>{
 const altered={...resource,annotations:resource.annotations.map(a=>({...a,status:'pending' as const}))};
 assert.deepEqual(getUnitApprovedSpans(altered,first,0,'sentence'),[]);
 assert.deepEqual(getUnitApprovedSpans(resource,'Unrelated text here.',0,'paragraph'),[]);
});
