import bunyan from 'bunyan'
import bunyanFormat from 'bunyan-format'
import { filter, Subject } from 'rxjs'

type LogMessage = {
  level: bunyan.LogLevel
  source?: string
  args: any[]
}

const formatOutputStream = bunyanFormat({
  outputMode: 'short',
  levelInString: true
})

function nameFromPath(name: string) {
  if (name.indexOf('/') === 0) {
    const splits = name.split('/')
    const fileNameWithType = splits.at(-1) || ''
    const fileName = fileNameWithType.slice(0, -3)
    return fileName
  }

  return name
}

export const logger = (name: string, level: bunyan.LogLevel = 'debug') => {
  const stream = new Subject<LogMessage>()

  const log = bunyan.createLogger({
    name: nameFromPath(name),
    src: true,
    stream: formatOutputStream,
    level
  })

  const next =
    (level: bunyan.LogLevel) =>
    (...args: any[]) => {
      stream.next({
        level,
        args
      })
    }

  const methods = {
    debug: next('debug'),
    info: next('info'),
    warn: next('warn'),
    error: next('error'),
    fatal: next('fatal')
  }

  const levelFromName: (name: bunyan.LogLevel) => number = (
    name: bunyan.LogLevel
  ) => (bunyan.levelFromName as any)[name] || 0

  stream
    .pipe(filter((msg) => levelFromName(msg.level) >= levelFromName(level)))
    .subscribe((msg) => {
      const head = msg.args[0]
      const tail = msg.args.slice(1)

      switch (msg.level) {
        case 'trace':
          return log.trace(head, ...tail)
        case 'debug':
          return log.debug(head, ...tail)
        case 'info':
          return log.info(head, ...tail)
        case 'warn':
          return log.warn(head, ...tail)
        case 'error':
          return log.error(head, ...tail)
        case 'fatal':
          return log.fatal(head, ...tail)
      }
    })

  return methods
}
