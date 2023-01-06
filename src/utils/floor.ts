const DELTA = 100

export function floor(num: number) {
  return Math.floor(num / DELTA) * DELTA
}
