/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { COMMON_PHRASE_DICTIONARY } from '../services/phraseDetection';

export interface PhraseResult {
  phrase: string;
  type: string;
  meaning: string;
}

export interface DetectPhrasesResponse {
  phrases: PhraseResult[];
}

export interface ExtractUrlResponse {
  text: string;
  title: string;
  provenance: string;
}

/**
 * Deterministic fallback for phrase detection
 */
export function getDeterministicFallback(text: string): PhraseResult[] {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  const matched: PhraseResult[] = [];
  const seen = new Set<string>();

  // Sort dictionary by length descending
  const sortedDict = [...COMMON_PHRASE_DICTIONARY].sort((a, b) => b.phrase.length - a.phrase.length);

  for (const item of sortedDict) {
    const pLower = item.phrase.toLowerCase();
    if (lowerText.includes(pLower)) {
      if (!seen.has(pLower)) {
        seen.add(pLower);
        matched.push({
          phrase: item.phrase,
          type: item.type,
          meaning: item.meaning,
        });
      }
    }
  }

  return matched;
}

/**
 * Handle POST /api/detect-phrases
 */
export async function handleDetectPhrases(text: string): Promise<DetectPhrasesResponse> {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { phrases: [] };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { phrases: getDeterministicFallback(text) };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an expert English linguist. Analyze the following English text and extract useful idioms, phrasal verbs, collocations, and fixed expressions for learners.
Text:
"""${text.slice(0, 4000)}"""

Respond with a JSON array where each object has:
- "phrase": The exact phrase as it appears or base form
- "type": One of "idiom", "phrasal_verb", "collocation", "fixed_expression"
- "meaning": Concise learner-friendly meaning in English

Output JSON array only.`;

    let response;
    // Primary: Gemini 2.5 Flash as required, with fallback to latest flash if deprecated
    try {
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });
    } catch (err: any) {
      const errMsg = String(err?.message || err);
      if (errMsg.includes('gemini-2.5-flash is no longer available') || errMsg.includes('404')) {
        // Fallback to gemini-3.8-flash
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } else {
        throw err;
      }
    }

    const rawText = response.text?.trim() || '';
    if (!rawText) {
      return { phrases: getDeterministicFallback(text) };
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // In case JSON is wrapped in markdown code blocks
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return { phrases: getDeterministicFallback(text) };
      }
    }

    if (Array.isArray(parsed)) {
      const validTypes = new Set(['idiom', 'phrasal_verb', 'collocation', 'fixed_expression']);
      const results: PhraseResult[] = [];
      const seen = new Set<string>();

      for (const item of parsed) {
        if (item && typeof item.phrase === 'string' && item.phrase.trim()) {
          const phraseStr = item.phrase.trim();
          const pLower = phraseStr.toLowerCase();
          if (!seen.has(pLower)) {
            seen.add(pLower);
            results.push({
              phrase: phraseStr,
              type: validTypes.has(item.type) ? item.type : 'fixed_expression',
              meaning: typeof item.meaning === 'string' ? item.meaning.trim() : 'Expression in context',
            });
          }
        }
      }

      if (results.length > 0) {
        return { phrases: results };
      }
    }

    return { phrases: getDeterministicFallback(text) };
  } catch (error) {
    console.warn('[handleDetectPhrases] Falling back to deterministic matching:', error);
    return { phrases: getDeterministicFallback(text) };
  }
}

/**
 * Decode basic HTML entities
 */
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

/**
 * Handle GET /api/extract-url?url=...
 */
export async function handleExtractUrl(rawUrl: string): Promise<ExtractUrlResponse> {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('URL is required');
  }

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    throw new Error('URL must start with http:// or https://');
  }

  // Validate URL structure
  new URL(trimmedUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  let html = '';
  try {
    const res = await fetch(trimmedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ChunksReading/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch URL: HTTP ${res.status} ${res.statusText}`);
    }

    html = await res.text();
  } finally {
    clearTimeout(timeoutId);
  }

  // Extract title
  let title = '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim();
  }

  // Strip script, style, nav, footer, header, svg, noscript
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

  // Convert block elements to linebreaks
  cleaned = cleaned.replace(/<(?:p|div|br|h1|h2|h3|h4|h5|h6|li|tr|blockquote|article|section)[^>]*>/gi, '\n');
  // Strip all other HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode entities
  cleaned = decodeHtmlEntities(cleaned);

  // Split into paragraphs, clean up whitespace
  const rawParagraphs = cleaned.split(/\n+/);
  const paragraphs: string[] = [];

  for (const p of rawParagraphs) {
    const normalized = p.replace(/[ \t\r]+/g, ' ').trim();
    // Exclude cookie consent fragments or very short junk lines
    if (normalized.length >= 25 && !normalized.toLowerCase().includes('cookie policy') && !normalized.toLowerCase().includes('all rights reserved')) {
      paragraphs.push(normalized);
    }
  }

  const extractedText = paragraphs.join('\n\n').trim();
  if (!extractedText) {
    throw new Error('No readable text content could be extracted from this page.');
  }

  return {
    text: extractedText,
    title: title || new URL(trimmedUrl).hostname,
    provenance: trimmedUrl,
  };
}
