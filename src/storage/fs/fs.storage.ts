import fs from 'fs'
import path from 'path'
import { Ok, PathAbsolute, PathRelative, Url, Version } from '../../types'
import { fsCopyFile, fsExists, fsUtimes, isDir, mkDir } from '../../utils-fs'
import { dirHash, fileHash } from '../../utils/fileHash'
import { logger } from '../../utils/logger'
import type { StorageFactory } from '../storage.types'

const log = logger(__filename)

export const fsStore: StorageFactory<{ pathToStore: string }> = (config) => {
  const { pathToStore } = config

  return {
    async init() {
      return await init({ pathToStore: pathToStore })
    },
    async storeFile({ root, path, version }) {
      return await storeFile(pathToStore, root, path, version)
    },
    async hasFile({ path, version }) {
      return await hasFile({ pathToStore: pathToStore, pathRel: path, version })
    },
    async restoreFile({ path, root, version }) {
      return await restoreFile(pathToStore, root, path, version)
    }
  }
}

async function init({ pathToStore }: { pathToStore: string }): Promise<Ok> {
  log.debug('init', pathToStore)
  if (!(await isDir(pathToStore))) {
    await mkDir(pathToStore)
  }
  return Ok
}

async function storeFile(
  pathToStore: PathAbsolute,
  root: PathAbsolute,
  pathRel: PathRelative,
  version: string
): Promise<Url> {
  log.debug('➡️  storeFile:', pathRel, version)
  const { destDir, dest } = chunk({ pathToStore, pathRel, version })

  if (!(await isDir(destDir))) {
    log.debug('📂 storeFile: creating dir', destDir, '')
    await mkDir(destDir)
  }

  const src = path.join(root, pathRel)

  if (await fsExists(dest)) {
    log.debug(`😑 storeFile: file ${dest} exists, ignoring`)
    return `file://${dest}`
  }

  try {
    log.debug(`📄 storeFile: copying ${src} to ${dest}`)
    await fsCopyFile(src, dest, fs.constants.COPYFILE_FICLONE)
    return `file://${dest}`
  } catch (err) {
    log.error('🚨 storeFile', err)
    throw err
  }
}

async function hasFile({
  pathToStore,
  pathRel,
  version
}: {
  pathToStore: PathAbsolute
  pathRel: PathRelative
  version: Version
}): Promise<boolean> {
  const { dest } = chunk({ pathToStore, pathRel, version })
  return await fsExists(dest)
}

async function restoreFile(
  pathToStore: PathAbsolute,
  root: PathAbsolute,
  pathRel: PathRelative,
  version: Version
) {
  const { dest: src } = chunk({ pathToStore, pathRel, version })
  const dest = path.join(root, pathRel)

  if (!hasFile({ pathToStore, pathRel, version })) {
    log.warn('restoreFile', `File ${pathRel} not found in storage`)
    throw new Error(`File ${pathRel} not found in storage`)
  }
  try {
    const time = new Date(Number(version))
    log.info('restoreFile', version, src, dest, time)
    await mkDir(path.dirname(dest))
    debugger
    await fsCopyFile(src, dest, fs.constants.COPYFILE_FICLONE)
    await fsUtimes(dest, time, time)
  } catch (err) {
    log.error('🚨 restoreFile', err)
    throw err
  }
}

//
// Helpers
//
function chunk({
  pathToStore,
  pathRel,
  version
}: {
  pathToStore: string
  pathRel: PathRelative
  version: Version
}) {
  const fileName = fileHash(pathRel) || ''
  const dirName = dirHash(pathRel) || ''
  const dirSplits = dirName.match(/.{1,2}/gm)!.slice(0, -1)
  const destDir = path.join(pathToStore, ...dirSplits)
  const dest = path.join(destDir, fileName + '.v' + version)

  return {
    destDir, // the absolute directory where the file will be stored
    dest // the absolute path to the file in storage
  }
}
