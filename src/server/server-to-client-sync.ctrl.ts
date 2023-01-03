import {
  ClientToServerSyncResponse,
  CLIENT_TO_SERVER_SYNC_RESP,
  Message,
  ServerToClientSync,
  ServerToClientSyncResponse,
  SERVER_TO_CLIENT_SYNC,
  SERVER_TO_CLIENT_SYNC_RESP
} from '../common/types'
import { NodeInfo } from '../types'
import { logger } from '../utils/logger'
import { Controller } from './controller.type'

const log = logger(__filename)

type ClientFiles = ServerToClientSync['files']

export const serverToClientSync: Controller = ({ watch, db, io }) => {
  // The client sends a full list of his files. We compare that list to the
  // files we have in the database. If we have a file that the client doesn't
  // have, we send the client a list of files that he may want.
  watch<ServerToClientSync>(SERVER_TO_CLIENT_SYNC).subscribe(async (msg) => {
    try {
      log.debug('serverToClientSync request: ', msg.payload.files)
      const myFiles = (await db.allFiles()).map((f) => f.nodeInfos).flat()
      const clientFiles = msg.payload.files

      filesClientWants({ myFiles, clientFiles, msg })
      filesServerWant({ myFiles, clientFiles, msg })
    } catch (err) {
      log.error('serverToClientSync error:', err)
    }
  })

  //  Determine the files we may want
  function filesServerWant({
    myFiles,
    clientFiles,
    msg
  }: {
    myFiles: NodeInfo[]
    clientFiles: ClientFiles
    msg: Message<ServerToClientSync>
  }) {
    const myFilesSet = new Set<string>()
    myFiles.forEach((f) => myFilesSet.add(f.path + '_' + f.mtime))
    const filesServerWant = clientFiles.filter(
      (f) => !myFilesSet.has(f.path + '_' + f.mtime)
    )

    if (filesServerWant.length > 0) {
      log.debug(
        'serverToClientSync response: these are the files we may want:',
        filesServerWant
      )

      const clientToServerSyncResponse: ClientToServerSyncResponse = {
        pleaseGiveMe: filesServerWant
      }

      io.to(msg.source).emit(
        CLIENT_TO_SERVER_SYNC_RESP,
        clientToServerSyncResponse
      )
    } else {
      log.debug(
        'serverToClientSync response: we have all the files the client has'
      )
    }
  }

  // Determine the files the client may want
  function filesClientWants({
    myFiles,
    clientFiles,
    msg
  }: {
    myFiles: NodeInfo[]
    clientFiles: ClientFiles
    msg: Message<ServerToClientSync>
  }) {
    const myFileSet = new Set<string>()
    myFiles.forEach((f) => myFileSet.add(f.path + '_' + f.mtime))
    clientFiles.forEach((f) => myFileSet.delete(f.path + '_' + f.mtime))
    const clientNeeds = myFiles
      .filter((f) => myFileSet.has(f.path + '_' + f.mtime))
      .map((f) => ({ path: f.path, mtime: f.mtime }))

    if (clientNeeds.length > 0) {
      const resp: ServerToClientSyncResponse = {
        youMayWant: clientNeeds
      }

      log.debug(
        'serverToClientSync response: these are the files the client may want:',
        resp
      )
      io.to(msg.source).emit(SERVER_TO_CLIENT_SYNC_RESP, resp)
    } else {
      log.debug(
        'serverToClientSync response: the client has all the files we have'
      )
    }
  }
}
