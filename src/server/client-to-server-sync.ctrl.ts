import {
  ClientToServerSync,
  ClientToServerSyncResponse,
  CLIENT_TO_SERVER_SYNC,
  CLIENT_TO_SERVER_SYNC_RESP,
  Message,
  ServerToClientSyncResponse,
  SERVER_TO_CLIENT_SYNC_RESP
} from '../common/types'

import { logger } from '../utils/logger'
import { Controller, ControllerCtx } from './controller.type'

const log = logger(__filename)

// The clients send a list of files they have. We compare that list to the
// files we have in the database. If the client has a file that we don't
// have, we send a request to the client to send us the file.
export const clientToServerSync: Controller = (ctx) => {
  const { watch } = ctx

  watch<ClientToServerSync>(CLIENT_TO_SERVER_SYNC).subscribe((msg) => {
    handleFilesTheServerNeeds(ctx)(msg)
    handleDeletedFiles(ctx)(msg)
  })
}

const handleFilesTheServerNeeds =
  (ctx: ControllerCtx) => async (msg: Message<ClientToServerSync>) => {
    const { db, io } = ctx
    const clientFiles = msg.payload.files
    const myFiles = await db.allFiles()

    // Files that the server doesn't have
    const requestVersions = clientFiles.filter((clientFile) => {
      const { path, mtime } = clientFile

      if (clientFile.deleted) {
        return false
      }

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

    const resp: ClientToServerSyncResponse = {
      client: msg.payload.client,
      pleaseGiveMe: requestVersions
    }

    log.debug('clientToServerSync: server needs these versions:', resp)

    io.to(msg.source).emit(CLIENT_TO_SERVER_SYNC_RESP, resp)
  }

const handleDeletedFiles =
  (ctx: ControllerCtx) => async (msg: Message<ClientToServerSync>) => {
    const { db, io } = ctx
    const deletedFiles = msg.payload.files.filter((f) => f.deleted)

    if (deletedFiles.length === 0) {
      return
    }

    deletedFiles.forEach(async (file) => {
      await db.putInfo({
        path: file.path,
        nodeInfo: {
          path: file.path,
          type: 'file',
          mtime: file.mtime,
          deleted: true
        }
      })
    })

    const resp: ServerToClientSyncResponse = {
      client: '__all__',
      youMayWant: deletedFiles
    }

    log.debug('clientToServerSync: delete these files:', resp)

    io.sockets.sockets
      .get(msg.source)
      ?.broadcast.emit(SERVER_TO_CLIENT_SYNC_RESP, resp)
  }
