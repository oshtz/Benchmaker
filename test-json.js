function extractJsonCandidate(response) {
  const fenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }

  const firstBrace = response.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = firstBrace; i < response.length; i++) {
    const char = response[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\' && inString) {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return response.slice(firstBrace, i + 1)
    }
  }

  return null
}

console.log(extractJsonCandidate("This contains {braces} and \n {\"score\": 10}"));
