import {
  concatMap,
  EMPTY,
  filter,
  Observable,
  retry,
  share,
  startWith,
  Subject,
  switchMap
} from 'rxjs'
import { io } from 'socket.io-client'
import { logger } from '../utils/logger'

const log = logger(__filename)

export type PublishFile = { path: string; mtime: number; data: Buffer }
export type StorageNetwork = ReturnType<typeof storageNetworkFactory>
export type StorageNetworkConfig = { server: string }
export type SocketMessage<T> = { event: string; payload: T }

export const storageNetworkFactory = (config: StorageNetworkConfig) => {
  const socket = io(config.server)
  const allMessages = new Subject<SocketMessage<any>>()
  const messageQueue = new Subject<PublishFile>()
  const socketConnectionState = new Subject<boolean>()

  function watch<T>(messageType: string) {
    return allMessages.pipe(
      filter((m) => m.event === messageType),
      share()
    ) as Observable<SocketMessage<T>>
  }

  function init() {
    socketConnectionState.subscribe((connectionStatus) =>
      log.debug('connectionStatus', connectionStatus)
    )

    socket.onAny((event, ...args) => {
      if (args.length === 1) {
        allMessages.next({ event, payload: args[0] })
      } else {
        allMessages.next({ event, payload: args })
      }
    })

    socketConnectionState
      .pipe(
        startWith(false),
        switchMap((connected) => (connected ? messageQueue : EMPTY)),
        concatMap(emitFile),
        retry({ delay: 1000, count: Number.MAX_SAFE_INTEGER })
      )
      .subscribe((props) =>
        log.debug('File published', props.path, props.mtime)
      )

    socket.on('connect', () => {
      log.debug('Client storage-network connected', socket.id)
      socketConnectionState.next(true)
    })

    socket.on('disconnect', () => {
      log.debug('Client storage-network disconnected')
      socketConnectionState.next(false)
    })
  }

  function publishFile(props: PublishFile) {
    messageQueue.next(props)
  }

  function publishFileList(props: { path: string; mtime: number }[]) {
    log.debug('publishFileList', props)
    socket.emit('publish_file_list', props)
  }

  async function emitFile(props: PublishFile): Promise<PublishFile> {
    return new Promise((resolve, reject) => {
      try {
        const { path, mtime, data } = props
        log.debug('publishFile', path, mtime)
        socket.emit('publish_file', { path, mtime, data })
        resolve({ path, mtime, data })
      } catch (e) {
        log.error('emitFile', e)
        reject(e)
      }
    })
  }

  init()

  return {
    publishFile,
    publishFileList,
    watch
  }
}
