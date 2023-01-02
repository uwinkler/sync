import { program } from 'commander'
import path from 'path'
import { Subject } from 'rxjs'
import { Database } from './db/db.types'
import { jsonDb } from './db/json.db'
import { SocketClient, socketClient } from './socket-client/socket-client'
import { fsStore } from './storage/fs/fs.storage'
import type { Storage } from './storage/storage.types'
import { syncDbToFs } from './sync-db-to-fs'
import { syncNetwork } from './sync-network'
import type { FileEvent } from './types'
import { mkDir } from './utils-fs'
import { logger } from './utils/logger'
import { syncFsToDb } from './sync-fs-to-db'

export const log = logger(__filename)

log.info('Starting')
console.log('Starting')

const eventSource = new Subject<FileEvent>()

const opts = program
  .option('-p, --path <path>', 'path to watch', '/tmp/sync')
  .option('-s, --storage <path>', 'The storage directory', '/tmp/sync_files')
  .parse(process.argv)
  .opts()

const pathToStore = path.normalize(opts.storage)

type Context = {
  db: Database<unknown>
  eventSource: Subject<FileEvent>
  pathToStore: string
  pathToWatch: string
  storage: Storage<unknown>
  socketClient: SocketClient
}

const CONTEXT: Context = {
  eventSource,
  pathToStore: path.normalize(opts.storage),
  pathToWatch: path.normalize(opts.path),
  storage: fsStore({ pathToStore }),
  db: jsonDb({ pathToStorage: path.join(pathToStore, 'db.json') }),
  socketClient: socketClient({ server: 'ws://localhost:3000' })
}

log.debug('Context', {
  pathToStore: CONTEXT.pathToStore,
  pathToWatch: CONTEXT.pathToWatch
})

const { syncAllFiles } = syncDbToFs(CONTEXT)
const { watch } = syncFsToDb(CONTEXT)
const { syncWithNetwork } = syncNetwork(CONTEXT)

async function main() {
  await init()
  syncAllFiles()
  syncWithNetwork()
  watch()
}

async function init() {
  await mkDir(CONTEXT.pathToStore)
}

main()
