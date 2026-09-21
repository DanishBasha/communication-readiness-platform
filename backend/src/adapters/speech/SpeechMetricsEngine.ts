import { ISpeechAdapter, SpeechMetrics } from './ISpeechAdapter';

export class SpeechMetricsEngine implements ISpeechAdapter {
  private static readonly COMMON_FILLERS = [
    'uh',
    'um',
    'like',
    'you know',
    'actually',
    'basically',
    'sort of',
    'kind of'
  ];

  async processTranscript(transcript: string, estimatedDuration?: number): Promise<SpeechMetrics> {
    const cleaned = transcript.trim();
    if (!cleaned) {
      return {
        transcript: '',
        durationSeconds: 0,
        wordCount: 0,
        wpm: 0,
        isPaceOptimal: false,
        paceClassification: 'HESITANT',
        totalFillerWords: 0,
        fillerWordBreakdown: {}
      };
    }

    const lower = cleaned.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Estimate duration if not provided (standard baseline 130 wpm)
    const durationSeconds = estimatedDuration && estimatedDuration > 0
      ? estimatedDuration
      : Math.max(5, Math.round((wordCount / 130) * 60));

    const wpm = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;

    let paceClassification: 'HESITANT' | 'OPTIMAL' | 'RUSHED' = 'OPTIMAL';
    if (wpm < 115) {
      paceClassification = 'HESITANT';
    } else if (wpm > 155) {
      paceClassification = 'RUSHED';
    }

    const fillerWordBreakdown: Record<string, number> = {};
    let totalFillerWords = 0;

    for (const filler of SpeechMetricsEngine.COMMON_FILLERS) {
      // Regex for exact word boundary match
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches && matches.length > 0) {
        fillerWordBreakdown[filler] = matches.length;
        totalFillerWords += matches.length;
      }
    }

    return {
      transcript: cleaned,
      durationSeconds,
      wordCount,
      wpm,
      isPaceOptimal: wpm >= 120 && wpm <= 150,
      paceClassification,
      totalFillerWords,
      fillerWordBreakdown
    };
  }
}
