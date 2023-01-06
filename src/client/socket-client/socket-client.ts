import { filter, Observable, share, Subject } from 'rxjs'
import { io } from 'socket.io-client'
import { logger } from '../../utils/logger'
import { tracer } from '../../utils/trace'

const log = logger(__filename)
const trace = tracer(__filename)

export type SocketClient = ReturnType<typeof socketClient>
export type SocketClientConfig = { server: string; name: string }
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

    socket.id = config.name

    messages.pipe(share()).subscribe((msg) => {
      log.debug('💬 Message', JSON.stringify(msg, null, 2))
    })
  }

  init()

  function emit(event: string, ...payload: any[]) {
    if (payload.length === 1) {
      trace(event, payload[0])
    } else {
      trace(event, payload)
    }
    socket.emit(event, ...payload)
  }

  return {
    watch,
    // socket,
    emit,
    connectionState: socketConnectionState.pipe(share())
  }
}
