import { Database } from '../db/db.types'
import { Storage } from '../storage/storage.types'
import { SocketClient } from './socket-client/socket-client'

export type Context = {
  clientName: string
  db: Database<unknown>
  pathToStore: string
  pathToWatch: string
  storage: Storage<unknown>
  socketClient: SocketClient
}
