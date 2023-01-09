import {
  ServerToClientSyncResponse,
  SERVER_TO_CLIENT_SYNC_RESP,
  UploadRequest,
  UPLOAD_REQUEST
} from '../common/types'
import { logger } from '../utils/logger'
import { Controller } from './controller.type'

const log = logger(__filename)

export const upload: Controller = (ctx) => {
  const { storage, watch, db, io } = ctx

  watch<UploadRequest>(UPLOAD_REQUEST).subscribe(async (msg) => {
    log.info('upload request', msg.payload.path, msg.payload.mtime)
    const { path, mtime, data } = msg.payload
    const hasFile = await storage.hasFile({ path, version: '' + mtime })

    if (!hasFile) {
      await storage.storeBuffer({ path, version: '' + mtime, data })
      log.debug('store new file', path, mtime)
    } else {
      log.warn('file exists', path, mtime)
    }

    const hasFileDb = await db.hasFile({ path, mtime })

    if (!hasFileDb) {
      log.debug('store new file in db:', path, mtime)
      db.putInfo({
        path,
        nodeInfo: {
          client: msg.payload.client,
          mtime,
          deleted: false,
          path
        }
      })

      // inform the other clients that we have a new file
      const newFile: ServerToClientSyncResponse = {
        client: '__all__',
        youMayWant: [
          {
            fromClient: msg.payload.client,
            path,
            mtime,
            deleted: false
          }
        ]
      }

      io.sockets.sockets
        .get(msg.source)
        ?.broadcast.emit(SERVER_TO_CLIENT_SYNC_RESP, newFile)
    } else {
      log.warn('file exists in db', path, mtime)
    }
  })
}
