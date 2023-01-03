import { Observable } from 'rxjs'
import { Server } from 'socket.io'
import { Message } from '../common/types'
import { Database } from '../db/db.types'
import { Storage } from '../storage/storage.types'

export type ControllerCtx = {
  storage: Storage<unknown>
  db: Database<unknown>
  io: Server
  watch: <T>(messageType: string) => Observable<Message<T>>
}

export type Controller = (ctx: ControllerCtx) => any
