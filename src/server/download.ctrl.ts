import {
  DownloadRequest,
  DownloadResponse,
  DOWNLOAD_REQUEST,
  DOWNLOAD_RESPONSE
} from '../common/types'
import { logger } from '../utils/logger'
import { Controller } from './controller.type'

const log = logger(__filename)

export const download: Controller = (ctx) => {
  const { storage, watch, io } = ctx

  watch<DownloadRequest>(DOWNLOAD_REQUEST).subscribe(async (msg) => {
    const { path, mtime } = msg.payload
    const hasFile = await storage.hasFile({ path, version: '' + mtime })

    if (!hasFile) {
      return log.error('🚨 missing file: ', path, mtime)
    }

    const data = await storage.getFile({ path, version: '' + mtime })
    const resp: DownloadResponse = {
      path,
      client: msg.payload.client,
      mtime,
      data
    }

    io.to(msg.source).emit(DOWNLOAD_RESPONSE, resp)
  })
}
