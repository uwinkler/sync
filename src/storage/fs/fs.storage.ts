import fs from 'fs'
import path from 'path'
import { PathAbsolute, PathRelative, Version } from '../../common/types'
import { Ok } from '../../types'
import { dirHash, fileHash } from '../../utils/fileHash'
import { logger } from '../../utils/logger'
import {
  fsCopyFile,
  fsExists,
  fsUtimes,
  isDir,
  mkDir
} from '../../utils/utils-fs'
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
    async storeBuffer({ path, version, data }) {
      return await storeBuffer({ pathToStore, pathRel: path, version, data })
    },
    async hasFile({ path, version }) {
      return await hasFile({ pathToStore: pathToStore, pathRel: path, version })
    },
    async restoreFile({ path, root, version }) {
      return await restoreFile(pathToStore, root, path, version)
    },
    async getFile({ path, version }) {
      return await getFile({ pathToStore: pathToStore, pathRel: path, version })
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
  version: Version
) {
  try {
    log.debug('➡️  storeFile:', pathRel, version)
    const { destDir, dest } = chunk({ pathToStore, pathRel, version })

    if (!(await isDir(destDir))) {
      log.debug('📂 storeFile: creating dir', destDir, '')
      await mkDir(destDir)
    }

    const src = path.join(root, pathRel)

    if (await fsExists(dest)) {
      log.debug(`😑 storeFile: file ${dest} exists, ignoring`)
    }

    log.debug(`📄 storeFile: copying ${src} to ${dest}`)
    await fsCopyFile(src, dest, fs.constants.COPYFILE_FICLONE)
  } catch (err) {
    log.error('🚨 storeFile', err)
  }
}

async function storeBuffer(props: {
  pathToStore: PathAbsolute
  pathRel: PathRelative
  version: Version
  data: Buffer
}) {
  try {
    const { pathToStore, pathRel, version, data } = props
    log.debug('➡️  storeBuffer:', pathRel, version)
    const { destDir, dest } = chunk({ pathToStore, pathRel, version })

    if (!(await isDir(destDir))) {
      log.debug('📂 storeFile: creating dir', destDir, '')
      await mkDir(destDir)
    }

    if (await fsExists(dest)) {
      log.debug(`😑 storeBuffer: file ${dest} exists, ignoring`)
      return `file://${dest}`
    }

    return fs.promises.writeFile(dest, data)
  } catch (err) {
    log.error('🚨 storeBuffer', err)
  }
}

//

async function hasFile({
  pathToStore,
  pathRel,
  version
}: {
  pathToStore: PathAbsolute
  pathRel: PathRelative
  version: Version
}): Promise<boolean> {
  try {
    const { dest } = chunk({ pathToStore, pathRel, version })
    return await fsExists(dest)
  } catch (err) {
    log.error('🚨 hasFile', err)
    throw err
  }
}

async function restoreFile(
  pathToStore: PathAbsolute,
  root: PathAbsolute,
  pathRel: PathRelative,
  version: Version
) {
  const { dest: src } = chunk({ pathToStore, pathRel, version })
  try {
    const dest = path.join(root, pathRel)
    if (!hasFile({ pathToStore, pathRel, version })) {
      log.warn('restoreFile', `File ${pathRel} not found in storage`)
      throw new Error(`File ${pathRel} not found in storage`)
    }
    const time = new Date(Number(version))
    log.info('restoreFile', version, src, dest, time)
    await mkDir(path.dirname(dest))
    debugger
    await fsCopyFile(src, dest, fs.constants.COPYFILE_FICLONE)
    await fsUtimes(dest, time, time)
  } catch (err) {
    log.error('🚨 restoreFile', pathRel, version, err)
    throw err
  }
}

async function getFile(props: {
  pathToStore: PathAbsolute
  pathRel: PathRelative
  version: Version
}) {
  const { pathToStore, pathRel, version } = props
  const { dest } = chunk({ pathToStore, pathRel, version: '' + version })
  try {
    return await fs.promises.readFile(dest)
  } catch (err) {
    log.error('🚨 getFile', pathRel, version, err)
    throw err
  }
}

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
