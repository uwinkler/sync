import { NodeInfo } from '../common/types'

export function merge(arr1: NodeInfo[], arr2: NodeInfo[]) {
  const map = new Map<number, NodeInfo>()
  for (const item of [...arr1, ...arr2]) {
    map.set(item.mtime, item)
  }
  return Array.from(map.values()).sort((a, b) => a.mtime - b.mtime)
}
