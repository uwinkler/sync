import fs from 'fs'
import { debounceTime, Subject } from 'rxjs'
import { io } from 'socket.io-client'
import { NodeInfo, PathRelative } from '../types'
import { logger } from '../utils/logger'
import { merge } from '../utils/merge'
import { DatabaseFactory } from './db.types'
const socket = io('ws://localhost:3000')

const log = logger(__filename)

socket.on('connect', () => {
  log.debug('Socket connected')
})

socket.on('*', (data) => {
  log.debug('socket.on', data)
})

export const jsonDb: DatabaseFactory<{ pathToStorage: string }> = (props) => {
  const { pathToStorage } = props

  const map = readMapFromFile(pathToStorage)
  const file$ = new Subject<NodeInfo>()
  const writeFile = new Subject<any>()

  function init() {
    Array.from(map.entries()).forEach(([path, nodeInfo]) => {
      const info = nodeInfo.at(-1)
      sendToServer(path, nodeInfo)
      if (info) {
        file$.next(info)
      }
    })

    writeFile.pipe(debounceTime(200)).subscribe(() => {
      writeMapToFile(map, pathToStorage)
    })

    socket.on(
      'update-from-server',
      (data: { path: string; nodeInfos: NodeInfo[] }) => {
        log.info('update-from-server', data)
        receiveFromServer(data.path, data.nodeInfos)
      }
    )
  }

  function sendToServer(path: string, nodeInfos: NodeInfo[]) {
    socket.emit('update-from-client', { path, nodeInfos })
  }

  function receiveFromServer(path: string, serverNodeInfos: NodeInfo[]) {
    const myNodeInfos = map.get(path) || []
    const nextNodeInfos = merge(myNodeInfos, serverNodeInfos)
    const last = nextNodeInfos.at(-1)
    const myLast = myNodeInfos.at(-1)
    map.set(path, nextNodeInfos)

    if (last && myLast && last.mtime > myLast.mtime) {
      file$.next(last)
    }
  }

  init()

  return {
    putInfo(props: { path: PathRelative; nodeInfo: NodeInfo }): Promise<void> {
      function sendLastToWatcher(arr: NodeInfo[]) {
        const last = arr.at(-1)
        if (last) {
          file$.next(last)
        }
      }

      return new Promise((resolve) => {
        const { path, nodeInfo } = props
        const nodeInfoArr = map.get(path) || []
        if (nodeInfoArr.some((info) => info.mtime === nodeInfo.mtime)) {
          log.debug('putInfo: already exists', path, nodeInfo.mtime)
          return sendLastToWatcher(nodeInfoArr)
        }

        const nextNodeInfoArr = [...nodeInfoArr, nodeInfo].sort(
          (a, b) => a.mtime - b.mtime
        )
        log.debug('putInfo: Store file info', path, nodeInfo.mtime)
        map.set(path, nextNodeInfoArr)
        sendLastToWatcher(nextNodeInfoArr)
        writeFile.next(void 0)
        sendToServer(path, nextNodeInfoArr)
        resolve(void 0)
      })
    },
    //
    // Gets information about a file or directory
    getInfo(props: { path: PathRelative }) {
      return new Promise((resolve) => {
        const { path } = props
        resolve(map.get(path) || [])
      })
    },

    // Returns true if the file exists in the database
    hasFile(props: { path: PathRelative; mtime: number }) {
      return new Promise((resolve) => {
        const nodeInfos = map.get(props.path) || []
        resolve(nodeInfos.some((info) => info.mtime === props.mtime))
      })
    },
    //
    // Returns a Subject of changes to a file or directory
    watch(): Subject<NodeInfo> {
      return file$
    },

    //Returns all files
    allFiles() {
      return new Promise((resolve) => {
        const entries = Array.from(map.entries())
        const ret = entries.map(([path, nodeInfo]) => ({
          path,
          nodeInfos: nodeInfo
        }))
        resolve(ret)
      })
    }
  }
}
function readMapFromFile(pathToStorage: string) {
  const map = new Map<string, NodeInfo[]>()
  log.debug('init: pathToStorage', pathToStorage)
  if (!fs.existsSync(pathToStorage)) {
    fs.writeFileSync(pathToStorage, JSON.stringify({}))
  }

  const dbJson: { [path: string]: NodeInfo[] } = JSON.parse(
    fs.readFileSync(pathToStorage, 'utf-8').toString()
  )
  Object.entries(dbJson).forEach(([path, nodeInfo]) => {
    map.set(path, nodeInfo)
  })
  log.debug('init done: nr of files:', Array.from(map.entries()).length)

  return map
}

function writeMapToFile(map: Map<string, NodeInfo[]>, pathToStorage: string) {
  const mapAsObject = Array.from(map.entries()).reduce(
    (acc, [path, nodeInfo]) => {
      acc[path] = nodeInfo
      return acc
    },
    {} as any
  )

  log.debug('Write db to file', pathToStorage, 'nr of entries:', map.size)

  fs.writeFile(pathToStorage, JSON.stringify(mapAsObject, null, 2), (err) => {
    if (err) {
      log.warn('error writing file', err)
    }
  })
}