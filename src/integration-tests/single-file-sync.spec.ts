import { expectMessages } from './messages'
import { testBed } from './test-bed'

test('add-single-file', async () => {
  const { addFile } = testBed({ testName: 'add-single-file' })

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
        client: 'client-add-single-file-0',
        files: []
      }
    },
    {
      event: 'CLIENT_TO_SERVER_SYNC',
      payload: {
        client: 'client-add-single-file-0',
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
        client: 'client-add-single-file-0',
        path: 'foo.txt',
        mtime: 0,
        data: '...'
      }
    }
  ])
})
