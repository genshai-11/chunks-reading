import type { PhraseAnnotation, PhraseType, ArticleUnit } from '../types';

export interface KnownExpression {
  phrase: string;
  type: PhraseType;
  meaning: string;
}

export const COMMON_EXPRESSION_DICTIONARY: KnownExpression[] = [
  { phrase: 'long story short', type: 'idiom', meaning: 'To summarize briefly without unnecessary details' },
  { phrase: 'give it a shot', type: 'idiom', meaning: 'To try or attempt something with an open mind' },
  { phrase: 'take a deep breath', type: 'collocation', meaning: 'To pause and steady oneself before acting' },
  { phrase: 'connect the dots', type: 'idiom', meaning: 'To recognize how seemingly unrelated past events link together' },
  { phrase: 'stay hungry, stay foolish', type: 'fixed_expression', meaning: 'Remain insatiably curious and unafraid of daring ventures' },
  { phrase: 'clear out the old', type: 'collocation', meaning: 'To remove outdated things to make space for the new' },
  { phrase: 'on the other hand', type: 'fixed_expression', meaning: 'From another point of view' },
  { phrase: 'piece of cake', type: 'idiom', meaning: 'Something very easy to do' },
  { phrase: 'break a leg', type: 'idiom', meaning: 'Good luck (theatrical superstition)' },
  { phrase: 'lean into the discomfort', type: 'idiom', meaning: 'To face and embrace challenges rather than retreating' },
  { phrase: 'courage to show up', type: 'collocation', meaning: 'Willingness to participate despite uncertainty' },
  { phrase: 'follow your heart', type: 'idiom', meaning: 'Trust your deep intuition and personal desires' },
];

/**
 * Deterministically detects multi-word candidate expressions from canonical text.
 * Generated annotations are always marked with reviewStatus: 'pending' (never auto-approved).
 */
export function detectCandidatePhrases(canonicalText: string): PhraseAnnotation[] {
  const candidates: PhraseAnnotation[] = [];
  const lowerText = canonicalText.toLowerCase();

  for (const item of COMMON_EXPRESSION_DICTIONARY) {
    const searchStr = item.phrase.toLowerCase();
    let startIndex = 0;

    while (startIndex < lowerText.length) {
      const matchIndex = lowerText.indexOf(searchStr, startIndex);
      if (matchIndex === -1) break;

      const exactText = canonicalText.slice(matchIndex, matchIndex + item.phrase.length);
      const id = `cand-${matchIndex}-${matchIndex + item.phrase.length}`;

      // Avoid duplicates
      if (!candidates.some((c) => c.start === matchIndex && c.end === matchIndex + item.phrase.length)) {
        candidates.push({
          id,
          start: matchIndex,
          end: matchIndex + item.phrase.length,
          exactText,
          type: item.type,
          meaning: item.meaning,
          reviewStatus: 'pending', // Pending teacher approval
          source: 'dictionary',
        });
      }

      startIndex = matchIndex + searchStr.length;
    }
  }

  // Sort by start offset
  return candidates.sort((a, b) => a.start - b.start);
}

/**
 * Segments raw text into structured sentences and paragraphs with clean IDs and orders.
 */
export function splitTextIntoUnits(text: string): { sentences: ArticleUnit[]; paragraphs: ArticleUnit[] } {
  // Paragraph splitting by double newlines or single newlines
  const rawParagraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const paragraphs: ArticleUnit[] = rawParagraphs.map((pText, idx) => ({
    id: `para-${idx + 1}`,
    text: pText,
    order: idx,
    annotations: detectCandidatePhrases(pText),
  }));

  // Sentence splitting by sentence-ending punctuation (. ? !)
  const rawSentences = text
    .replace(/\n+/g, ' ')
    .match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)
    ?.map((s) => s.trim())
    .filter((s) => s.length > 0) || [text.trim()];

  const sentences: ArticleUnit[] = rawSentences.map((sText, idx) => ({
    id: `sent-${idx + 1}`,
    text: sText,
    order: idx,
    annotations: detectCandidatePhrases(sText),
  }));

  return { sentences, paragraphs };
}
