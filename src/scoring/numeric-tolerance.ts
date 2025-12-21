import type { ScoringResult } from '@/types'

export function scoreNumericTolerance(
  response: string,
  expected: string,
  tolerance: number = 0.01
): ScoringResult {
  if (!expected) {
    return {
      score: 1,
      notes: 'No expected value specified',
    }
  }

  // Extract numbers from the response
  const numbersInResponse = extractNumbers(response)
  const expectedNumber = parseFloat(expected)

  if (isNaN(expectedNumber)) {
    return {
      score: 0,
      confidence: 0,
      notes: `Invalid expected number: "${expected}"`,
    }
  }

  if (numbersInResponse.length === 0) {
    return {
      score: 0,
      confidence: 1,
      notes: 'No numbers found in response',
    }
  }

  // Check each number for a match within tolerance
  for (const num of numbersInResponse) {
    const diff = Math.abs(num - expectedNumber)
    const relativeDiff = Math.abs(diff / expectedNumber)

    if (diff <= tolerance || relativeDiff <= tolerance) {
      return {
        score: 1,
        confidence: 1,
        notes: `Exact match: ${num} ≈ ${expectedNumber}`,
      }
    }
  }

  // Find the closest number
  const closest = numbersInResponse.reduce((prev, curr) =>
    Math.abs(curr - expectedNumber) < Math.abs(prev - expectedNumber) ? curr : prev
  )

  const diff = Math.abs(closest - expectedNumber)
  const relativeDiff = expectedNumber !== 0 ? diff / Math.abs(expectedNumber) : diff

  // Partial credit based on how close the answer is
  if (relativeDiff < 0.1) {
    return {
      score: 0.8,
      confidence: 0.9,
      notes: `Close match: ${closest} (expected ${expectedNumber}, diff: ${(relativeDiff * 100).toFixed(1)}%)`,
    }
  }

  if (relativeDiff < 0.25) {
    return {
      score: 0.5,
      confidence: 0.8,
      notes: `Partial match: ${closest} (expected ${expectedNumber}, diff: ${(relativeDiff * 100).toFixed(1)}%)`,
    }
  }

  return {
    score: 0,
    confidence: 1,
    notes: `No match: closest was ${closest} (expected ${expectedNumber})`,
  }
}

function extractNumbers(text: string): number[] {
  // Match integers, decimals, negative numbers, and scientific notation
  const regex = /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g
  const matches = text.match(regex) || []
  return matches.map((m) => parseFloat(m)).filter((n) => !isNaN(n))
}
