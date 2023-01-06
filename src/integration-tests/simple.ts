import { expectMessages, messages } from './messages'
import { testBed } from './test-bed'

test('simple: maake sure that the server starts', async () => {
  const { port } = testBed({ testName: 'make_sure_that_the_server_starts' })
  expect(await messages([{ event: 'SERVER_STARTED', payload: { port } }])).toBe(
    true
  )
})

test('simple: empty-dir', async () => {
  testBed({ testName: 'empty-dir' })
  await expectMessages([
    {
      event: 'SERVER_TO_CLIENT_SYNC',
      payload: { client: 'empty-dir-client', files: [] }
    }
  ])
})
