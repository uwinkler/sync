export type PublishFile = { path: string; mtime: number }

export type Message<T> = {
  event: string
  payload: T
  source: string
}
