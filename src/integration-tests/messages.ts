import { logger } from '../utils/logger'
import { TRACE, TraceMessage } from '../utils/trace'

const log = logger(__filename)

export function messages(expectedTraceMessages: TraceMessage[]) {
  const collectedMessages: TraceMessage[] = []
  return new Promise((done) => {
    TRACE.pipe().subscribe((msg) => {
      collectedMessages.push(msg)
      if (testThatAllExpectedMessagesWereCollected()) {
        done(true)
      }
    })
  })

  function testThatAllExpectedMessagesWereCollected() {
    log.debug('collectedMessage', JSON.stringify(collectedMessages, null, 2))
    return expectedTraceMessages
      .map((expectedMessage) =>
        collectedMessages.some((collectedMessage) => {
          return deepEqual(collectedMessage, expectedMessage)
        })
      )
      .reduce((acc, curr) => acc && curr, true)
  }

  function deepEqual(a: any, b: any) {
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

export async function expectMessages(expectedTraceMessages: TraceMessage[]) {
  const res = await messages(expectedTraceMessages)
  expect(res).toBe(true)
}

export async function waitForMessage(expectedTraceMessage: TraceMessage) {
  return await messages([expectedTraceMessage])
}
