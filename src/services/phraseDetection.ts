/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhraseAnnotation, PhraseType, Granularity } from '../types';

interface DictionaryEntry {
  phrase: string;
  type: PhraseType;
  meaning: string;
}

export const COMMON_PHRASE_DICTIONARY: DictionaryEntry[] = [
  // Fixtures and popular idioms
  { phrase: 'long story short', type: 'idiom', meaning: 'To state the outcome without unnecessary details' },
  { phrase: 'give it a shot', type: 'idiom', meaning: 'To attempt or try something new' },
  { phrase: 'break the ice', type: 'idiom', meaning: 'To make people feel more comfortable in a social setting' },
  { phrase: 'call it a day', type: 'idiom', meaning: 'To stop working on something for the rest of the day' },
  { phrase: 'bite the bullet', type: 'idiom', meaning: 'To face a difficult situation with courage' },
  { phrase: 'hit the nail on the head', type: 'idiom', meaning: 'To be exactly right about something' },
  { phrase: 'on the same page', type: 'idiom', meaning: 'In agreement or thinking along the same lines' },
  { phrase: 'out of the blue', type: 'idiom', meaning: 'Unexpectedly or without warning' },
  { phrase: 'see eye to eye', type: 'idiom', meaning: 'To agree fully with someone' },
  { phrase: 'piece of cake', type: 'idiom', meaning: 'Something very easy to do' },
  { phrase: 'spill the beans', type: 'idiom', meaning: 'To reveal a secret prematurely' },
  { phrase: 'once in a blue moon', type: 'idiom', meaning: 'Very rarely' },
  { phrase: 'burn the midnight oil', type: 'idiom', meaning: 'To work or study late into the night' },
  { phrase: 'back to the drawing board', type: 'idiom', meaning: 'Starting over after a plan failed' },
  { phrase: 'through thick and thin', type: 'idiom', meaning: 'Under all circumstances, good or bad' },

  // Phrasal verbs
  { phrase: 'come up with', type: 'phrasal_verb', meaning: 'To think of or produce an idea or plan' },
  { phrase: 'figure out', type: 'phrasal_verb', meaning: 'To understand or solve a problem' },
  { phrase: 'look forward to', type: 'phrasal_verb', meaning: 'To anticipate something with pleasure' },
  { phrase: 'run out of', type: 'phrasal_verb', meaning: 'To deplete the supply of something' },
  { phrase: 'get rid of', type: 'phrasal_verb', meaning: 'To eliminate or discard something' },
  { phrase: 'point out', type: 'phrasal_verb', meaning: 'To bring attention to a specific fact' },
  { phrase: 'carry out', type: 'phrasal_verb', meaning: 'To perform or conduct a task or plan' },
  { phrase: 'set up', type: 'phrasal_verb', meaning: 'To establish, arrange, or organize' },
  { phrase: 'turn down', type: 'phrasal_verb', meaning: 'To reject an offer or request' },
  { phrase: 'bring about', type: 'phrasal_verb', meaning: 'To cause something to happen' },
  { phrase: 'cut down on', type: 'phrasal_verb', meaning: 'To reduce consumption or amount' },

  // Collocations & fixed expressions
  { phrase: 'keep in mind', type: 'fixed_expression', meaning: 'Remember or take into consideration' },
  { phrase: 'bear in mind', type: 'fixed_expression', meaning: 'Remember or take into consideration' },
  { phrase: 'take into account', type: 'collocation', meaning: 'Consider specific factors when making a decision' },
  { phrase: 'at first glance', type: 'fixed_expression', meaning: 'When first looking at or considering something' },
  { phrase: 'by and large', type: 'fixed_expression', meaning: 'Generally speaking, on the whole' },
  { phrase: 'as a matter of fact', type: 'fixed_expression', meaning: 'In reality, actually' },
  { phrase: 'in terms of', type: 'fixed_expression', meaning: 'With regard to or in relation to' },
  { phrase: 'make sense', type: 'collocation', meaning: 'To be logical or intelligible' },
  { phrase: 'draw attention to', type: 'collocation', meaning: 'Highlight or focus interest on something' },
  { phrase: 'play a vital role', type: 'collocation', meaning: 'To be very important in a process' },
  { phrase: 'take for granted', type: 'collocation', meaning: 'To fail to appreciate something because it is familiar' },
  { phrase: 'have a great impact', type: 'collocation', meaning: 'To affect someone or something significantly' },
  { phrase: 'in the long run', type: 'fixed_expression', meaning: 'Over a long period of time in the future' },
  { phrase: 'sooner or later', type: 'fixed_expression', meaning: 'Inevitably, at some point in time' }
];

/**
 * Deterministically find expression candidates in a given unit text.
 * Calculates exact UTF-16 start-inclusive and end-exclusive offsets.
 */
export function detectPhrasesDeterministic(
  unitText: string,
  unitIndex: number = 0,
  unitType: Granularity = 'sentence'
): PhraseAnnotation[] {
  if (!unitText) return [];

  const results: PhraseAnnotation[] = [];
  const lowerUnit = unitText.toLowerCase();

  // Sort dictionary by phrase length descending to match longer compounds first
  const sortedDict = [...COMMON_PHRASE_DICTIONARY].sort((a, b) => b.phrase.length - a.phrase.length);

  for (const entry of sortedDict) {
    const targetPhrase = entry.phrase.toLowerCase();
    let searchStart = 0;

    while (searchStart < lowerUnit.length) {
      const foundIdx = lowerUnit.indexOf(targetPhrase, searchStart);
      if (foundIdx === -1) break;

      // Word boundary check: ensure we do not match partial words
      const isWordStart = foundIdx === 0 || !/[a-z0-9]/i.test(lowerUnit[foundIdx - 1]);
      const isWordEnd =
        foundIdx + targetPhrase.length >= lowerUnit.length ||
        !/[a-z0-9]/i.test(lowerUnit[foundIdx + targetPhrase.length]);

      if (isWordStart && isWordEnd) {
        const startOffset = foundIdx;
        const endOffset = foundIdx + targetPhrase.length;

        // Check for collision with existing matched spans
        const collides = results.some(r =>
          (startOffset >= r.startOffset && startOffset < r.endOffset) ||
          (endOffset > r.startOffset && endOffset <= r.endOffset)
        );

        if (!collides) {
          // Extract exact case-preserved text from the original chunk
          const originalSubstring = unitText.slice(startOffset, endOffset);

          results.push({
            id: `det-${unitIndex}-${startOffset}-${endOffset}-${Date.now()}`,
            unitIndex,
            unitType,
            text: originalSubstring,
            startOffset,
            endOffset,
            type: entry.type,
            meaning: entry.meaning,
            status: 'pending', // Teacher must approve
            source: 'deterministic'
          });
        }
      }

      searchStart = foundIdx + targetPhrase.length;
    }
  }

  // Sort by start offset
  return results.sort((a, b) => a.startOffset - b.startOffset);
}

/**
 * Scan all units in an article and generate phrase candidate annotations.
 */
export function detectAllPhrasesForResource(
  units: string[],
  unitType: Granularity
): PhraseAnnotation[] {
  const allAnnotations: PhraseAnnotation[] = [];
  units.forEach((unitText, index) => {
    const unitAnnotations = detectPhrasesDeterministic(unitText, index, unitType);
    allAnnotations.push(...unitAnnotations);
  });
  return allAnnotations;
}

/**
 * Optional AI phrase detection prompt handler
 * Calls Gemini if configured, or augments deterministic results with context meanings.
 */
export async function detectPhrasesWithAI(
  unitText: string,
  unitIndex: number = 0,
  unitType: Granularity = 'sentence'
): Promise<PhraseAnnotation[]> {
  // Always include deterministic matches first
  const deterministicMatches = detectPhrasesDeterministic(unitText, unitIndex, unitType);

  try {
    const response = await fetch('/api/detect-phrases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: unitText })
    });

    if (!response.ok) {
      return deterministicMatches;
    }

    const data = await response.json();
    if (!data.phrases || !Array.isArray(data.phrases)) {
      return deterministicMatches;
    }

    const aiAnnotations: PhraseAnnotation[] = [];
    const lowerUnit = unitText.toLowerCase();

    for (const item of data.phrases) {
      if (!item.phrase || typeof item.phrase !== 'string') continue;
      const phraseLower = item.phrase.toLowerCase().trim();
      const matchIdx = lowerUnit.indexOf(phraseLower);

      if (matchIdx !== -1) {
        const startOffset = matchIdx;
        const endOffset = matchIdx + phraseLower.length;

        // Check if already in deterministic matches
        const existing = deterministicMatches.find(d => d.startOffset === startOffset && d.endOffset === endOffset);
        if (!existing) {
          aiAnnotations.push({
            id: `ai-${unitIndex}-${startOffset}-${endOffset}-${Date.now()}`,
            unitIndex,
            unitType,
            text: unitText.slice(startOffset, endOffset),
            startOffset,
            endOffset,
            type: (item.type as PhraseType) || 'fixed_expression',
            meaning: item.meaning || 'Expression in context',
            status: 'pending',
            source: 'ai'
          });
        }
      }
    }

    return [...deterministicMatches, ...aiAnnotations].sort((a, b) => a.startOffset - b.startOffset);
  } catch {
    // Graceful fallback to deterministic matching if AI backend is unavailable
    return deterministicMatches;
  }
}
