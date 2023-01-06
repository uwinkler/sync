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
import { Storage } from '../storage/storage.types'
import { logger } from '../utils/logger'
import { SocketClient } from './socket-client/socket-client'

const log = logger(__filename)

type Props = {
  clientName̵: string
  db: Database<unknown>
  socketClient: SocketClient
  storage: Storage<unknown>
}

export function syncNetwork(props: Props) {
  const { db, socketClient, storage, clientName̵ } = props

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
        const files: { path: string; mtime: number; deleted: boolean }[] = []
        allFiles.forEach((f) => {
          f.nodeInfos.forEach((n) => {
            files.push({ path: n.path, mtime: n.mtime, deleted: n.deleted })
          })
        })
        const request: ServerToClientSync = {
          client: clientName̵,
          files
        }
        log.debug(
          'serverToClientSync request: these are my file (full list):',
          request
        )
        socketClient.emit(SERVER_TO_CLIENT_SYNC, request)
      })

    socketClient
      .watch<ServerToClientSyncResponse>(SERVER_TO_CLIENT_SYNC_RESP)
      .pipe(
        map((msg) => msg.payload.youMayWant),
        mergeMap((files) => files.map((i) => i)) // emit a file at a time
      )
      .subscribe(async (file) => {
        if (file.deleted) {
          log.debug('serverToClientSync:mark file a deleted:', file)
          return await db.putInfo({
            path: file.path,
            nodeInfo: {
              type: 'file',
              path: file.path,
              mtime: file.mtime,
              deleted: true
            }
          })
        }

        // check if we have the file already
        const hasFile = await storage.hasFile({
          path: file.path,
          version: '' + file.mtime
        })

        if (!hasFile) {
          log.debug('serverToClientSync: I need to download this file:', file)
          const req: DownloadRequest = {
            client: clientName̵,
            path: file.path,
            mtime: file.mtime
          }
          socketClient.emit(DOWNLOAD_REQUEST, req)
        } else {
          log.debug('serverToClientSync: I already have this file:', file)
        }
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
        const files = events.map((e) => ({
          path: e.path,
          mtime: e.mtime,
          deleted: e.deleted
        }))

        const req: ClientToServerSync = {
          client: clientName̵,
          files
        }
        socketClient.emit(CLIENT_TO_SERVER_SYNC, req)
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
              const uploadRequest: UploadRequest = {
                client: clientName̵,
                path,
                mtime,
                data
              }
              socketClient.emit(UPLOAD_REQUEST, uploadRequest)
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
