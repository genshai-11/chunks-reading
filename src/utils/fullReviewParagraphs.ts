export interface ReviewParagraphRange {start:number;end:number;separatorEnd:number}
/** Keep UTF-16 offsets and exact whitespace; presentation must not rematch phrases per paragraph. */
export function fullReviewParagraphRanges(text:string):ReviewParagraphRange[]{
 const ranges:ReviewParagraphRange[]=[];let start=0;
 for(const match of text.matchAll(/\r?\n[ \t]*\r?\n(?:[ \t]*\r?\n)*/g)){
  ranges.push({start,end:match.index!,separatorEnd:match.index!+match[0].length});start=match.index!+match[0].length;
 }
 ranges.push({start,end:text.length,separatorEnd:text.length});return ranges;
}
