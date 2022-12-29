import { program } from 'commander'
import path from 'path'
import { Subject } from 'rxjs'
import { Database } from './db/db.types'
import { fsDb } from './db/fs.db'
import { fsStore } from './storage/fs/fs.storage'
import type { Storage } from './storage/storage.types'
import { sync } from './sync'
import type { FileEvent } from './types'
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
  db: fsDb({ pathToStore })
}

log.debug('Context', {
  pathToStore: CONTEXT.pathToStore,
  pathToWatch: CONTEXT.pathToWatch
})

const { syncAllFiles } = sync(CONTEXT)
const { watch } = watcher(CONTEXT)

function main() {
  syncAllFiles()
  watch()
}

main()
