import { logger } from '../utils/logger'
import { io } from 'socket.io-client'
import { filter, Observable, share, Subject } from 'rxjs'
import { Message } from '../common/types'

const log = logger(__filename)
const messages = new Subject<Message<any>>()

export function watch<T>(messageType: string): Observable<Message<T>> {
  return messages.pipe(
    filter((msg) => msg.event === messageType),
    share()
  ) as Observable<Message<T>>
}

messages.pipe(share()).subscribe((msg) => {
  log.debug('message', JSON.stringify(msg, null, 2))
)}
