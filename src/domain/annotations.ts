export type PhraseType = 'idiom' | 'fixed_expression' | 'phrasal_verb' | 'collocation' | 'vocab';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type AnnotationSource = 'dictionary' | 'ai' | 'manual';

export interface PhraseAnnotation {
  id: string;
  start: number; // UTF-16 code unit offset (start-inclusive)
  end: number;   // UTF-16 code unit offset (end-exclusive)
  exactText: string;
  type: PhraseType;
  meaning?: string;
  reviewStatus: ReviewStatus;
  source?: AnnotationSource;
  unitId?: string;
}

export interface TextSpanSegment {
  text: string;
  isHighlight: boolean;
  annotationId?: string;
  type?: PhraseType;
  meaning?: string;
}

export interface SpanValidationResult {
  validSpans: PhraseAnnotation[];
  invalidIds: string[];
  conflictingIds: string[];
  hasConflicts: boolean;
}

/**
 * Validates annotations against raw text, checking exact substring matches and overlaps.
 */
export function validateAndResolveSpans(
  text: string,
  annotations: PhraseAnnotation[]
): SpanValidationResult {
  const invalidIds: string[] = [];
  const conflictingIds: string[] = [];
  const validSpans: PhraseAnnotation[] = [];

  // Sort annotations by start offset
  const sorted = [...annotations].sort((a, b) => a.start - b.start || a.end - b.end);

  for (let i = 0; i < sorted.length; i++) {
    const ann = sorted[i];

    // Check bounds
    if (ann.start < 0 || ann.end > text.length || ann.start >= ann.end) {
      invalidIds.push(ann.id);
      continue;
    }

    // Check substring match
    const actualSub = text.slice(ann.start, ann.end);
    if (actualSub !== ann.exactText) {
      invalidIds.push(ann.id);
      continue;
    }

    validSpans.push(ann);
  }

  // Check for overlaps among valid spans
  for (let i = 0; i < validSpans.length; i++) {
    for (let j = i + 1; j < validSpans.length; j++) {
      const a = validSpans[i];
      const b = validSpans[j];
      // Overlap occurs if b.start < a.end
      if (b.start < a.end) {
        if (!conflictingIds.includes(b.id)) {
          conflictingIds.push(b.id);
        }
      }
    }
  }

  return {
    validSpans,
    invalidIds,
    conflictingIds,
    hasConflicts: conflictingIds.length > 0,
  };
}

/**
 * Slices raw text into consecutive segments of normal text and highlighted approved phrase spans.
 */
export function sliceTextWithApprovedAnnotations(
  text: string,
  annotations: PhraseAnnotation[]
): TextSpanSegment[] {
  // Only process approved annotations
  const approved = annotations.filter((a) => a.reviewStatus === 'approved');
  if (approved.length === 0) {
    return [{ text, isHighlight: false }];
  }

  // Validate and sort non-overlapping approved spans
  const { validSpans, conflictingIds } = validateAndResolveSpans(text, approved);
  const safeSpans = validSpans.filter((s) => !conflictingIds.includes(s.id));

  if (safeSpans.length === 0) {
    return [{ text, isHighlight: false }];
  }

  const segments: TextSpanSegment[] = [];
  let currentIndex = 0;

  for (const span of safeSpans) {
    // Normal text before this span
    if (span.start > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, span.start),
        isHighlight: false,
      });
    }

    // The highlighted span itself
    segments.push({
      text: text.slice(span.start, span.end),
      isHighlight: true,
      annotationId: span.id,
      type: span.type,
      meaning: span.meaning,
    });

    currentIndex = span.end;
  }

  // Any remaining normal text after the last span
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      isHighlight: false,
    });
  }

  return segments;
}
