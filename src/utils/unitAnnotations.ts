import type { ApprovedSpan, Granularity, ReadingResource } from '../types';
import { buildRenderSlices } from './textSegmentation';

/** Map source-unit UTF-16 coordinates to the presented unit without matching another occurrence. */
export function getUnitApprovedSpans(resource: ReadingResource, text: string, index: number, granularity: Granularity): ApprovedSpan[] {
  const spans: ApprovedSpan[] = [];
  for (const annotation of resource.annotations || []) {
    if (annotation.status !== 'approved') continue;
    const sourceUnits = annotation.unitType === 'paragraph' ? resource.paragraphs : resource.sentences;
    const source = annotation.unitType ? sourceUnits[annotation.unitIndex ?? -1] : resource.canonicalText;
    if (!source) continue;
    const targetUnits = granularity === 'sentence' ? resource.sentences : resource.paragraphs;
    if (annotation.unitType === granularity && targetUnits[index] === text && annotation.unitIndex !== index) continue;
    const sourceMatch = buildRenderSlices(source, [annotation]).find(slice => slice.isHighlight)?.annotation;
    if (!sourceMatch) continue;
    let start = sourceMatch.startOffset;
    let end = sourceMatch.endOffset;
    if (!(annotation.unitType === granularity && annotation.unitIndex === index && source === text)) {
      const sourceAt = text.indexOf(source);
      const targetAt = source.indexOf(text);
      if (sourceAt >= 0 && text.indexOf(source, sourceAt + 1) < 0) {
        start += sourceAt; end += sourceAt;
      } else if (targetAt >= 0 && source.indexOf(text, targetAt + 1) < 0 && start >= targetAt && end <= targetAt + text.length) {
        start -= targetAt; end -= targetAt;
      } else continue;
    }
    spans.push({ id: annotation.id, text: annotation.text, startOffset: start, endOffset: end, type: annotation.type, meaning: annotation.meaning });
  }
  // Persist only reconciled, approved spans belonging to this actual displayed text.
  return buildRenderSlices(text, spans).flatMap(slice => slice.isHighlight && slice.annotation ? [{ ...slice.annotation, text: slice.text }] : []);
}
