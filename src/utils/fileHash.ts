import crypto from 'crypto'
import path from 'path'
import { PathRelative, Version } from '../common/types'

export function dirHash(input: string) {
  return crypto
    .createHash('shake256', { outputLength: 5 })
    .update(input)
    .digest('hex')
}
export function fileHash(input: String) {
  return crypto
    .createHash('shake256', { outputLength: 20 })
    .update('' + input)
    .digest('hex')
}

export function chunk({
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
