import { Server } from 'socket.io'
import { NodeInfo } from '../types'
import { logger } from '../utils/logger'
import fs from 'fs'
import { merge } from '../utils/merge'

const SERVER_DB = '/tmp/sync_files/server_db.json'

const log = logger(__filename)
const map = readMapFromFile(SERVER_DB)
const io = new Server({})

function init() {
  io.on('connection', (socket) => {
    socket.on(
      'update-from-client',
      (msg: { path: string; nodeInfos: NodeInfo[] }) => {
        log.debug('update-from-client', msg.path)
        const serverNodeInfos = map.get(msg.path) || []
        const nextNodeInfo = merge(serverNodeInfos, msg.nodeInfos)
        writeMapToFile(map, SERVER_DB)
        log.debug('update-from-server:', msg.path, nextNodeInfo)
        io.emit('update-from-server', {
          path: msg.path,
          nodeInfos: nextNodeInfo
        })
      }
    )
  })

  io.of('/storage-network').on('connection', (socket) => {
    log.debug('init: storage-network connected')
    socket.on('publish_file', (props, file) => {
      log.debug('publish_file', props, file)
    })
  })

  log.info('init: Server started on port 3000')
  io.listen(3000)
}

init()

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
