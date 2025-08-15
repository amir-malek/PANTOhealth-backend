export class DeviceStatsDto {
  _id: string;
  totalSignals: number;
  avgDataLength: number;
  avgDataVolume: number;
  avgSpeed: number;
  minDataLength: number;
  maxDataLength: number;
  minDataVolume: number;
  maxDataVolume: number;
  firstSignal: Date;
  lastSignal: Date;
}