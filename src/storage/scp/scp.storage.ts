import { Ok } from '../../types'
import { StorageFactory } from '../storage.types'



export const scpStore: StorageFactory<{ host: string }> = (config) => ({
  init: init(config),
  storeFile: storeFile(config),
  hasFile: hasFile(config),
  restoreFile: restoreFile(config)
})

function init(config: { host: string }) {
  return async () => Ok
}

function storeFile(config: { host: string }) {
  return async () => 'file://'
}

function hasFile(config: { host: string }) {
  return async () => true
}

function restoreFile(config: { host: string }) {
  return async () => void 0
}
