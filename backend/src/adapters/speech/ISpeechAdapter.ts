export interface SpeechMetrics {
  transcript: string;
  durationSeconds: number;
  wordCount: number;
  wpm: number;
  isPaceOptimal: boolean; // 120 <= wpm <= 150
  paceClassification: 'HESITANT' | 'OPTIMAL' | 'RUSHED';
  totalFillerWords: number;
  fillerWordBreakdown: Record<string, number>;
}

export interface ISpeechAdapter {
  processTranscript(transcript: string, durationSeconds?: number): Promise<SpeechMetrics>;
}
