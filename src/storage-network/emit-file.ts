import * as fs from 'fs'
import { concatMap, EMPTY, retry, startWith, Subject, switchMap } from 'rxjs'
import { io } from 'socket.io-client'
import { NodeInfo, PathAbsolute } from '../types'
import { logger } from '../utils/logger'

const log = logger(__filename)

type PublishFile = { path: string; mtime: number; src: PathAbsolute }

const socket = io('ws://localhost:3000/storage-network')
const messageQueue = new Subject<PublishFile>()
const socketConnectionState = new Subject<boolean>()

function init() {
  socketConnectionState
    .pipe(
      startWith(false),
      switchMap((connected) => (connected ? messageQueue : EMPTY)),
      concatMap(emitFile),
      retry({ delay: 1000, count: Number.MAX_SAFE_INTEGER })
    )
    .subscribe((props) => log.debug('File published', props.path, props.mtime))

  socket.on('connect', () => {
    log.debug('Client storage-network connected')
    socketConnectionState.next(true)
  })

  socket.on('disconnect', () => {
    log.debug('Client storage-network disconnected')
    socketConnectionState.next(false)
  })
}

export function publishFile(props: PublishFile) {
  log.debug('publishFile', props.path, props.mtime)
  messageQueue.next(props)
}

async function publishFileList(props: { nodeInfo: NodeInfo[] }) {
  socket.emit('publish_file_list', props)
}

async function emitFile(props: PublishFile): Promise<PublishFile> {
  return new Promise((resolve, reject) => {
    try {
      if (socket.connected) {
        const { path, mtime, src } = props
        const buffer = fs.readFileSync(src)
        socket.emit('publish_file', { path, mtime }, buffer, (msg: string) => {
          log.debug('server says', msg, path, mtime)
          resolve(props)
        })
      } else {
        reject('Socket not connected')
      }
    } catch (e) {
      log.error('emitFile', e)
      reject(e)
    }
  })
}

init()
