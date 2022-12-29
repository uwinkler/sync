import type { Ok, PathAbsolute, PathRelative, Url, Version } from '../types'

export type StorageFactory<T> = (config: T) => {
  //
  // Initialize storage
  //
  init(): Promise<Ok>

  // Store a file
  // Returns a URL to the stored file
  // root: the root directory of the file to be stored
  // path: the path of the file to be stored
  // version: the version info with which the file will be stored
  storeFile(props: {
    root: PathAbsolute
    path: PathRelative
    version: string
  }): Promise<Url>

  // Check if a file exists in storage
  // path: the path of the file to be checked
  // version: the version of the file to be checked
  hasFile(props: { path: PathRelative; version: Version }): Promise<boolean>

  // Restore a file from storage
  // root: the root directory of the file to be restored to
  // path: the path of the file to be restored
  // version: the version of the file to be restored
  restoreFile(props: {
    root: PathAbsolute
    path: PathRelative
    version: Version
  }): Promise<void>
}

export type Storage<T> = ReturnType<StorageFactory<T>>