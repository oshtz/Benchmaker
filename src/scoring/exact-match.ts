import type { ScoringResult } from '@/types'

export function scoreExactMatch(response: string, expected: string): ScoringResult {
  if (!expected) {
    return {
      score: 1,
      notes: 'No expected output specified',
    }
  }

  const normalizedResponse = response.trim()
  const normalizedExpected = expected.trim()

  // Exact match
  if (normalizedResponse === normalizedExpected) {
    return {
      score: 1,
      confidence: 1,
      notes: 'Exact match',
    }
  }

  // Case-insensitive match
  if (normalizedResponse.toLowerCase() === normalizedExpected.toLowerCase()) {
    return {
      score: 0.9,
      confidence: 1,
      notes: 'Case-insensitive match',
    }
  }

  // Check if response contains the expected (for longer responses)
  if (normalizedResponse.includes(normalizedExpected)) {
    return {
      score: 0.7,
      confidence: 0.8,
      notes: 'Expected output found within response',
    }
  }

  // Calculate similarity for partial matches
  const similarity = calculateSimilarity(normalizedResponse, normalizedExpected)

  if (similarity > 0.8) {
    return {
      score: similarity * 0.8,
      confidence: 0.6,
      notes: `High similarity (${(similarity * 100).toFixed(1)}%)`,
    }
  }

  return {
    score: 0,
    confidence: 1,
    notes: 'No match',
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Create a matrix to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }

  return dp[m][n]
}
