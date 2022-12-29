import fs from 'fs'
import path from 'path'
import { ReplaySubject } from 'rxjs'
import { NodeInfo, PathAbsolute, PathRelative } from '../types'
import { fsExists, mkDir } from '../utils-fs'
import { chunk } from '../utils/fileHash'
import { logger } from '../utils/logger'
import { DatabaseFactory } from './db.types'

type NodeInfoJson = { path: PathRelative; nodeInfo: NodeInfo }

const log = logger(__filename)

export const fsDb: DatabaseFactory<{
  pathToStore: string
}> = (props) => {
  const { pathToStore } = props
  const files$ = new ReplaySubject<NodeInfo>()
  listAllFiles(pathToStore)

  return {
    putInfo: async ({ path, nodeInfo }) => {
      if (nodeInfo.type === 'dir') {
        return
      }

      const { destDir, dest } = chunk({
        pathToStore,
        pathRel: path,
        version: '' + nodeInfo.mtime
      })

      const jsonDest = dest + '.json'

      if (!(await fsExists(destDir))) {
        await mkDir(destDir)
      }

      if (await fsExists(jsonDest)) {
        return
      }

      log.debug('putInfo: Store file info', jsonDest)

      const content: NodeInfoJson = { path, nodeInfo }

      fs.writeFile(dest + '.json', JSON.stringify(content), (err) => {
        if (err) {
          log.warn('putInfo: error writing file', err)
        }
      })
    },
    getInfo: async () => [],

    watch: () => {
      return files$
    }
  }

  async function listAllFiles(pathToStore: PathAbsolute) {
    const map = new Map<string, NodeInfo[]>()

    await reader(pathToStore)

    Array.from(map.values()).forEach((infos) => {
      const lastNodeInfo = infos.at(-1)
      if (lastNodeInfo) {
        files$.next(lastNodeInfo)
      }
    })

    async function reader(dir: string) {
      fs.readdirSync(dir).forEach(async (file) => {
        const stats = fs.statSync(path.join(dir, file))
        if (stats.isDirectory()) {
          return await reader(path.join(dir, file))
        }
        if (file.endsWith('.json')) {
          const data = fs.readFileSync(path.join(dir, file))
          const fileContent: NodeInfoJson = JSON.parse(data.toString())
          const currentInfos = map.get(fileContent.path) || []
          const nextInfos = [...currentInfos, fileContent.nodeInfo].sort(
            (a, b) => a.mtime - b.mtime
          )
          map.set(fileContent.path, nextInfos)
        }
      })
    }
  }
}
