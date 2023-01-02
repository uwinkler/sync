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

export type NodeInfo = {
  type: 'file' | 'dir'
  path: string
  deleted: boolean
  mtime: number
}

export type NodeInfoVersions = {
  path: string
  versions: NodeInfo[]
}

export type Config = {
  path: string
  server: string
}

export type PathAbsolute = string
export type PathRelative = string
export type Version = string
export type Url = string
