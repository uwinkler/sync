import type { Stats } from 'node:fs'

export type FileEvent = {
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  stats: Stats
}

export type Ok<T = undefined> = {
  type: 'ok'
  value: T
}

export const Ok: Ok<undefined> = {
  type: 'ok',
  value: undefined
}

export type Failure = {
  type: 'error'
  message: string
}

export function Failure(message: string): Failure {
  return {
    type: 'error',
    message
  }
}

export type Maybe<T = undefined> = Ok<T> | Failure

