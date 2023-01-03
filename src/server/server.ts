import { filter, Observable, share, Subject } from 'rxjs'
import { Server } from 'socket.io'
import { Message } from '../common/types'
import { jsonDb } from '../db/json.db'
import { fsStore } from '../storage/fs/fs.storage'
import { logger } from '../utils/logger'
import { clientToServerSync } from './client-to-server-sync.ctrl'
import { ControllerCtx } from './controller.type'
import { download } from './download.ctrl'
import { serverToClientSync } from './server-to-client-sync.ctrl'
import { upload } from './upload.ctrl'

const SERVER_DB = '/tmp/sync_server/server_db.json'

const log = logger(__filename)
const db = jsonDb({ pathToStorage: SERVER_DB })
const io = new Server({})
const storage = fsStore({ pathToStore: '/tmp/sync_server' })
const messages = new Subject<Message<any>>()

function watch<T>(messageType: string): Observable<Message<T>> {
  return messages.pipe(
    filter((msg) => msg.event === messageType),
    share()
  ) as Observable<Message<T>>
}

function init() {
  const ctx: ControllerCtx = {
    db,
    io,
    watch,
    storage
  }

  debugMessages()
  serverToClientSync(ctx)
  clientToServerSync(ctx)
  upload(ctx)
  download(ctx)
  initIo()
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
        messages.next({ event: eventName, payload: args[0], source: socket.id })
      } else {
        messages.next({ event: eventName, payload: args, source: socket.id })
      }
    })
  })

  io.listen(3000)
  log.info('init: Server started on port 3000')
}

init()
