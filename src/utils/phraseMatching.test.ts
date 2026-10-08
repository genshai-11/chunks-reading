import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRenderSlices, findPhraseMatches } from './textSegmentation';
const span={id:'s',text:'drop out of',startOffset:1,endOffset:12,type:'phrasal_verb' as const,meaning:''};
test('ambiguous stale phrase is dropped, not moved to first unclaimed repeat',()=>{
 const text='drop out of school; drop out of work';
 assert.equal(buildRenderSlices(text,[span]).filter(s=>s.isHighlight).length,0);
 const valid={...span,id:'first',startOffset:0,endOffset:11};
 assert.deepEqual(buildRenderSlices(text,[valid,span]).filter(s=>s.isHighlight).map(s=>s.annotation?.id),['first']);
});
test('noninteger and nonfinite offsets fail closed',()=>{
 for(const start of [0.5,NaN,Infinity])assert.equal(buildRenderSlices('drop out of school',[{...span,startOffset:start}]).filter(s=>s.isHighlight).length,0);
});
test('literal regex characters and Unicode word boundaries use original indices',()=>{
 assert.deepEqual(findPhraseMatches('😀 C++ is useful.','C++'),[{start:3,end:6}]);
 assert.deepEqual(findPhraseMatches('édrop out of school','drop out of'),[]);
 assert.deepEqual(findPhraseMatches('İ drop\n out of school','drop out of'),[{start:2,end:14}]);
});
