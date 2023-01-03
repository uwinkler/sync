import {
  ClientToServerSync,
  ClientToServerSyncResponse,
  CLIENT_TO_SERVER_SYNC,
  CLIENT_TO_SERVER_SYNC_RESP,
  Message
} from '../common/types'
import { logger } from '../utils/logger'
import { Controller, ControllerCtx } from './controller.type'

const log = logger(__filename)

// The clients send a list of files they have. We compare that list to the
// files we have in the database. If the client has a file that we don't
// have, we send a request to the client to send us the file.
export const clientToServerSync: Controller = (ctx) => {
  const { watch } = ctx

  watch<ClientToServerSync>(CLIENT_TO_SERVER_SYNC).subscribe(
    handleClientToServerSyncRequest(ctx)
  )
}

const handleClientToServerSyncRequest =
  (ctx: ControllerCtx) => async (msg: Message<ClientToServerSync>) => {
    const { db, io } = ctx
    const clientFiles = msg.payload.files
    const myFiles = await db.allFiles()

    // Files that the server doesn't have
    const requestVersions = clientFiles.filter((clientFile) => {
      const { path, mtime } = clientFile
      const myVersion = myFiles.find((f) => f.path === path)
      if (!myVersion) {
        return true
      }
      const hasVersion = myVersion.nodeInfos.some((e) => e.mtime === mtime)

      if (hasVersion) {
        return false
      }
      return true
    })

    if (requestVersions.length === 0) {
      return
    }

    log.debug(
      'clientToServerSync: server needs these versions:',
      requestVersions
    )

    const resp: ClientToServerSyncResponse = {
      pleaseGiveMe: requestVersions
    }

    io.to(msg.source).emit(CLIENT_TO_SERVER_SYNC_RESP, resp)
  }
