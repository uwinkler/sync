import chokidar from 'chokidar'
import fs from 'node:fs'

import { filter, from, mergeMap, Subject } from 'rxjs'
import { promisify } from 'util'
import type { Database } from './db/db.types'
import type { StorageNetwork } from './storage-network/storage-network'
import type { Storage } from './storage/storage.types'
import type { FileEvent, NodeInfo, PathAbsolute } from './types'
import { isFile, normalizePath } from './utils-fs'
import { floor } from './utils/floor'
import { logger } from './utils/logger'
export const log = logger(__filename)

const fsStat = promisify(fs.stat)
export const fsExists = promisify(fs.exists)

export function watcher(props: {
  eventSource: Subject<FileEvent>
  pathToWatch: PathAbsolute
  storage: Storage<unknown>
  db: Database<unknown>
  storageNetwork: StorageNetwork
}) {
  const { eventSource, storage, db, storageNetwork } = props

  function watch() {
    log.debug('startWatcher')
    chokidar
      .watch(props.pathToWatch, {
        followSymlinks: false,
        alwaysStat: true,
        awaitWriteFinish: true
      })
      .on('all', (event, path, stats) => {
        eventSource.next({ event, path, stats: stats! })
      })
  }

  async function nodeInfo(path: PathAbsolute): Promise<NodeInfo> {
    const stats = await fsStat(path)
    return {
      path: normalizePath(path, props.pathToWatch),
      mtime: floor(stats.mtimeMs),
      deleted: false,
      type: stats.isFile() ? 'file' : 'dir'
    }
  }

  async function copyFile(src: PathAbsolute) {
    const canCopy = await isFile(src)
    if (!canCopy) {
      return
    }
    const pathRel = normalizePath(src, props.pathToWatch)
    const info = await nodeInfo(src)

    const dbHasFile = await db.hasFile({
      path: pathRel,
      mtime: info.mtime
    })

    if (!dbHasFile) {
      db.putInfo({ path: pathRel, nodeInfo: info })
      storageNetwork.publishFile({ path: pathRel, mtime: info.mtime, src })
    }

    // Check if storage has file
    const storageHasFile = await storage.hasFile({
      path: pathRel,
      version: '' + info.mtime
    })

    if (!storageHasFile) {
      log.info('copyFile', src)

      await storage.storeFile({
        root: props.pathToWatch,
        path: pathRel,
        version: '' + info.mtime
      })
    }
  }

  function ignoreFile(path: string) {
    return (
      path === props.pathToWatch ||
      path.endsWith('.tmp') ||
      path.endsWith('.swp') ||
      /\.DS_Store$/.test(path) ||
      /\.cache\$/.test(path) ||
      /\.git\$/.test(path) ||
      /\.git\/.*/.test(path) ||
      /\.idea\/.*/gim.test(path) ||
      /\/node_modules\//gim.test(path)
    )
  }

  async function unlinkFile(path: string) {
    log.debug('unlinkFile', path)
    const info: NodeInfo = {
      path: normalizePath(path, props.pathToWatch),
      type: 'file',
      mtime: Date.now() + 1,
      deleted: true
    }
    db.putInfo({ path: info.path, nodeInfo: info })
  }

  const cleanSource = eventSource.pipe(filter((ev) => !ignoreFile(ev.path)))

  cleanSource.subscribe((event) =>
    log.debug('event:', event.event, '->', event.path)
  )

  // Copy files
  cleanSource
    .pipe(
      filter((ev) => ev.event === 'add' || ev.event === 'change'),
      filter((ev) => !!ev.stats),
      filter((ev) => ev.stats.isFile()),
      mergeMap(async (ev) => from(copyFile(ev.path)))
    )
    .subscribe((x) => x.subscribe())

  // Delete files
  cleanSource.pipe(filter((ev) => ev.event === 'unlink')).subscribe((ev) => {
    unlinkFile(ev.path)
  })

  return { watch }
}
