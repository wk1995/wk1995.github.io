import { useEffect, useState } from 'react'
import type { MutationReceipt } from './mutations'

type Draft = { answers: Record<string, string>; token: string; submittedAt: string; receipt?: MutationReceipt }
const fresh = (): Draft => ({ answers: {}, token: crypto.randomUUID(), submittedAt: new Date().toISOString() })
const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('study-private-drafts', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('drafts')
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(new Error('无法打开本机草稿存储'))
})
async function read(scope: string): Promise<Draft> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readonly')
    const request = transaction.objectStore('drafts').get(scope)
    transaction.oncomplete = () => { db.close(); resolve(request.result ?? fresh()) }
    transaction.onerror = () => { db.close(); reject(new Error('读取草稿失败')) }
  })
}
async function write(scope: string, draft: Draft) {
  const db = await database()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite')
    transaction.objectStore('drafts').put(draft, scope)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(new Error('保存草稿失败，请保留当前页面')) }
  })
}
export function useAssessmentDraft(scope: string) {
  const [draft, setDraft] = useState<Draft>(fresh)
  const [loadedScope, setLoadedScope] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void read(scope).then((value) => { if (active) { setDraft(value); setLoadedScope(scope) } }).catch((error: Error) => { if (active) setError(error.message) })
    return () => { active = false }
  }, [scope])
  const save = async (next: Draft) => { await write(scope, next); setDraft(next) }
  return { draft, ready: loadedScope === scope, error,
    changeAnswer: (id: string, answer: string) => { const next = { ...draft, answers: { ...draft.answers, [id]: answer } }; setDraft(next); void write(scope, next).catch((error: Error) => setError(error.message)) },
    recordReceipt: (receipt: MutationReceipt) => save({ ...draft, receipt }),
    restart: () => save(fresh()),
  }
}
