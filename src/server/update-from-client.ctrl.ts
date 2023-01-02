import { logger } from '../utils/logger'
import { Controller } from './controller.type'

export const log = logger(__filename)

export const updateFromClient: Controller = ({ watch, db, io }) => {
  watch('update-from-client').subscribe((msg) => {
    log.debug('update-from-client', msg)
  })
}
//   'update-from-client',
//   (msg: { path: string; nodeInfos: NodeInfo[] }) => {
//     log.debug('update-from-client', msg.path)
//     const serverNodeInfos = map.get(msg.path) || []
//     const nextNodeInfo = merge(serverNodeInfos, msg.nodeInfos)
//     log.debug('update-from-server:', msg.path, nextNodeInfo)
//     io.emit('update-from-server', {
//       path: msg.path,
//       nodeInfos: nextNodeInfo
//     })
//   }
// )
