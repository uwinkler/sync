import { expectMessages, waitForMessage } from './messages'
import { testBed } from './test-bed'

test('delete-file', async () => {
  const { addFile, delFile } = testBed({
    testName: 'delete-file',
    numberOfClients: 1
  })

  addFile('foo.txt', 'foo')

  await waitForMessage({
    event: 'UPLOAD_REQUEST',
    payload: {
      client: 'client-delete-file-0',
      path: 'foo.txt',
      mtime: 0,
      data: '...'
    }
  })

  await delFile('foo.txt')

  await expectMessages([
    {
      event: 'SERVER_TO_CLIENT_SYNC',
      payload: {
        client: 'client-delete-file-0',
        files: []
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-delete-file-0',
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
        client: 'client-delete-file-0',
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
        client: 'client-delete-file-0',
        path: 'foo.txt',
        mtime: 0,
        data: '...'
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-delete-file-0',
        files: [
          {
            path: 'foo.txt',
            mtime: 0,
            deleted: false
          },
          {
            path: 'foo.txt',
            mtime: 1,
            deleted: true
          }
        ]
      }
    }
  ])
})
