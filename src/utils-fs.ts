import fs from 'fs'

import { logger } from './utils/logger'
const log = logger(__filename)

export const stat = fs.promises.stat

export const fsExists = async (path: string) => {
  try {
    await fs.promises.access(path, fs.constants.F_OK)
    return true
  } catch (err) {
    return false
  }
}
export const fsStat = fs.promises.stat
export const fsUnlink = fs.promises.unlink
export const fsCopyFile = fs.promises.copyFile
export const fsUtimes = fs.promises.utimes

export async function checkIfFileExists(path: string) {
  return await fsExists(path)
}

export async function mTime(path: string) {
  const stats = await stat(path)
  return stats.mtime
}

export async function isFile(path: string) {
  return new Promise<boolean>((resolve) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false)
      }
      if (stats) {
        resolve(stats.isFile())
      }
    })
  })
}

export async function isDir(path: string) {
  return new Promise<boolean>((resolve) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve(false)
      }
      if (stats) {
        resolve(stats.isDirectory())
      }
    })
  })
}

export async function isFileOrDirectory(path: string) {
  return (await isFile(path)) || (await isDir(path))
}

export function normalizePath(path: string, root: string) {
  return path.replace(root, '').replace(/^\/+/, '')
}

export async function mkDir(path: string) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (err) => {
      if (err) {
        log.error('🚨 mkdirp:', err)
        reject(err)
      } else {
        resolve(path)
      }
    })
  })
}
