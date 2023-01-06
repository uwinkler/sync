import path from 'path'
import { filter, Observable, share, Subject } from 'rxjs'
import { Server } from 'socket.io'
import { Message } from '../common/types'
import { jsonDb } from '../db/json.db'
import { fsStore } from '../storage/fs/fs.storage'
import { logger } from '../utils/logger'
import { tracer } from '../utils/trace'
import { clientToServerSync } from './client-to-server-sync.ctrl'
import { ControllerCtx } from './controller.type'
import { download } from './download.ctrl'
import { serverToClientSync } from './server-to-client-sync.ctrl'
import { ServerConfig } from './server.types'
import { upload } from './upload.ctrl'

const messages = new Subject<Message<any>>()
const log = logger(__filename)
const trace = tracer(__filename)

export function server(serverConfig: ServerConfig) {
  const { port, pathToStorage } = serverConfig
  const db = jsonDb({ pathToStorage: path.join(pathToStorage, 'db.json') })
  const io = new Server({})
  const storage = fsStore({ pathToStore: '/tmp/sync_server' })

  const ctx: ControllerCtx = {
    db,
    io,
    watch,
    storage
  }

  function start() {
    debugMessages()
    serverToClientSync(ctx)
    clientToServerSync(ctx)
    upload(ctx)
    download(ctx)
    initIo()
  }

  function watch<T>(messageType: string): Observable<Message<T>> {
    return messages.pipe(
      filter((msg) => msg.event === messageType),
      share()
    ) as Observable<Message<T>>
  }

  function debugMessages() {
    messages.pipe(share()).subscribe((msg) => {
      log.debug('message', JSON.stringify(msg, null, 2))
    })
  }

  function initIo() {
    io.on('connection', (socket) => {
      log.debug('New connection', socket.id)
      socket.onAny((eventName, ...args) => {
        if (args.length === 1) {
          messages.next({
            event: eventName,
            payload: args[0],
            source: socket.id
          })
        } else {
          messages.next({ event: eventName, payload: args, source: socket.id })
        }
      })
    })

    io.listen(port)

    trace('SERVER_STARTED', { port })
  }

  return { start }
}
