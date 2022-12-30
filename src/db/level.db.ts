import fs from 'fs'
import { debounceTime, Subject } from 'rxjs'
import { NodeInfo, PathRelative } from '../types'
import { logger } from '../utils/logger'
import { DatabaseFactory } from './db.types'

const log = logger(__filename)

export const levelDb: DatabaseFactory<{ pathToStorage: string }> = (props) => {
  const { pathToStorage } = props

  const map = readMapFromFile(pathToStorage)
  const file$ = new Subject<NodeInfo>()
  const writeFile = new Subject<any>()

  function init() {
    Array.from(map.entries()).forEach(([_, nodeInfo]) => {
      const info = nodeInfo.at(-1)
      if (info) {
        file$.next(info)
      }
    })

    writeFile.pipe(debounceTime(200)).subscribe(() => {
      writeMapToFile(map, pathToStorage)
    })
  }

  init()

  return {
    putInfo(props: { path: PathRelative; nodeInfo: NodeInfo }): Promise<void> {
      function sendLast(arr: NodeInfo[]) {
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
          return sendLast(nodeInfoArr)
        }

        const nextNodeInfoArr = [...nodeInfoArr, nodeInfo].sort(
          (a, b) => a.mtime - b.mtime
        )
        log.debug('putInfo: Store file info', path, nodeInfo.mtime)
        map.set(path, nextNodeInfoArr)
        sendLast(nextNodeInfoArr)
        writeFile.next(void 0)
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
