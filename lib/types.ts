export interface GroundedSource {
  id: string;
  name: string;
  handle: string;
  weight: number; // 0..1, grounded sources sum to 1
  grounded: boolean;
  reason: string;
}

export interface Settlement {
  sourceId: string;
  name: string;
  handle: string;
  payTo: string;
  micros: number;
  amountUsdc: string;
  txId?: string;
}

export interface GroundResult {
  id: string;
  question: string;
  answer: string;
  sources: GroundedSource[];
  settlements: Settlement[];
  tollUsdc: number;
  settledMicros: number;
  method: 'gemini' | 'heuristic';
  live: boolean; // true if real Arc settlement happened
  ts: number;
}
