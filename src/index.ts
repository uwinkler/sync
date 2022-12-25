import chokidar from 'chokidar'
import fs, { Stats } from 'node:fs'

import { filter, from, mergeMap, Subject } from 'rxjs'
import { promisify } from 'util'

const fsStat = promisify(fs.stat)
const fsExists = promisify(fs.exists)
const fsWriteFile = promisify(fs.writeFile)

type DbFileEvent = {
  event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  path: string
  stats: Stats
}

const eventSource = new Subject<DbFileEvent>()

function init() {
  chokidar
    .watch('/tmp/sync', {
      followSymlinks: false,
      alwaysStat: true,
      awaitWriteFinish: true
    })
    .on('all', (event, path, stats) => {
      eventSource.next({ event, path, stats: stats! })
    })
}

async function pathWithMtime(path: string) {
  const stats = await fsStat(path)
  if (stats.isFile() || stats.isDirectory()) {
    return normalizePath(path) + '__' + stats.mtimeMs
  }

  return 'unknown'
}

function normalizePath(path: string) {
  return path.replace(/\//gim, '_')
}

async function copyFile(src: string) {
  const dest = '/tmp/sync_files/file_' + (await pathWithMtime(src))
  if (await checkIfFileExists(dest)) {
    return
  }

  const mode = fs.constants.COPYFILE_FICLONE
  fs.copyFile(src, dest, mode, (err) => {
    if (err) {
      console.log('error', err)
    }
  })
}

async function copyDir(path: string) {
  const dest = '/tmp/sync_files/dir_' + (await pathWithMtime(path))

  if (await checkIfFileExists(dest)) {
    return
  }

  await fsWriteFile(dest, JSON.stringify({}))
}

function ignoreFile(path: string) {
  return (
    path.endsWith('.tmp') ||
    path.endsWith('.swp') ||
    /\.git\$/.test(path) ||
    /\.git\/.*/.test(path) ||
    /\.idea\/.*/gim.test(path) ||
    /\/node_modules\//gim.test(path)
  )
}

async function checkIfFileExists(path: string) {
  return await fsExists(path)
}

async function unlinkFile(path: string) {
  const timestamp = Date.now() + 1
  const dest =
    '/tmp/sync_files/file_' +
    normalizePath(path) +
    '__' +
    timestamp +
    '000.deleted'

  fsWriteFile(dest, JSON.stringify({}))
}

const cleanSource = eventSource.pipe(filter((ev) => !ignoreFile(ev.path)))
cleanSource.subscribe((event) => console.log(event.event, '->', event.path))

cleanSource
  .pipe(
    filter((ev) => ev.event === 'add' || ev.event === 'change'),
    filter((ev) => !!ev.stats),
    filter((ev) => ev.stats.isFile()),
    mergeMap(async (ev) => from(copyFile(ev.path)))
  )
  .subscribe((x) => x.subscribe())

cleanSource.pipe(filter((ev) => ev.event === 'unlink')).subscribe((ev) => {
  unlinkFile(ev.path)
})

cleanSource
  .pipe(
    filter((ev) => ev.event === 'addDir'),
    filter((ev) => !!ev.stats),
    filter((ev) => ev.stats.isDirectory())
  )
  .subscribe((ev) => {
    copyDir(ev.path)
  })

init()
