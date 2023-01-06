import { expectMessages } from './messages'
import { testBed } from './test-bed'

test.only('single-file-sync-two-clients', async () => {
  const { addFile } = testBed({
    testName: 'single-file-sync-two-clients',
    numberOfClients: 2
  })

  addFile('foo.txt', 'foo')

  await expectMessages([
    {
      event: 'SERVER_STARTED',
      payload: {
        port: 0
      }
    },
    {
      event: 'SERVER_TO_CLIENT_SYNC',
      payload: {
        client: 'client-single-file-sync-two-clients-0',
        files: []
      }
    },
    {
      event: 'SERVER_TO_CLIENT_SYNC',
      payload: {
        client: 'client-single-file-sync-two-clients-1',
        files: []
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-single-file-sync-two-clients-0',
        files: [
          {
            path: 'foo.txt',
            mtime: 0,
            deleted: false
          }
        ]
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC_RESP',
      payload: {
        client: 'client-single-file-sync-two-clients-0',
        pleaseGiveMe: [
          {
            path: 'foo.txt',
            mtime: 0,
            deleted: false
          }
        ]
      }
    },
    {
      event: 'UPLOAD_REQUEST',
      payload: {
        client: 'client-single-file-sync-two-clients-0',
        path: 'foo.txt',
        mtime: 0,
        data: '...'
      }
    },
    {
      event: 'SERVER_TO_CLIENT_SYNC_RESP',
      payload: {
        client: 'client-single-file-sync-two-clients-0',
        youMayWant: [
          {
            path: 'foo.txt',
            mtime: 0,
            deleted: false
          }
        ]
      }
    },
    {
      event: 'DOWNLOAD_REQUEST',
      payload: {
        client: 'client-single-file-sync-two-clients-1',
        path: 'foo.txt',
        mtime: 0
      }
    },
    {
      event: 'DOWNLOAD_RESPONSE',
      payload: {
        path: 'foo.txt',
        client: 'client-single-file-sync-two-clients-1',
        mtime: 0,
        data: '...'
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-single-file-sync-two-clients-1',
        files: [
          {
            path: 'foo.txt',
            mtime: 0,
            deleted: false
          }
        ]
      }
    }
  ])
})
