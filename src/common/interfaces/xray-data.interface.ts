export type { XRayMessage, ProcessedSignal } from '../types';

export interface XRayDataPoint {
  time: number;
  coordinates: [number, number, number];
}
