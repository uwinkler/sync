import { Observable } from 'rxjs'
import { NodeInfo, NodeInfoVersions, PathRelative } from '../types'

export type DatabaseFactory<T> = (config: T) => {
  // Stores information about a file or directory
  putInfo(props: { path: PathRelative; nodeInfo: NodeInfo }): Promise<void>

  // Gets information about a file or directory
  getInfo(props: { path: PathRelative }): Promise<NodeInfo[]>

  // Has file
  hasFile(props: { path: PathRelative; mtime: number }): Promise<boolean>

  // Returns a Observable of changes to a file or directory
  watch(): Observable<NodeInfoVersions>

  // Returns all files in the database
  allFiles(): Promise<{ path: string; nodeInfos: NodeInfo[] }[]>
}

export type Database<T> = ReturnType<DatabaseFactory<T>>
