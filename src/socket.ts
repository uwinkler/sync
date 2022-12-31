import { io } from 'socket.io-client'
import { logger } from './utils/logger'
const socket = io('ws://localhost:3000/namespace')

const log = logger(__filename)

socket.on('connect', () => {
  log.debug('Socket connected')
})

socket.on('*', (data) => {
  log.debug('socket.on', data)
})

socket
