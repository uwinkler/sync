import path from 'path'
import { debounceTime, scan } from 'rxjs'
import { Database } from './db/db.types'
import { Storage } from './storage/storage.types'
import { PathAbsolute } from './types'
import { fsExists, fsStat, fsUnlink } from './utils-fs'
import { logger } from './utils/logger'

const log = logger(__filename)

export function sync(props: {
  pathToWatch: PathAbsolute
  pathToStore: PathAbsolute
  db: Database<unknown>
  storage: Storage<unknown>
}) {
  const files$ = props.db.watch()

  async function syncAllFiles() {
    log.info('start')

    // Count files
    files$
      .pipe(
        scan((acc) => acc + 1, 0),
        debounceTime(200)
      )
      .subscribe((acc) => log.info(`Checked ${acc} files...`))

    files$.subscribe(async (nodeInfo) => {
      const { path: p, deleted, mtime } = nodeInfo
      const destPathAbsolute = path.join(props.pathToWatch, p)
      const fileExists = await fsExists(destPathAbsolute)
      if (!fileExists) {
        log.info('syncAllFiles: file does not exist', destPathAbsolute)
        return restoreFile()
      }

      const stats = await fsStat(destPathAbsolute)

      if (!stats.isFile()) {
        log.error('syncAllFiles: not a file', destPathAbsolute)
        return
      }

      if (deleted) {
        log.info(
          'syncAllFiles: file marked as deleted in store. Delete ',
          destPathAbsolute
        )
        return await fsUnlink(destPathAbsolute)
      }

      if (stats.mtimeMs < mtime) {
        log.info('syncAllFiles: file older than db', destPathAbsolute)
        await fsUnlink(destPathAbsolute)
        await restoreFile()
      }

      if (stats.mtimeMs > mtime) {
        log.info('syncAllFiles: file newer than db', destPathAbsolute)
        return
      }

      async function restoreFile() {
        log.info('restoreFile', destPathAbsolute)
        await props.storage.restoreFile({
          root: props.pathToWatch,
          path: p,
          version: '' + mtime
        })
      }
    })
  }

  return { syncAllFiles }
}
