import { filter, Observable, share, Subject } from 'rxjs'
import { io } from 'socket.io-client'
import { logger } from '../utils/logger'

const log = logger(__filename)

export type PublishFile = { path: string; mtime: number; data: Buffer }
export type SocketClient = ReturnType<typeof socketClient>
export type SocketClientConfig = { server: string }
export type SocketMessage<T> = { event: string; payload: T }

export const socketClient = (config: SocketClientConfig) => {
  const socket = io(config.server)
  const messages = new Subject<SocketMessage<any>>()
  const socketConnectionState = new Subject<boolean>()

  function watch<T>(messageType: string) {
    return messages.pipe(
      filter((m) => m.event === messageType),
      share()
    ) as Observable<SocketMessage<T>>
  }

  function init() {
    socket.onAny((event, ...args) => {
      if (args.length === 1) {
        messages.next({ event, payload: args[0] })
      } else {
        messages.next({ event, payload: args })
      }
    })

    socket.on('connect', () => {
      log.debug('🟩 Socket connected', socket.id)
      socketConnectionState.next(true)
    })

    socket.on('disconnect', () => {
      log.debug('🟥 Socket disconnected')
      socketConnectionState.next(false)
    })

    messages.pipe(share()).subscribe((msg) => {
      log.debug('💬 Message', JSON.stringify(msg, null, 2))
    })
  }

  function publishFile(props: PublishFile) {
    const { path, mtime, data } = props
    socket.emit('publish_file', { path, mtime, data })
  }

  function publishFileList(props: { path: string; mtime: number }[]) {
    log.debug('publishFileList', props)
    socket.emit('publish_file_list', props)
  }

  init()

  return {
    publishFile,
    publishFileList,
    watch,
    connectionState: socketConnectionState.pipe(share())
  }
}
