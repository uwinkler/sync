import { program } from 'commander'
import path from 'path'
import { jsonDb } from '../db/json.db'
import { fsStore } from '../storage/fs/fs.storage'
import { logger } from '../utils/logger'
import { client } from './client'
import { Context } from './client.types'
import { socketClient } from './socket-client/socket-client'

export const log = logger(__filename)

log.info('Starting')

const opts = program
  .option('-n, --name <name>', 'name of the client', 'client')
  .option('-p, --path <path>', 'path to watch', '/tmp/sync')
  .option('-s, --storage <path>', 'The storage directory', '/tmp/sync_files')
  .parse(process.argv)
  .opts()

const pathToStore = path.normalize(opts.storage)

const CONTEXT: Context = {
  name: opts.name,
  pathToStore,
  pathToWatch: path.normalize(opts.path),
  storage: fsStore({ pathToStore }),
  db: jsonDb({ pathToStorage: path.join(pathToStore, 'db.json') }),
  socketClient: socketClient({ server: 'ws://localhost:3000', name: opts.name })
}

log.debug('Context', {
  pathToWatch: CONTEXT.pathToWatch
})

client(CONTEXT).start()
