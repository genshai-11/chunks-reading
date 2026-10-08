import {test} from 'node:test';import assert from 'node:assert/strict';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {fullReviewParagraphRanges} from './fullReviewParagraphs';import {ReadingUnitText} from '../components/ReadingUnitText';import {calculateRoomTimeline} from './timingEngine';import type {ClassroomRoom} from '../types';
test('paragraph ranges preserve CRLF, whitespace and original UTF-16 positions',()=>{
 const text='  İ drop out of school.\r\n \r\nSecond drop out of work.\n\n';const ranges=fullReviewParagraphRanges(text);
 assert.equal(ranges.map(r=>text.slice(r.start,r.separatorEnd)).join(''),text);assert.equal(text.slice(ranges[1].start,ranges[1].end),'Second drop out of work.');
});
test('full review has numbered paragraphs and preserves globally matched repeated highlights',()=>{
 const text='İ drop out of school.\n\nSecond drop out of work.',start=text.lastIndexOf('drop out of');
 const room={id:'full',status:'active',playbackStatus:'manual_show',isFullReview:true,highlightEnabled:true,currentUnit:{index:0,text,annotations:[{id:'second',text:'drop out of',startOffset:start,endOffset:start+11,type:'phrasal_verb',meaning:'second'}]}} as ClassroomRoom;
 const html=renderToStaticMarkup(createElement(ReadingUnitText,{room,timeline:calculateRoomTimeline(room)}));
 assert.equal(html.replace(/<[^>]*>/g,''),text);assert.equal((html.match(/data-review-paragraph=/g)||[]).length,2);assert.ok(html.includes('aria-label="Đoạn 2"'));assert.equal((html.match(/<mark/g)||[]).length,1);
 assert.ok(html.split('data-review-paragraph="2"')[1].includes('<mark'));assert.equal(html.split('data-review-paragraph="2"')[0].includes('<mark'),false);assert.ok(html.includes('bg-[#FF3838]'));
});
