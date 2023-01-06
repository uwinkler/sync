import fs from 'fs'
import os from 'os'
import path from 'path'
import { client } from '../client/client'
import { Context } from '../client/client.types'
import { socketClient } from '../client/socket-client/socket-client'
import { jsonDb } from '../db/json.db'
import { server } from '../server/server'
import { ServerConfig } from '../server/server.types'
import { fsStore } from '../storage/fs/fs.storage'
import { logger } from '../utils/logger'

const log = logger(__filename)

type ClientInformation = {
  CLIENT_CONTEXT: Context
  clientPathToStore: string
  clientPathToWatch: string
}

export function testBed({
  testName,
  numberOfClients = 1
}: {
  testName: string
  numberOfClients?: number
}) {
  const serverPathToStore = createTempDir(`tb-server-storage-${testName}`)
  const port = Math.floor(Math.random() * 1000) + 3000

  const server = fireUpServer(serverPathToStore, port)
  const clients = range(numberOfClients).map((idx) =>
    fireUpClient(idx, testName, port)
  )

  function addFile(filePath: string, content: string, client: number = 0) {
    const { clientPathToWatch } = clients[client]!
    const p = path.join(clientPathToWatch, filePath)
    log.info('➕ addFile', p)
    fs.writeFileSync(p, content)
  }

  function delFile(filePath: string, client: number = 0) {
    const { clientPathToWatch } = clients[client]!
    const p = path.join(clientPathToWatch, filePath)
    log.info('🗑️ delFile', p)
    fs.rmSync(p, { recursive: true })
  }

  return {
    addFile,
    delFile,
    clients,
    server,
    port,
    serverPathToStore
  }
}

function fireUpServer(serverPathToStore: string, randomPort: number) {
  const serverConfig: ServerConfig = {
    pathToStorage: serverPathToStore,
    port: randomPort
  }

  server(serverConfig).start()

  return serverConfig
}

function fireUpClient(
  idx: number,
  testName: string,
  port: number
): ClientInformation {
  const name = `${testName}-${idx}`
  const clientPathToStore = createTempDir(`tb-client-storage-${name}`)
  const clientPathToWatch = createTempDir(`tb-client-watch-${name}`)

  const clientContext: Context = {
    name: `client-${name}`,
    pathToStore: clientPathToStore,
    pathToWatch: clientPathToWatch,
    storage: fsStore({ pathToStore: clientPathToStore }),
    db: jsonDb({ pathToStorage: path.join(clientPathToStore, 'db.json') }),
    socketClient: socketClient({
      server: `ws://localhost:${port}`,
      name: `$client-${name}`
    })
  }

  client(clientContext).start()

  return {
    CLIENT_CONTEXT: clientContext,
    clientPathToStore,
    clientPathToWatch
  }
}

// function that creates a random temp directory
function createTempDir(prefix: string) {
  const dir = path.join(os.tmpdir(), prefix)
  log.info('createTempDir', dir)
  try {
    fs.rmSync(dir, { recursive: true })
  } catch (e) {}
  fs.mkdirSync(path.join(os.tmpdir(), prefix))
  return dir
}

function range(n: number) {
  return [...Array(n).keys()]
}
