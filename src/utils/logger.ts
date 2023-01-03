import bunyan from 'bunyan'
import bunyanFormat from 'bunyan-format'

const formatOutputStream = bunyanFormat({
  outputMode: 'short',
  levelInString: true
})

const nameFromPath = (name: string) => {
  if (name.indexOf('/') === 0) {
    const splits = name.split('/')
    const fileNameWithType = splits.at(-1) || ''
    const fileName = fileNameWithType.slice(0, -3)
    return fileName
  }

  return name
}

export const logger = (name: string) =>
  bunyan.createLogger({
    name: nameFromPath(name),
    src: true,
    stream: formatOutputStream,
    level: 'debug'
  })
