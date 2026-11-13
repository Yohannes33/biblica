// Smart Bible Word Difficulty Analyzer

export const STOP_WORDS = new Set([
  'the', 'and', 'a', 'an', 'for', 'so', 'that', 'in', 'to', 'of', 'with', 'is', 'he',
  'it', 'his', 'him', 'her', 'my', 'me', 'we', 'ye', 'at', 'on', 'as', 'by', 'not',
  'be', 'do', 'unto', 'who', 'whom', 'shall', 'all', 'but', 'thou', 'thee', 'thine',
  'thy', 'they', 'them', 'their', 'are', 'was', 'were', 'been', 'have', 'has', 'had',
  'which', 'this', 'these', 'those', 'from', 'up', 'out', 'if', 'or', 'until', 'while',
  'into', 'during', 'before', 'after', 'above', 'below', 'between', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'too', 'very', 'can',
  'will', 'just', 'should', 'now', 'also', 'then'
]);

export interface ScoredToken {
  index: number;
  cleanWord: string;
  punctuation: string;
  fullToken: string;
  score: number;
  isStopWord: boolean;
}

export function analyzeVerseTokens(verseText: string): ScoredToken[] {
  const rawTokens = verseText.split(/\s+/).filter(Boolean);

  return rawTokens.map((raw, index) => {
    const match = raw.match(/^([a-zA-Z0-9'’]+)([^a-zA-Z0-9'’]*)$/);
    const cleanWord = match ? match[1] : raw;
    const punctuation = match ? match[2] || '' : '';
    const lower = cleanWord.toLowerCase();
    const isStopWord = STOP_WORDS.has(lower);

    // Compute linguistic & theological difficulty score
    let score = 0;

    if (!isStopWord) {
      score += 10;
      // Word length bonus
      score += cleanWord.length * 1.5;

      // Archaic or unique biblical morphology (e.g., -eth, -est, -tion, -ness, -ing)
      if (/(eth|est|tion|ness|ment|ship|ing|ous|ful|able|ize)$/i.test(cleanWord)) {
        score += 8;
      }

      // Proper theological nouns (Capitalized and not start of sentence)
      if (index > 0 && /^[A-Z]/.test(cleanWord)) {
        score += 6;
      }
    } else {
      // Filler words get minimal score
      score = Math.max(1, cleanWord.length * 0.2);
    }

    return {
      index,
      cleanWord,
      punctuation,
      fullToken: raw,
      score,
      isStopWord,
    };
  });
}

/**
 * Returns the token indices that should be blanked based on selected difficulty level:
 * Level 1: ~25% blanks (Top most difficult content words only)
 * Level 2: ~50% blanks (Difficult words + secondary content words)
 * Level 3: ~75% blanks (All content words + minor connectors)
 * Level 4: 100% blanks (Complete Mastery: Every single word)
 */
export function getBlankIndicesForLevel(tokens: ScoredToken[], level: 1 | 2 | 3 | 4): number[] {
  if (level === 4) {
    // 100% Mastery - every single word
    return tokens.map((_, i) => i);
  }

  // Filter out stop words for lower levels
  const nonStopTokens = tokens.filter((t) => !t.isStopWord);

  if (level === 1) {
    // Pick top 25% highest difficulty words
    const count = Math.max(2, Math.round(nonStopTokens.length * 0.45));
    const sorted = [...nonStopTokens].sort((a, b) => b.score - a.score);
    const chosen = new Set(sorted.slice(0, count).map((t) => t.index));
    return tokens.map((_, i) => i).filter((i) => chosen.has(i));
  }

  if (level === 2) {
    // Pick top 50% non-stopwords + important verbs
    const count = Math.max(3, Math.round(nonStopTokens.length * 0.8));
    const sorted = [...nonStopTokens].sort((a, b) => b.score - a.score);
    const chosen = new Set(sorted.slice(0, count).map((t) => t.index));
    return tokens.map((_, i) => i).filter((i) => chosen.has(i));
  }

  // Level 3: 75% blanks - all non-stopwords plus step-based connectors
  const chosen = new Set(nonStopTokens.map((t) => t.index));
  tokens.forEach((_, i) => {
    if (i % 2 === 0) {
      chosen.add(i);
    }
  });

  return tokens.map((_, i) => i).filter((i) => chosen.has(i));
}
