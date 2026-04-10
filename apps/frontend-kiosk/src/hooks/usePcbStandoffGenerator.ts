// apps/frontend-kiosk/src/hooks/usePcbStandoffGenerator.ts
import { useRef, useState, useCallback, useEffect } from 'react'
import type { PcbStandoffParams } from '../workers/pcb-standoff.worker'

export type { PcbStandoffParams }
export type { HolePosition } from '../workers/pcb-standoff.worker'

export interface PcbStandoffResult {
  buffer: ArrayBuffer
}

export function usePcbStandoffGenerator() {
  const workerRef = useRef<Worker | null>(null)
  const generationRef = useRef(0)
  const [result, setResult] = useState<PcbStandoffResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/pcb-standoff.worker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (e: MessageEvent<PcbStandoffResult & { error?: string; __id?: number }>) => {
      if (e.data.__id !== undefined && e.data.__id !== generationRef.current) return
      if (e.data.error) {
        setError(e.data.error)
      } else {
        setResult({ buffer: e.data.buffer })
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

  const generate = useCallback((params: PcbStandoffParams) => {
    if (!workerRef.current) return
    const id = ++generationRef.current
    setIsLoading(true)
    setError(null)
    setResult(null)
    workerRef.current.postMessage({ ...params, __id: id })
  }, [])

  return { generate, result, isLoading, error }
}
