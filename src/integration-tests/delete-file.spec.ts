import { expectMessages, waitForMessage } from './messages'
import { testBed } from './test-bed'

test.only('delete-file', async () => {
  const { addFile, delFile } = testBed({
    testName: 'delete-file',
    numberOfClients: 2
  })

  addFile('foo.txt', 'foo')

  await waitForMessage({
    event: 'CLIENT_TO_SERVER_SYNC',
    payload: {
      client: 'client-delete-file-0',
      files: [
        {
          path: 'foo.txt',
          mtime: 0
        }
      ]
    }
  })

  delFile('foo.txt')

  expectMessages([{ event: 'DELETE_REQUEST', payload: { path: 'foo.txt' } }])
})
