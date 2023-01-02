import { PublishFile } from '../storage-network/storage-network'
import { logger } from '../utils/logger'
import { Controller } from './controller.type'

const log = logger(__filename)

export const publishFileList: Controller = ({ watch, db, io }) =>
  watch<PublishFile[]>('publish_file_list').subscribe(async (msg) => {
    const files = msg.payload
    const missingVersionPromises = files.map(async (f) => {
      const { path, mtime } = f
      const entry = await db.getInfo({ path })
      if (!entry) {
        return f
      }
      const hasVersion = entry.some((e) => e.mtime === mtime)
      if (hasVersion) {
        return null
      }
      return f
    })
    const missingVersions = await Promise.all(missingVersionPromises)
    const requestVersions = missingVersions.filter((v) => v !== null)

    log.debug('request_files', requestVersions)

    if (requestVersions.length > 0) {
      io.to(msg.source).emit('request_files', {
        missingVersions: requestVersions,
        to: msg.source
      })
    }
  })
