import { expectMessages } from './messages'
import { testBed } from './test-bed'

test('single-file-sync-one-client', async () => {
  const { addFile } = testBed({ testName: 'single-file-sync-one-client' })

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
        client: 'client-single-file-sync-one-client-0',
        files: []
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-single-file-sync-one-client-0',
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
        client: 'client-single-file-sync-one-client-0',
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
        client: 'client-single-file-sync-one-client-0',
        path: 'foo.txt',
        mtime: 0,
        data: '...'
      }
    }
  ])
})
