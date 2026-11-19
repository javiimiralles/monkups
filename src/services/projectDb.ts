import { sortProjects, type ProjectRecord } from '../domain/project'

// Plain IndexedDB: one object store keyed by project id. Blobs are stored natively.
const DB_NAME = 'monkups'
const STORE = 'projects'

let dbPromise: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const tx = (await db()).transaction(STORE, mode)
  const req = op(tx.objectStore(STORE))
  return new Promise((resolve, reject) => {
    // Resolve on transaction completion so writes are durable before callers continue.
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export const saveProject = (record: ProjectRecord) => run('readwrite', (s) => s.put(record)).then(() => record)

export const deleteProject = (id: string) => run('readwrite', (s) => s.delete(id)).then(() => undefined)

export const listProjects = () => run('readonly', (s) => s.getAll() as IDBRequest<ProjectRecord[]>).then(sortProjects)
