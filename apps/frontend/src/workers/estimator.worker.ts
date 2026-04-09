import { runEstimate } from '@swift-prints/estimator';
import type { EstimateParams, EstimateResult } from '@swift-prints/estimator';

self.onmessage = (e: MessageEvent<EstimateParams>) => {
  const result: EstimateResult = runEstimate(e.data);
  self.postMessage(result);
};
