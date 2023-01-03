const DELTA = 1000

export function floor(num: number) {
  return Math.floor(num / DELTA) * DELTA
}
