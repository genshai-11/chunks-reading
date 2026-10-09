import { Fragment, useMemo } from 'react';
import type { ApprovedSpan, CalculatedTimeline, ClassroomRoom } from '../types';
import { buildRenderSlices } from '../utils/textSegmentation';
import { getSequentialTiming, getWordEraseTimeline } from '../utils/readingTiming';
import { EraseTextEffect } from './EraseTextEffect';
import { fullReviewParagraphRanges } from '../utils/fullReviewParagraphs';

interface Props {
  room: ClassroomRoom;
  timeline: CalculatedTimeline;
  text?: string;
  annotations?: ApprovedSpan[];
  className?: string;
  onAnnotationClick?: (annotation: ApprovedSpan) => void;
  fullReview?: boolean;
}
/** Native text and whitespace remain the layout source; effects share room elapsed time. */
export function ReadingUnitText({ room, timeline, text = room.currentUnit?.text || '', annotations = room.currentUnit?.annotations || [], className = '', onAnnotationClick, fullReview = Boolean(room.isFullReview || room.currentUnit?.isFullReview) }: Props) {
  const slices = useMemo(() => buildRenderSlices(text, room.highlightEnabled ? annotations : []), [text, annotations, room.highlightEnabled]);
  const tokens = useMemo(() => {
    let offset = 0;
    const positioned = slices.map(slice => { const start = offset; offset += slice.text.length; return { ...slice, start, end: offset }; });
    let wordIndex = 0;
    return Array.from(text.matchAll(/\s+|\S+/gu), match => {
      const start = match.index!, end = start + match[0].length;
      const whitespace = /^\s/u.test(match[0]);
      return { start, text: match[0], wordIndex: whitespace ? -1 : wordIndex++,
        parts: positioned.filter(slice => slice.start < end && slice.end > start).map(slice => ({
          text: text.slice(Math.max(start, slice.start), Math.min(end, slice.end)), annotation: slice.isHighlight ? slice.annotation : undefined,
        })) };
    });
  }, [text, slices]);
  const mark = (value: string, annotation?: ApprovedSpan) => annotation ? <mark
    className={`${annotation.type === 'idiom' ? 'bg-[#FFE500]' : 'bg-[#4ADE80]'} text-black rounded-sm`}
    title={annotation.meaning} role={onAnnotationClick ? 'button' : undefined} tabIndex={onAnnotationClick ? 0 : undefined}
    onClick={onAnnotationClick ? () => onAnnotationClick(annotation) : undefined}
    onKeyDown={onAnnotationClick ? event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onAnnotationClick(annotation); }
    } : undefined}
    style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
  >{value}</mark> : <span>{value}</span>;
  const paragraphs = useMemo(() => fullReviewParagraphRanges(text), [text]);
  const content = slices.map((slice, index) => <Fragment key={index}>{mark(slice.text, slice.isHighlight ? slice.annotation : undefined)}</Fragment>);
  const sequential = room.eraseSchedule === 'word_groups' && ['hold', 'erase', 'paused', 'blank_finished'].includes(timeline.phase);
  if (sequential) {
    const timing = getSequentialTiming(room, text);
    let erasedWords = 0;
    const words = tokens.map(token => {
      if (token.wordIndex < 0) return <Fragment key={token.start}>{token.text}</Fragment>;
      const wordTimeline = getWordEraseTimeline(room, timeline, text, token.wordIndex, timing);
      const hidden = wordTimeline.progress >= 1;
      if (hidden) erasedWords++;
      return <EraseTextEffect key={token.start} inline effect={room.eraseEffect || 'dissolve'} timeline={wordTimeline} dustAngle={room.dustAngle}
        contentKey={`${room.id}-${room.currentUnit?.index}-${text}-${token.start}`}>
        {hidden ? <span aria-hidden="true" style={{ visibility: 'hidden' }}>{token.text}</span> : token.parts.map((part, i) => <Fragment key={i}>{mark(part.text, part.annotation)}</Fragment>)}
      </EraseTextEffect>;
    });
    return <div className={className} style={{ whiteSpace: 'pre-wrap' }} data-erase-schedule="word_groups" data-erased-words={erasedWords}>{words}</div>;
  }
  if (timeline.phase === 'manual_show' && fullReview) {
    let offset=0;
    const positioned = slices.map((slice,index)=>{const start=offset;offset+=slice.text.length;return {...slice,index,start};});
    const renderRange = (start:number,end:number) => positioned.filter(slice=>slice.start<end&&slice.start+slice.text.length>start).map(slice=><Fragment key={slice.index}>{mark(text.slice(Math.max(start,slice.start),Math.min(end,slice.start+slice.text.length)),slice.isHighlight?slice.annotation:undefined)}</Fragment>);
    let number=0;
    return <div className={className} style={{whiteSpace:'pre-wrap'}} data-erase-schedule="manual" data-erased-words={0} data-full-review="true">
      {paragraphs.map(range=><Fragment key={range.start}>
        {text.slice(range.start,range.end).trim() ? <section data-review-paragraph={++number} aria-label={`Paragraph ${number}`} className="text-left border-b border-black/10 pb-3 mb-3 last:border-b-0">
          <div aria-hidden="true" data-label={`Paragraph ${number}`} className="flex items-center gap-2 mb-2 text-xs font-mono font-bold text-neutral-600 after:content-[attr(data-label)]"><span className="inline-block w-2.5 h-2.5 bg-[#FF3838] border border-black" /></div>
          <div>{renderRange(range.start,range.end)}</div>
        </section> : renderRange(range.start,range.end)}
        {renderRange(range.end,range.separatorEnd)}
      </Fragment>)}
    </div>;
  }
  if (timeline.phase === 'manual_show') return <div className={className} style={{ whiteSpace: 'pre-wrap' }} data-erase-schedule="manual" data-erased-words={0}>{content}</div>;
  return <EraseTextEffect effect={room.eraseEffect || 'dissolve'} timeline={timeline} dustAngle={room.dustAngle}
    contentKey={`${room.id}-${room.currentUnit?.index}-${text}`} className={className}>{content}</EraseTextEffect>;
}
