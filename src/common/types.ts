export type PublishFile = { path: string; mtime: number }

// ServerToClientSync
//
// Client sends a list of files to the server.
// The server responds with a list of files that the client may want.
//
export type ServerToClientSync = {
  client: string
  files: {
    path: string
    mtime: number
  }[]
}
export const SERVER_TO_CLIENT_SYNC = 'SERVER_TO_CLIENT_SYNC'
export type ServerToClientSyncResponse = {
  client: string
  youMayWant: {
    path: string
    mtime: number
  }[]
}
export const SERVER_TO_CLIENT_SYNC_RESP = 'SERVER_TO_CLIENT_SYNC_RESP'

// Publish new files
//
// The client sends a list of new files to the server.
// The server responds with a list of files that the server may want.
export type ClientToServerSync = ServerToClientSync
export const CLIENT_TO_SERVER_SYNC = 'CLIENT_TO_SERVER_SYNC'
export type ClientToServerSyncResponse = {
  client: string
  pleaseGiveMe: {
    path: string
    mtime: number
  }[]
}
export const CLIENT_TO_SERVER_SYNC_RESP = 'CLIENT_TO_SERVER_SYNC_RESP'

// Download
//
// The client wants to download a file from the network
export type DownloadRequest = { client: string; path: string; mtime: number }
export type DownloadResponse = {
  client: string
  path: string
  mtime: number
  data: Buffer
}
export const DOWNLOAD_REQUEST = 'DOWNLOAD_REQUEST'
export const DOWNLOAD_RESPONSE = 'DOWNLOAD_RESPONSE'

// Upload
//
// The client wants to uploads a file to the network
export type UploadRequest = {
  client: string
  path: string
  mtime: number
  data: Buffer
}
export const UPLOAD_REQUEST = 'UPLOAD_REQUEST'

export type Message<T> = {
  event: string
  payload: T
  source: string
}
