// apps/frontend-kiosk/src/hooks/useBoxGenerator.ts
import { useRef, useState, useCallback, useEffect } from 'react'
import type { BoxParams } from '../workers/box-generator.worker'

export type { BoxParams }

export interface BoxResult {
  bodyBuffer: ArrayBuffer
  lidBuffer: ArrayBuffer
  combinedBuffer: ArrayBuffer
}

export function useBoxGenerator() {
  const workerRef = useRef<Worker | null>(null)
  const generationRef = useRef(0)
  const [result, setResult] = useState<BoxResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/box-generator.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e: MessageEvent<BoxResult & { error?: string; __id?: number }>) => {
      if (e.data.__id !== undefined && e.data.__id !== generationRef.current) return
      if (e.data.error) {
        setError(e.data.error)
      } else {
        setResult({ bodyBuffer: e.data.bodyBuffer, lidBuffer: e.data.lidBuffer, combinedBuffer: e.data.combinedBuffer })
      }
      setIsLoading(false)
    }
    worker.onerror = (e: ErrorEvent) => {
      setError(e.message || 'Worker error')
      setIsLoading(false)
    }
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const generate = useCallback((params: BoxParams) => {
    if (!workerRef.current) return
    const id = ++generationRef.current
    setIsLoading(true)
    setError(null)
    setResult(null)
    workerRef.current.postMessage({ ...params, __id: id })
  }, [])

  return { generate, result, isLoading, error }
}
