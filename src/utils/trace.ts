import { ReplaySubject } from 'rxjs'
import { logger } from './logger'

export type TraceMessage<T = unknown> = {
  event: string
  payload?: T
}

const BUFFER_SIZE = 1000

export const TRACE = new ReplaySubject<TraceMessage>(BUFFER_SIZE)
export const mtimes: number[] = []

export function tracer(source: string) {
  const log = logger(source)
  return function trace<T>(event: string, payload: T) {
    const nextPayload = functor(payload)
      .map(replaceDataWithEllipsis)
      .map(replaceMtime)
      .map(replacePort)
      .get()

    TRACE.next({ event, payload: nextPayload })
    log.warn('🌶️  TRACE', event, nextPayload)
  }
}

function functor<T>(x: T) {
  return {
    map<X>(fn: (x: T) => X) {
      return functor(fn(x))
    },
    get() {
      return x
    }
  }
}

function replaceDataWithEllipsis<T>(x: T) {
  return deepReplace(x as any, 'data', '...')
}

function replaceMtime<T>(x: T) {
  function findMtime(mtime: number) {
    const idx = mtimes.indexOf(mtime)
    if (idx === -1) {
      mtimes.push(mtime)
      return mtimes.length - 1
    }
    return idx
  }
  return deepReplace(x as any, 'mtime', findMtime)
}

function replacePort<T>(x: T) {
  return deepReplace(x as any, 'port', 0)
}

function deepReplace(
  obj: object | any[],
  key: string,
  value: any
): object | any[] {
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map((item) => deepReplace(item, key, value))
  } else {
    const newObj: { [key: string]: any } = {}

    for (const k in obj) {
      if (k === key) {
        if (typeof value === 'function') {
          newObj[k] = value((obj as any)[k])
        } else {
          newObj[k] = value
        }
      } else {
        newObj[k] = deepReplace((obj as any)[k], key, value)
      }
    }

    return newObj
  }
}
