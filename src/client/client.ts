import { Context } from './client.types'
import { syncDbToFs } from './sync-db-to-fs'
import { syncFsToDb } from './sync-fs-to-db'
import { syncNetwork } from './sync-network'

export function client(context: Context) {
  const { syncAllFiles } = syncDbToFs(context)
  const { watch } = syncFsToDb(context)
  const { syncWithNetwork } = syncNetwork(context)

  async function start() {
    syncAllFiles()
    syncWithNetwork()
    watch()
  }

  return { start }
}
