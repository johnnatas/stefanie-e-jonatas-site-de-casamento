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

/**
 * Finds the closest guest to a typed name, tolerating accents, casing,
 * partial names, and small typos. Used by the public RSVP search — never
 * hits the network, matches against the already-loaded public name list.
 */
export function findBestGuestMatch(
  query: string,
  candidates: GuestNameCandidate[]
): GuestNameCandidate | null {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < MIN_QUERY_LENGTH) {
    return null;
  }

  let best: { candidate: GuestNameCandidate; score: number } | null = null;

  for (const candidate of candidates) {
    const fields = [candidate.nickname, candidate.fullName].filter((value): value is string => Boolean(value));

    for (const field of fields) {
      const score = fieldScore(normalizedQuery, field);
      if (score !== null && (!best || score < best.score)) {
        best = { candidate, score };
      }
    }
  }

  return best?.candidate ?? null;
}
