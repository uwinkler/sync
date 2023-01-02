import { bufferTime, filter, map } from 'rxjs'
import { Database } from './db/db.types'
import { SocketClient } from './socket-client/socket-client'
import { logger } from './utils/logger'
import { Storage } from './storage/storage.types'
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
      handleRequestFiles()
    }
  }

  // Function that observes the local database and publishes the file list
  function watchDatabaseAndPublishFileList() {
    log.debug('Start syncWithNetwork')
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
        socketClient.publishFileList(files)
      })
  }

  function handleRequestFiles() {
    socketClient
      .watch<{ missingVersions: { path: string; mtime: number }[] }>(
        'request_files'
      )
      .subscribe((msg) => {
        log.debug('request_files', JSON.stringify(msg.payload.missingVersions))
        msg.payload.missingVersions.forEach((missingVersion) => {
          const { path, mtime } = missingVersion
          storage.getFile({ path, version: '' + mtime }).then((data) => {
            socketClient.publishFile({ path, mtime, data })
          })
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
