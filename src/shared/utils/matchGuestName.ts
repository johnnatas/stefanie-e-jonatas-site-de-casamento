export interface GuestNameCandidate {
  id: string;
  fullName: string;
  nickname?: string;
}

const MIN_QUERY_LENGTH = 2;
const MAX_TYPO_DISTANCE = 2;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function fieldScore(normalizedQuery: string, field: string): number | null {
  const normalizedField = normalize(field);

  if (normalizedField.startsWith(normalizedQuery) || normalizedField.includes(normalizedQuery)) {
    return 0;
  }

  const words = normalizedField.split(" ");
  const candidateDistances = [levenshteinDistance(normalizedQuery, normalizedField), ...words.map((word) => levenshteinDistance(normalizedQuery, word))];
  const minDistance = Math.min(...candidateDistances);

  return minDistance <= MAX_TYPO_DISTANCE ? minDistance + 1 : null;
}

const MAX_SUGGESTIONS = 6;

/**
 * Finds every guest close to a typed name, ranked best-first, tolerating
 * accents, casing, partial names, and small typos. Used by the public RSVP
 * search to list every plausible candidate for the visitor to pick from —
 * never hits the network, matches against the already-loaded public name
 * list.
 */
export function findGuestMatches(
  query: string,
  candidates: GuestNameCandidate[],
  limit = MAX_SUGGESTIONS
): GuestNameCandidate[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const scored: { candidate: GuestNameCandidate; score: number }[] = [];

  for (const candidate of candidates) {
    const fields = [candidate.nickname, candidate.fullName].filter((value): value is string => Boolean(value));

    let bestScore: number | null = null;
    for (const field of fields) {
      const score = fieldScore(normalizedQuery, field);
      if (score !== null && (bestScore === null || score < bestScore)) {
        bestScore = score;
      }
    }

    if (bestScore !== null) {
      scored.push({ candidate, score: bestScore });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((entry) => entry.candidate);
}

/**
 * Finds the single closest guest to a typed name. Kept for callers that only
 * need one best guess; the RSVP search itself now uses {@link findGuestMatches}
 * so the visitor can pick the correct person from a list instead of relying
 * on an automatic single guess.
 */
export function findBestGuestMatch(
  query: string,
  candidates: GuestNameCandidate[]
): GuestNameCandidate | null {
  return findGuestMatches(query, candidates, 1)[0] ?? null;
}
