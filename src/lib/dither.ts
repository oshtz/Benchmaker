const BENCHMAKER_DITHER_HUES = [328, 260, 30] as const

export function ditherHueForName(name: string): number {
  let hash = 2166136261
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return BENCHMAKER_DITHER_HUES[(hash >>> 0) % BENCHMAKER_DITHER_HUES.length]
}
