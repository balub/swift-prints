import { useState, useEffect, useRef, useCallback } from 'react';
import type { EstimateResult } from '@swift-prints/estimator';

interface UseEstimatorReturn {
  estimate: (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => void;
  result: EstimateResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useEstimator(): UseEstimatorReturn {
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/estimator.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<EstimateResult>) => {
      setResult(e.data);
      setIsLoading(false);
    };

    workerRef.current.onerror = (e) => {
      setError(e.message || 'Estimation failed');
      setIsLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const estimate = useCallback(
    (file: File, params: { layerHeight: number; infill: number; perimeterCount: number }) => {
      if (!workerRef.current) return;
      setIsLoading(true);
      setError(null);
      setResult(null);

      file.arrayBuffer().then((stlBuffer) => {
        workerRef.current!.postMessage({
          stlBuffer,
          layerHeight: params.layerHeight,
          infill: params.infill,
          perimeterCount: params.perimeterCount,
        }, [stlBuffer]);
      });
    },
    []
  );

  return { estimate, result, isLoading, error };
}
