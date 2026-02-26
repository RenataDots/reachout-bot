/**
 * Tone and Sentiment Analysis for Brief Analysis
 * Analyzes sentiment, formality, urgency indicators, and emotional language
 */

export interface BriefTone {
  sentiment: 'positive' | 'neutral' | 'negative';
  formality: 'formal' | 'semi-formal' | 'casual';
  urgency_indicators: string[];
  emotional_language: boolean;
  confidence: number; // 0-100 confidence score
}

export class ToneAnalyzer {
  private log: (message: string) => void;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
  }

  /**
   * Analyze tone from brief text
   */
  analyzeTone(text: string): BriefTone {
    const sentiment = this.analyzeSentiment(text);
    const formality = this.analyzeFormality(text);
    const urgency_indicators = this.extractUrgencyIndicators(text);
    const emotional_language = this.detectEmotionalLanguage(text);
    const confidence = this.calculateToneConfidence(sentiment, formality, text);

    const tone: BriefTone = {
      sentiment,
      formality,
      urgency_indicators,
      emotional_language,
      confidence
    };

    this.log(`[ToneAnalyzer] Detected tone: ${JSON.stringify(tone)}`);
    return tone;
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): BriefTone['sentiment'] {
    const positiveWords = [
      'excited', 'happy', 'pleased', 'thrilled', 'delighted', 'grateful',
      'optimistic', 'hopeful', 'confident', 'proud', 'satisfied',
      'amazing', 'excellent', 'great', 'wonderful', 'fantastic',
      'good', 'better', 'best', 'perfect', 'successful', 'effective',
      'opportunity', 'potential', 'progress', 'achievement', 'impact'
    ];

    const negativeWords = [
      'frustrated', 'disappointed', 'concerned', 'worried', 'anxious',
      'urgent', 'crisis', 'emergency', 'problem', 'issue', 'challenge',
      'difficult', 'hard', 'struggle', 'fail', 'failure', 'poor',
      'bad', 'terrible', 'awful', 'horrible', 'disaster', 'critical',
      'desperate', 'need', 'require', 'lack', 'missing', 'insufficient'
    ];

    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveScore += matches.length;
    });

    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeScore += matches.length;
    });

    if (positiveScore > negativeScore * 1.5) {
      return 'positive';
    } else if (negativeScore > positiveScore * 1.5) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  /**
   * Analyze formality level
   */
  private analyzeFormality(text: string): BriefTone['formality'] {
    const formalIndicators = [
      'therefore', 'furthermore', 'moreover', 'consequently', 'accordingly',
      'sincerely', 'respectfully', 'dear', 'regards', 'cordially',
      'organization', 'institution', 'establishment', 'corporation',
      'collaboration', 'partnership', 'cooperation'
    ];

    const casualIndicators = [
      'hey', 'hi', 'hello', 'thanks', 'thx', 'gonna', 'wanna',
      'cool', 'awesome', 'great', 'yeah', 'yep', 'ok', 'okay',
      "don't", "can't", "won't", "it's", "that's", "we're",
      'guys', 'folks', 'everyone', 'y\'all'
    ];

    const lowerText = text.toLowerCase();
    let formalScore = 0;
    let casualScore = 0;

    formalIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        formalScore++;
      }
    });

    casualIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        casualScore++;
      }
    });

    // Check for contractions (casual indicator)
    const contractions = lowerText.match(/\b\w+'t\b|\b\w+'re\b|\b\w+'ve\b|\b\w+'ll\b/gi);
    if (contractions) {
      casualScore += contractions.length;
    }

    // Check for sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

    // Longer sentences tend to be more formal
    if (avgSentenceLength > 15) formalScore += 2;
    else if (avgSentenceLength < 8) casualScore += 2;

    if (formalScore > casualScore * 1.5) {
      return 'formal';
    } else if (casualScore > formalScore * 1.5) {
      return 'casual';
    } else {
      return 'semi-formal';
    }
  }

  /**
   * Extract urgency indicators
   */
  private extractUrgencyIndicators(text: string): string[] {
    const urgencyPatterns = {
      critical: ['urgent', 'emergency', 'crisis', 'critical', 'asap', 'immediately'],
      high: ['soon', 'quickly', 'promptly', 'high priority', 'important', 'need'],
      medium: ['in near future', 'coming weeks', 'next month', 'relatively soon'],
      low: ['when possible', 'eventually', 'in time', 'no rush', 'flexible']
    };

    const indicators: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [level, patterns] of Object.entries(urgencyPatterns)) {
      patterns.forEach(pattern => {
        if (lowerText.includes(pattern)) {
          indicators.push(`${level}: ${pattern}`);
        }
      });
    }

    return indicators;
  }

  /**
   * Detect emotional language
   */
  private detectEmotionalLanguage(text: string): boolean {
    const emotionalWords = [
      'feel', 'feeling', 'emotional', 'passionate', 'excited', 'frustrated',
      'worried', 'concerned', 'hopeful', 'optimistic', 'pessimistic',
      'angry', 'upset', 'happy', 'sad', 'disappointed', 'thrilled',
      'devastated', 'ecstatic', 'overwhelmed', 'stressed', 'relieved',
      'proud', 'ashamed', 'guilty', 'confident', 'insecure', 'anxious'
    ];

    const emotionalPhrases = [
      'i feel', 'i believe', 'i think', 'i hope', 'i wish', 'i dream',
      'my heart', 'soul', 'spirit', 'passion', 'love', 'hate',
      'desperately', 'deeply', 'truly', 'sincerely', 'genuinely'
    ];

    const lowerText = text.toLowerCase();
    let emotionalCount = 0;

    emotionalWords.forEach(word => {
      if (lowerText.includes(word)) {
        emotionalCount++;
      }
    });

    emotionalPhrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        emotionalCount += 2; // Phrases weight more
      }
    });

    // Check for exclamation points (emotional indicator)
    const exclamations = (text.match(/!/g) || []).length;
    emotionalCount += exclamations;

    // Check for ALL CAPS (emotional emphasis)
    const caps = (text.match(/[A-Z]{4,}/g) || []).length;
    emotionalCount += caps * 2;

    return emotionalCount >= 2; // Threshold for emotional language
  }

  /**
   * Calculate confidence score for tone analysis
   */
  private calculateToneConfidence(
    sentiment: BriefTone['sentiment'],
    formality: BriefTone['formality'],
    text: string
  ): number {
    let confidence = 60; // base confidence

    // Increase confidence based on text length
    if (text.length > 100) confidence += 10;
    if (text.length > 200) confidence += 10;

    // Increase confidence if clear sentiment detected
    if (sentiment !== 'neutral') confidence += 10;

    // Increase confidence if clear formality detected
    if (formality !== 'semi-formal') confidence += 10;

    // Bonus for structured text
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 3) confidence += 5;

    // Bonus for varied vocabulary (indicates more nuanced tone)
    const words = text.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (uniqueWords.size / words.length > 0.7) confidence += 5;

    return Math.min(confidence, 100);
  }
}
