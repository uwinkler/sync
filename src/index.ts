import { program } from 'commander'
import path from 'path'
import { Subject } from 'rxjs'
import { Database } from './db/db.types'
// import { fsDb } from './db/fs.db'
import { jsonDb } from './db/json.db'
import { fsStore } from './storage/fs/fs.storage'
import type { Storage } from './storage/storage.types'
import { syncFs } from './sync-fs'
import type { FileEvent } from './types'
import { mkDir } from './utils-fs'
import { logger } from './utils/logger'
import { watcher } from './watcher'

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
  eventSource: Subject<FileEvent>
  pathToStore: string
  pathToWatch: string
  storage: Storage<unknown>
  db: Database<unknown>
}

const CONTEXT: Context = {
  eventSource,
  pathToStore: path.normalize(opts.storage),
  pathToWatch: path.normalize(opts.path),
  storage: fsStore({ pathToStore }),
  db: jsonDb({ pathToStorage: path.join(pathToStore, 'db.json') })
}

log.debug('Context', {
  pathToStore: CONTEXT.pathToStore,
  pathToWatch: CONTEXT.pathToWatch
})

const { syncAllFiles } = syncFs(CONTEXT)
const { watch } = watcher(CONTEXT)

async function main() {
  await init()
  syncAllFiles()
  watch()
}

async function init() {
  await mkDir(CONTEXT.pathToStore)
}

main()
