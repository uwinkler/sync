import { logger } from '../utils/logger'
import { Controller } from './controller.type'

const log = logger(__filename)

type PublishFileMessage = { path: string; mtime: number; data: Buffer }

export const upload: Controller = (ctx) => {
  const { storage, watch, db } = ctx
  watch<PublishFileMessage>('publish_file').subscribe(async (msg) => {
    const { path, mtime, data } = msg.payload
    const hasFile = await storage.hasFile({ path, version: '' + mtime })
    if (!hasFile) {
      log.debug('publish_file', path, mtime)
      storage.storeBuffer({ path, version: '' + mtime, data })
    } else {
      log.warn('publish_file: file exists', path, mtime)
    }

    const hasFileDb = await db.hasFile({ path, mtime })

    if (!hasFileDb) {
      db.putInfo({
        path,
        nodeInfo: {
          mtime,
          type: 'file',
          deleted: false,
          path
        }
      })
    } else {
      log.warn('publish_file: file exists in db', path, mtime)
    }
  })
}
