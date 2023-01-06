import { program } from 'commander'
import path from 'path'
import { logger } from '../utils/logger'
import { server } from './server'

export const log = logger(__filename)

function main() {
  const opts = program
    .option(
      '-s, --storage <path>',
      'The storage directory',
      '/tmp/sync_server/db.json'
    )
    .option('-p, --port <port>', 'The webservice socket port', '3000')

    .parse(process.argv)
    .opts()

  log.debug('opts', opts)

  const pathToStorage = path.normalize(opts.storage)
  server({ pathToStorage, port: Number(opts.port) }).start()
}

main()
