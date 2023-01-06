import { expectMessages } from './messages'
import { testBed } from './test-bed'

test.only('add-single-file-with-two-clients', async () => {
  const { addFile } = testBed({
    testName: 'add-single-file-with-two-clients',
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
        client: 'client-add-single-file-with-two-clients-0',
        files: []
      }
    },
    {
      event: 'SERVER_TO_CLIENT_SYNC',
      payload: {
        client: 'client-add-single-file-with-two-clients-1',
        files: []
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-add-single-file-with-two-clients-0',
        files: [
          {
            path: 'foo.txt',
            mtime: 0
          }
        ]
      }
    },
    {
      event: 'UPLOAD_REQUEST',
      payload: {
        client: 'client-add-single-file-with-two-clients-0',
        path: 'foo.txt',
        mtime: 0,
        data: '...'
      }
    },
    {
      event: 'DOWNLOAD_REQUEST',
      payload: {
        client: 'client-add-single-file-with-two-clients-1',
        path: 'foo.txt',
        mtime: 0
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-add-single-file-with-two-clients-1',
        files: [
          {
            path: 'foo.txt',
            mtime: 0
          }
        ]
      }
    }
  ])
})
