import { bufferTime, filter, map, mergeMap } from 'rxjs'
import {
  ClientToServerSync,
  ClientToServerSyncResponse,
  CLIENT_TO_SERVER_SYNC,
  CLIENT_TO_SERVER_SYNC_RESP,
  DownloadRequest,
  DownloadResponse,
  DOWNLOAD_REQUEST,
  DOWNLOAD_RESPONSE,
  ServerToClientSync,
  ServerToClientSyncResponse,
  SERVER_TO_CLIENT_SYNC,
  SERVER_TO_CLIENT_SYNC_RESP,
  UploadRequest,
  UPLOAD_REQUEST
} from '../common/types'
import { Database } from '../db/db.types'
import { SocketClient } from './socket-client/socket-client'
import { Storage } from '../storage/storage.types'
import { logger } from '../utils/logger'
const log = logger(__filename)

type Props = {
  socketClient: SocketClient
  db: Database<unknown>
  storage: Storage<unknown>
}

export function syncNetwork(props: Props) {
  const { db, socketClient, storage } = props

  return {
    syncWithNetwork() {
      watchDatabaseAndPublishFileList()
      handleUploadRequest()
      serverToClientSync()
    }
  }

  function serverToClientSync() {
    // When the connection is established, we send the full file list
    // and initiate the server to client sync process
    // SERVER_TO_CLIENT_SYNC -> SERVER_TO_CLIENT_SYNC_RESP -> DOWNLOAD_REQUEST => DOWNLOAD_RESPONSE
    socketClient.connectionState
      .pipe(filter((s) => s === true))
      .subscribe(async () => {
        const allFiles = await db.allFiles()
        const files: { path: string; mtime: number }[] = []
        allFiles.forEach((f) => {
          f.nodeInfos.forEach((n) => {
            files.push({ path: n.path, mtime: n.mtime })
          })
        })
        const request: ServerToClientSync = {
          files
        }
        log.debug(
          'serverToClientSync request: these are my file (full list):',
          request
        )
        socketClient.socket.emit(SERVER_TO_CLIENT_SYNC, request)
      })

    socketClient
      .watch<ServerToClientSyncResponse>(SERVER_TO_CLIENT_SYNC_RESP)
      .pipe(
        map((msg) => msg.payload.youMayWant),
        mergeMap((files) => files.map((i) => i)) // emit a file at a time
      )
      .subscribe((file) => {
        const req: DownloadRequest = {
          path: file.path,
          mtime: file.mtime
        }
        socketClient.socket.emit(DOWNLOAD_REQUEST, req)
      })

    socketClient
      .watch<DownloadResponse>(DOWNLOAD_RESPONSE)
      .subscribe(async (msg) => {
        const { path, mtime, data } = msg.payload
        await storage.storeBuffer({ path, version: '' + mtime, data })
        await db.putInfo({
          path,
          nodeInfo: { type: 'file', path, mtime, deleted: false }
        })
      })
  }

  // Function that observes the local database and publishes the file list
  function watchDatabaseAndPublishFileList() {
    log.debug('Start watchDatabaseAndPublishFileList')
    db.watch()
      .pipe(
        bufferTime(100),
        filter((events) => events.length > 0),
        map((ev) => ev.map((e) => e.versions)),
        map(flatMap((versions) => versions))
      )
      .subscribe((events) => {
        const files = events
          .filter((e) => !e.deleted)
          .map((e) => ({ path: e.path, mtime: e.mtime }))

        const req: ClientToServerSync = {
          files
        }
        socketClient.socket.emit(CLIENT_TO_SERVER_SYNC, req)
      })
  }

  function handleUploadRequest() {
    socketClient
      .watch<ClientToServerSyncResponse>(CLIENT_TO_SERVER_SYNC_RESP)
      .subscribe((msg) => {
        log.debug(
          CLIENT_TO_SERVER_SYNC_RESP,
          JSON.stringify(msg.payload.pleaseGiveMe)
        )
        msg.payload.pleaseGiveMe.forEach((missingVersion) => {
          const { path, mtime } = missingVersion
          try {
            storage.getFile({ path, version: '' + mtime }).then((data) => {
              const uploadRequest: UploadRequest = { path, mtime, data }
              socketClient.socket.emit(UPLOAD_REQUEST, uploadRequest)
            })
          } catch (e) {
            log.error('Error while getting file', e)
          }
        })
      })
  }
}

function flatMap<T, R>(fn: (value: T) => R[]): (source: T[]) => R[] {
  return (source) => {
    return source.reduce((acc, value) => {
      return [...acc, ...fn(value)]
    }, [] as R[])
  }
}
