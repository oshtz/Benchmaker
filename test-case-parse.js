function normalizeScoreValue(score) {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return score
  }

  if (typeof score === 'string' && score.trim()) {
    const parsed = parseFloat(score)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

function normalizeParsedJudgeScore(parsed) {
  if (!parsed) return null
  const scoreValue = normalizeScoreValue(parsed.score)
  if (scoreValue === null) {
    return null
  }
  return scoreValue;
}

const parsed = JSON.parse('{"Score": 10}');
console.log("Score:", normalizeParsedJudgeScore(parsed));
