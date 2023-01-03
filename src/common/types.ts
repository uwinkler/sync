export type PublishFile = { path: string; mtime: number }

// ServerToClientSync
//
// Client sends a list of files to the server.
// The server responds with a list of files that the client may want.
//
export type ServerToClientSync = { files: { path: string; mtime: number }[] }
export const SERVER_TO_CLIENT_SYNC = 'SERVER_TO_CLIENT_SYNC'
export type ServerToClientSyncResponse = {
  youMayWant: { path: string; mtime: number }[]
}
export const SERVER_TO_CLIENT_SYNC_RESP = 'SERVER_TO_CLIENT_SYNC_RESP'

// Publish new files
//
// The client sends a list of new files to the server.
// The server responds with a list of files that the server may want.
export type ClientToServerSync = ServerToClientSync
export const CLIENT_TO_SERVER_SYNC = 'CLIENT_TO_SERVER_SYNC'
export type ClientToServerSyncResponse = {
  pleaseGiveMe: { path: string; mtime: number }[]
}
export const CLIENT_TO_SERVER_SYNC_RESP = 'CLIENT_TO_SERVER_SYNC_RESP'

// Download
//
// The client wants to download a file from the network
export type DownloadRequest = { path: string; mtime: number }
export type DownloadResponse = { path: string; mtime: number; data: Buffer }
export const DOWNLOAD_REQUEST = 'download-request'
export const DOWNLOAD_RESPONSE = 'download-response'

// Upload
//
// Tke client wants to uploads a file to the network
export type UploadRequest = { path: string; mtime: number; data: Buffer }
export const UPLOAD_REQUEST = 'upload-request'

export type Message<T> = {
  event: string
  payload: T
  source: string
}
