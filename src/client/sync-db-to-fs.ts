import path from 'path'
import { debounceTime, scan } from 'rxjs'
import { PathAbsolute } from '../common/types'
import { Database } from '../db/db.types'
import { Storage } from '../storage/storage.types'
import { floor } from '../utils/floor'
import { logger } from '../utils/logger'
import { fsExists, fsStat, fsUnlink, mkDir } from '../utils/utils-fs'

const log = logger(__filename)

// Watches the database and syncs the files to the filesystem
//
export function syncDbToFs(props: {
  pathToWatch: PathAbsolute
  pathToStore: PathAbsolute
  db: Database<unknown>
  storage: Storage<unknown>
}) {
  async function syncAllFiles() {
    await mkDir(props.pathToStore)

    const files$ = props.db.watchAll()
    // Count files
    files$
      .pipe(
        scan((acc) => acc + 1, 0),
        debounceTime(200)
      )
      .subscribe((acc) => log.info(`Checked total ${acc} files so far ...`))

    files$.subscribe(async (nodeInfoVersion) => {
      const nodeInfo = nodeInfoVersion.versions.at(-1)
      if (!nodeInfo) {
        return
      }

      const { path: p, deleted, mtime } = nodeInfo
      const destPathAbsolute = path.join(props.pathToWatch, p)
      const fileExists = await fsExists(destPathAbsolute)
      if (!fileExists && nodeInfo.deleted) {
        return
      }
      if (!fileExists && !nodeInfo.deleted) {
        log.info(
          'syncAllFiles: file does not exist, but is not marked as deleted',
          destPathAbsolute
        )
        return restoreFile()
      }

      const stats = await fsStat(destPathAbsolute)
      const fileMtime = floor(stats.mtimeMs)

      if (!stats.isFile()) {
        return log.error('syncAllFiles: not a file', destPathAbsolute)
      }

      if (deleted) {
        log.info(
          'syncAllFiles: file marked as deleted in store. Delete ',
          destPathAbsolute
        )
        return await fsUnlink(destPathAbsolute)
      }

      if (fileMtime < mtime) {
        log.info('syncAllFiles: file older than db', destPathAbsolute)
        await fsUnlink(destPathAbsolute)
        await restoreFile()
        return
      }

      if (fileMtime > mtime) {
        // This case should be handled by the watcher
        return log.info('syncAllFiles: file newer than db', destPathAbsolute)
      }

      return // file up to date

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
