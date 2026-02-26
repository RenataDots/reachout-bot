/**
 * Intent Recognition for Brief Analysis
 * Analyzes user intent, urgency, scope, and timeline from brief text
 */

export interface BriefIntent {
  primaryGoal: 'partnership' | 'funding' | 'volunteers' | 'advocacy' | 'research';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  scope: 'local' | 'regional' | 'national' | 'global';
  timeline: 'immediate' | 'short-term' | 'long-term' | 'ongoing';
  confidence: number; // 0-100 confidence score
}

export class IntentAnalyzer {
  private log: (message: string) => void;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
  }

  /**
   * Analyze intent from brief text
   */
  analyzeIntent(text: string): BriefIntent {
    const lowerText = text.toLowerCase();
    
    const primaryGoal = this.extractPrimaryGoal(lowerText);
    const urgency = this.extractUrgency(lowerText);
    const scope = this.extractScope(lowerText);
    const timeline = this.extractTimeline(lowerText);
    const confidence = this.calculateConfidence(primaryGoal, urgency, scope, timeline, lowerText);

    const intent: BriefIntent = {
      primaryGoal,
      urgency,
      scope,
      timeline,
      confidence
    };

    this.log(`[IntentAnalyzer] Detected intent: ${JSON.stringify(intent)}`);
    return intent;
  }

  /**
   * Extract primary goal from text
   */
  private extractPrimaryGoal(text: string): BriefIntent['primaryGoal'] {
    const goalPatterns = {
      partnership: [
        'partner', 'collaborate', 'collaboration', 'cooperation', 'joint', 'alliance',
        'work together', 'team up', 'join forces', 'partnership', 'cooperative'
      ],
      funding: [
        'fund', 'funding', 'donate', 'donation', 'grant', 'investment', 'sponsor',
        'financial support', 'money', 'budget', 'resources', 'capital'
      ],
      volunteers: [
        'volunteer', 'volunteering', 'help', 'assist', 'support', 'hands-on',
        'manpower', 'people', 'team members', 'staff', 'workers'
      ],
      advocacy: [
        'advocate', 'advocacy', 'campaign', 'raise awareness', 'policy', 'legislation',
        'petition', 'protest', 'speak out', 'voice', 'influence'
      ],
      research: [
        'research', 'study', 'investigate', 'analyze', 'data', 'survey',
        'monitor', 'evaluate', 'assessment', 'scientific', 'academic'
      ]
    };

    let maxScore = 0;
    let detectedGoal: BriefIntent['primaryGoal'] = 'partnership';

    for (const [goal, patterns] of Object.entries(goalPatterns)) {
      const score = patterns.reduce((count, pattern) => {
        return count + (text.includes(pattern) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedGoal = goal as BriefIntent['primaryGoal'];
      }
    }

    return detectedGoal;
  }

  /**
   * Extract urgency level from text
   */
  private extractUrgency(text: string): BriefIntent['urgency'] {
    const urgencyPatterns = {
      critical: ['urgent', 'emergency', 'crisis', 'critical', 'asap', 'immediately', 'right away'],
      high: ['soon', 'quickly', 'promptly', 'high priority', 'important', 'need'],
      medium: ['in the near future', 'coming weeks', 'next month', 'relatively soon'],
      low: ['when possible', 'eventually', 'in time', 'no rush', 'flexible']
    };

    for (const [level, patterns] of Object.entries(urgencyPatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return level as BriefIntent['urgency'];
      }
    }

    return 'medium'; // default
  }

  /**
   * Extract geographic scope from text
   */
  private extractScope(text: string): BriefIntent['scope'] {
    const scopePatterns = {
      global: ['global', 'worldwide', 'international', 'world', 'planet', 'earth'],
      national: ['national', 'country', 'nationwide', 'across the country'],
      regional: ['regional', 'state', 'province', 'area', 'district', 'county'],
      local: ['local', 'community', 'city', 'town', 'neighborhood', 'village']
    };

    for (const [scope, patterns] of Object.entries(scopePatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return scope as BriefIntent['scope'];
      }
    }

    return 'regional'; // default
  }

  /**
   * Extract timeline from text
   */
  private extractTimeline(text: string): BriefIntent['timeline'] {
    const timelinePatterns = {
      immediate: ['immediately', 'right now', 'today', 'asap', 'urgent'],
      'short-term': ['week', 'weeks', 'month', 'months', 'short term', 'soon'],
      'long-term': ['year', 'years', 'long term', 'ongoing', 'permanent', 'sustainable'],
      ongoing: ['ongoing', 'continuous', 'regular', 'recurring', 'permanent']
    };

    for (const [timeline, patterns] of Object.entries(timelinePatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return timeline as BriefIntent['timeline'];
      }
    }

    return 'short-term'; // default
  }

  /**
   * Calculate confidence score for intent detection
   */
  private calculateConfidence(
    primaryGoal: BriefIntent['primaryGoal'],
    urgency: BriefIntent['urgency'],
    scope: BriefIntent['scope'],
    timeline: BriefIntent['timeline'],
    text: string
  ): number {
    let confidence = 50; // base confidence

    // Increase confidence based on text length and clarity
    if (text.length > 50) confidence += 10;
    if (text.length > 150) confidence += 10;

    // Increase confidence if specific indicators are found
    const specificIndicators = [
      'partner', 'fund', 'volunteer', 'advocate', 'research',
      'urgent', 'local', 'global', 'immediate', 'ongoing'
    ];
    
    const indicatorCount = specificIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;
    
    confidence += Math.min(indicatorCount * 5, 20);

    // Bonus for structured text
    if (text.includes('.') && text.split('.').length > 2) confidence += 5;
    if (text.match(/\d+/)) confidence += 5; // contains numbers

    return Math.min(confidence, 100);
  }
}
