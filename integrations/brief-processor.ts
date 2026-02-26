/**
 * Brief Processing Service
 *
 * Handles preprocessing and analysis of copy-pasted brief text
 * Implements best practices for text cleaning and structure detection
 */

export interface ProcessedBrief {
  originalText: string;
  cleanedText: string;
  sentences: string[];
  paragraphs: string[];
  wordCount: number;
  structure: {
    hasBulletPoints: boolean;
    hasNumberedList: boolean;
    hasMultipleParagraphs: boolean;
    estimatedFormat: 'paragraph' | 'list' | 'mixed' | 'unknown';
  };
  quality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

export interface TextSegment {
  text: string;
  type: 'sentence' | 'paragraph' | 'bullet' | 'numbered' | 'heading';
  startIndex: number;
  endIndex: number;
}

export class BriefProcessor {
  private logger: (msg: string, level?: "info" | "warn" | "error") => void;

  constructor(logger?: (msg: string, level?: "info" | "warn" | "error") => void) {
    this.logger = logger || console.log;
  }

  /**
   * Main processing pipeline for brief text
   */
  processBrief(text: string): ProcessedBrief {
    this.logger("[BriefProcessor] Processing brief text...");
    
    // Phase 1: Text Cleaning & Normalization
    const cleanedText = this.cleanText(text);
    
    // Phase 2: Structure Detection
    const segments = this.detectStructure(cleanedText);
    const structure = this.analyzeStructure(segments);
    
    // Phase 3: Quality Assessment
    const quality = this.assessTextQuality(cleanedText, structure);
    
    const result: ProcessedBrief = {
      originalText: text,
      cleanedText,
      sentences: segments.filter(s => s.type === 'sentence').map(s => s.text),
      paragraphs: segments.filter(s => s.type === 'paragraph').map(s => s.text),
      wordCount: this.countWords(cleanedText),
      structure,
      quality,
    };

    this.logger(`[BriefProcessor] Brief processed: ${result.wordCount} words, quality score: ${quality.score}`);
    return result;
  }

  /**
   * Phase 1: Clean and normalize text
   */
  private cleanText(text: string): string {
    this.logger("[BriefProcessor] Cleaning text...");
    
    let cleaned = text;
    
    // Remove common copy-paste artifacts
    cleaned = cleaned.replace(/\u00A0/g, ' '); // Non-breaking spaces
    cleaned = cleaned.replace(/\u2013|\u2014/g, '-'); // En/em dashes
    cleaned = cleaned.replace(/\u201C|\u201D|\u201E|\u201F/g, '"'); // Smart quotes
    cleaned = cleaned.replace(/\u2026/g, '...'); // Horizontal ellipsis
    
    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces to single
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n'); // Multiple newlines to double
    cleaned = cleaned.replace(/\n\s+/g, '\n'); // Newline with spaces to single newline
    cleaned = cleaned.replace(/\t+/g, ' '); // Tabs to spaces
    
    // Remove excessive punctuation
    cleaned = cleaned.replace(/[^\w\s.,!?;:()[\]{}"']/g, ''); // Keep only word chars and basic punctuation
    cleaned = cleaned.replace(/\s*([.,!?;:])\s*/g, '$1 '); // Normalize punctuation spacing
    cleaned = cleaned.replace(/\s*([()\[\]{}])\s*/g, '$1'); // Normalize bracket spacing
    
    // Clean up start/end
    cleaned = cleaned.trim();
    
    // Ensure proper sentence endings
    cleaned = cleaned.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
    
    this.logger(`[BriefProcessor] Text cleaned: ${text.length} → ${cleaned.length} characters`);
    return cleaned;
  }

  /**
   * Phase 2: Detect text structure
   */
  private detectStructure(text: string): TextSegment[] {
    this.logger("[BriefProcessor] Detecting text structure...");
    
    const segments: TextSegment[] = [];
    let currentIndex = 0;
    
    // Split into lines for analysis
    const lines = text.split('\n');
    
    lines.forEach((line, lineIndex) => {
      const lineStart = currentIndex;
      
      // Determine line type
      let type: TextSegment['type'] = 'paragraph';
      
      if (this.isBulletPoint(line)) {
        type = 'bullet';
      } else if (this.isNumberedList(line)) {
        type = 'numbered';
      } else if (this.isHeading(line)) {
        type = 'heading';
      } else if (this.isCompleteSentence(line)) {
        type = 'sentence';
      }
      
      // Find sentence boundaries within the line
      if (type === 'paragraph') {
        const sentences = this.extractSentences(line);
        sentences.forEach(sentence => {
          segments.push({
            text: sentence.text,
            type: 'sentence',
            startIndex: sentence.start,
            endIndex: sentence.end,
          });
        });
      } else {
        segments.push({
          text: line,
          type,
          startIndex: lineStart,
          endIndex: lineStart + line.length,
        });
      }
      
      currentIndex = lineStart + line.length + 1; // +1 for newline
    });
    
    this.logger(`[BriefProcessor] Structure detected: ${segments.length} segments`);
    return segments;
  }

  /**
   * Analyze text structure characteristics
   */
  private analyzeStructure(segments: TextSegment[]): ProcessedBrief['structure'] {
    const hasBulletPoints = segments.some(s => s.type === 'bullet');
    const hasNumberedList = segments.some(s => s.type === 'numbered');
    const hasMultipleParagraphs = segments.filter(s => s.type === 'paragraph').length > 1;
    
    let estimatedFormat: ProcessedBrief['structure']['estimatedFormat'] = 'unknown';
    
    if (hasBulletPoints && !hasNumberedList && !hasMultipleParagraphs) {
      estimatedFormat = 'list';
    } else if (hasNumberedList && !hasBulletPoints && !hasMultipleParagraphs) {
      estimatedFormat = 'list';
    } else if (hasMultipleParagraphs && !hasBulletPoints && !hasNumberedList) {
      estimatedFormat = 'paragraph';
    } else if ((hasBulletPoints || hasNumberedList) && hasMultipleParagraphs) {
      estimatedFormat = 'mixed';
    }
    
    return {
      hasBulletPoints,
      hasNumberedList,
      hasMultipleParagraphs,
      estimatedFormat,
    };
  }

  /**
   * Phase 3: Assess text quality
   */
  private assessTextQuality(text: string, structure: ProcessedBrief['structure']): ProcessedBrief['quality'] {
    this.logger("[BriefProcessor] Assessing text quality...");
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100; // Start with perfect score
    
    // Length assessment
    const wordCount = this.countWords(text);
    if (wordCount < 10) {
      issues.push("Brief is too short (less than 10 words)");
      suggestions.push("Add more detail about your project or requirements");
      score -= 30;
    } else if (wordCount < 25) {
      issues.push("Brief is quite short (less than 25 words)");
      suggestions.push("Consider adding more context about your goals");
      score -= 15;
    } else if (wordCount > 500) {
      issues.push("Brief is very long (over 500 words)");
      suggestions.push("Consider focusing on key points for better readability");
      score -= 10;
    }
    
    // Structure assessment
    if (structure.estimatedFormat === 'unknown') {
      issues.push("Text structure is unclear");
      suggestions.push("Use paragraphs or bullet points for better organization");
      score -= 20;
    } else if (structure.estimatedFormat === 'paragraph' && !structure.hasMultipleParagraphs) {
      issues.push("Single paragraph may be hard to read");
      suggestions.push("Consider breaking into multiple paragraphs or using bullet points");
      score -= 10;
    }
    
    // Content quality indicators
    if (!this.containsKeyInformation(text)) {
      issues.push("Missing key information (budget, timeline, or goals)");
      suggestions.push("Include details about budget, timeline, or specific objectives");
      score -= 25;
    }
    
    if (!this.hasActionableContent(text)) {
      issues.push("Lacks clear call to action or specific requirements");
      suggestions.push("Add specific needs or what you're looking for from partners");
      score -= 15;
    }
    
    // Readability assessment
    const avgSentenceLength = this.calculateAverageSentenceLength(text);
    if (avgSentenceLength > 25) {
      issues.push("Sentences are quite long (may be hard to read)");
      suggestions.push("Break up long sentences for better clarity");
      score -= 10;
    }
    
    // Ensure score doesn't go below 0
    score = Math.max(0, score);
    
    this.logger(`[BriefProcessor] Quality assessment: ${score}/100, ${issues.length} issues`);
    
    return { score, issues, suggestions };
  }

  // Helper methods for text analysis
  
  private isBulletPoint(line: string): boolean {
    return /^[•\-\*]\s/.test(line) || /^\d+\.\s/.test(line);
  }

  private isNumberedList(line: string): boolean {
    return /^\d+\.\s/.test(line) || /^\d+\)\s/.test(line);
  }

  private isHeading(line: string): boolean {
    return line.length < 50 && line.length > 3 && line === line.toUpperCase();
  }

  private isCompleteSentence(line: string): boolean {
    return /[.!?]$/.test(line.trim()) && line.trim().length > 5;
  }

  private extractSentences(text: string): { text: string; start: number; end: number }[] {
    const sentences: { text: string; start: number; end: number }[] = [];
    const sentenceRegex = /[.!?]+/g;
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceRegex.exec(text)) !== null) {
      const sentenceText = text.substring(lastIndex, match.index + match[0].length).trim();
      if (sentenceText.length > 5) {
        sentences.push({
          text: sentenceText,
          start: lastIndex,
          end: match.index + match[0].length,
        });
      }
      lastIndex = match.index + match[0].length;
    }
    
    return sentences;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private containsKeyInformation(text: string): boolean {
    const keyIndicators = [
      'budget', 'cost', 'price', 'funding', 'investment',
      'timeline', 'deadline', 'date', 'duration', 'when',
      'goal', 'objective', 'purpose', 'aim', 'target',
      'need', 'require', 'looking for', 'seeking'
    ];
    
    const lowerText = text.toLowerCase();
    return keyIndicators.some(indicator => lowerText.includes(indicator));
  }

  private hasActionableContent(text: string): boolean {
    const actionIndicators = [
      'partner', 'collaborate', 'work with', 'join', 'support',
      'help', 'assist', 'provide', 'offer', 'share',
      'connect', 'introduce', 'recommend', 'suggest'
    ];
    
    const lowerText = text.toLowerCase();
    return actionIndicators.some(indicator => lowerText.includes(indicator));
  }

  private calculateAverageSentenceLength(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;
    
    const totalWords = sentences.reduce((sum, sentence) => sum + this.countWords(sentence), 0);
    return totalWords / sentences.length;
  }
}
