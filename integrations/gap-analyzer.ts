/**
 * Gap Analysis for Brief Enhancement
 * Identifies missing information and suggests improvements
 */

import { BriefIntent } from "./intent-analyzer";
import { BriefEntities } from "./entity-extractor";
import { BriefTone } from "./tone-analyzer";

export interface BriefGaps {
  missing_information: string[];
  suggested_additions: string[];
  completeness_score: number; // 0-100
  clarity_score: number; // 0-100
  priority_improvements: string[]; // Most important fixes
}

export class GapAnalyzer {
  private log: (message: string) => void;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
  }

  /**
   * Analyze gaps in brief based on intent, entities, and tone
   */
  analyzeGaps(
    text: string,
    entities: BriefEntities,
    intent: BriefIntent,
    tone: BriefTone,
  ): BriefGaps {
    const missing_information = this.identifyMissingInfo(
      text,
      entities,
      intent,
    );
    const suggested_additions = this.generateSuggestions(
      text,
      entities,
      intent,
      tone,
    );
    const completeness_score = this.calculateCompleteness(
      text,
      entities,
      intent,
    );
    const clarity_score = this.calculateClarity(text, entities, intent);
    const priority_improvements = this.identifyPriorityImprovements(
      missing_information,
      suggested_additions,
      completeness_score,
      clarity_score,
    );

    const gaps: BriefGaps = {
      missing_information,
      suggested_additions,
      completeness_score,
      clarity_score,
      priority_improvements,
    };

    this.log(`[GapAnalyzer] Identified gaps: ${JSON.stringify(gaps)}`);
    return gaps;
  }

  /**
   * Identify missing information based on intent
   */
  private identifyMissingInfo(
    text: string,
    entities: BriefEntities,
    intent: BriefIntent,
  ): string[] {
    const missing: string[] = [];
    const lowerText = text.toLowerCase();

    // Intent-specific missing information
    switch (intent.primaryGoal) {
      case "funding":
        if (
          !lowerText.includes("budget") &&
          !lowerText.includes("amount") &&
          !lowerText.includes("$")
        ) {
          missing.push("Specific funding amount or budget range");
        }
        if (
          !lowerText.includes("purpose") &&
          !lowerText.includes("use of funds")
        ) {
          missing.push("How funds will be used");
        }
        break;

      case "partnership":
        if (entities.organizations.length === 0) {
          missing.push("Specific organizations or types of partners sought");
        }
        if (
          !lowerText.includes("role") &&
          !lowerText.includes("responsibility")
        ) {
          missing.push("Clear definition of partnership roles");
        }
        break;

      case "implementation":
        if (
          !lowerText.includes("timeline") &&
          !lowerText.includes("schedule")
        ) {
          missing.push("Implementation timeline and milestones");
        }
        if (
          !lowerText.includes("resources") &&
          !lowerText.includes("equipment")
        ) {
          missing.push("Required resources and equipment");
        }
        if (!lowerText.includes("team") && !lowerText.includes("personnel")) {
          missing.push("Implementation team and personnel needs");
        }
        break;

      case "research":
        if (
          !lowerText.includes("methodology") &&
          !lowerText.includes("approach")
        ) {
          missing.push("Research methodology or approach");
        }
        if (
          !lowerText.includes("outcome") &&
          !lowerText.includes("deliverable")
        ) {
          missing.push("Expected research outcomes");
        }
        break;
    }

    // Geographic location missing
    if (
      intent.localization.confidence < 30 &&
      entities.locations.length === 0
    ) {
      missing.push("Specific geographic location or region");
    }

    // Timeline missing
    if (
      intent.timeline === "short-term" &&
      !lowerText.includes("deadline") &&
      !lowerText.includes("date")
    ) {
      missing.push("Specific timeline or deadline");
    }

    // Contact information missing
    if (
      !lowerText.includes("email") &&
      !lowerText.includes("contact") &&
      !lowerText.includes("phone")
    ) {
      missing.push("Contact information for follow-up");
    }

    return missing;
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    text: string,
    entities: BriefEntities,
    intent: BriefIntent,
    tone: BriefTone,
  ): string[] {
    const suggestions: string[] = [];
    const lowerText = text.toLowerCase();

    // General suggestions
    if (text.length < 100) {
      suggestions.push("Add more detail about your project or needs");
    }

    if (text.length > 500) {
      suggestions.push("Consider making the brief more concise and focused");
    }

    // Entity-based suggestions
    if (entities.causes.length === 0) {
      suggestions.push(
        "Specify the environmental or social cause you're addressing",
      );
    }

    if (entities.activities.length === 0) {
      suggestions.push("Describe specific activities or actions needed");
    }

    if (entities.metrics.length === 0) {
      suggestions.push("Include measurable goals or success metrics");
    }

    // Intent-based suggestions
    if (intent.primaryGoal === "funding") {
      suggestions.push("Be specific about funding amount and intended use");
    }

    if (intent.primaryGoal === "implementation") {
      suggestions.push(
        "Clearly specify implementation timeline and resource requirements",
      );
    }

    // Tone-based suggestions
    if (tone.sentiment === "negative" && tone.emotional_language) {
      suggestions.push("Consider a more positive, solution-focused tone");
    }

    if (tone.formality === "casual" && intent.primaryGoal === "funding") {
      suggestions.push("Use more formal language for funding requests");
    }

    // Urgency suggestions
    if (intent.urgency === "critical" && !lowerText.includes("why")) {
      suggestions.push("Explain why this is urgent or time-sensitive");
    }

    // Structure suggestions
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 3) {
      suggestions.push(
        "Structure your brief with multiple sentences for clarity",
      );
    }

    if (sentences.length > 10) {
      suggestions.push("Consider using bullet points for better readability");
    }

    return suggestions;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(
    text: string,
    entities: BriefEntities,
    intent: BriefIntent,
  ): number {
    let score = 40; // Base score

    // Length component
    if (text.length > 50) score += 10;
    if (text.length > 100) score += 10;
    if (text.length > 200) score += 10;

    // Entity completeness
    if (entities.organizations.length > 0) score += 5;
    if (entities.locations.length > 0) score += 5;
    if (entities.causes.length > 0) score += 5;
    if (entities.activities.length > 0) score += 5;
    if (entities.metrics.length > 0) score += 5;

    // Intent-specific completeness
    switch (intent.primaryGoal) {
      case "funding":
        if (
          text.toLowerCase().includes("budget") ||
          text.toLowerCase().includes("$")
        )
          score += 10;
        break;
      case "implementation":
        if (
          text.toLowerCase().includes("timeline") ||
          text.toLowerCase().includes("resources")
        )
          score += 10;
        break;
      case "partnership":
        if (entities.organizations.length > 0) score += 10;
        break;
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate clarity score
   */
  private calculateClarity(
    text: string,
    entities: BriefEntities,
    intent: BriefIntent,
  ): number {
    let score = 50; // Base score

    // Sentence structure
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length >= 3 && sentences.length <= 8) score += 10;

    // Average sentence length
    const avgLength =
      sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) /
      sentences.length;
    if (avgLength >= 10 && avgLength <= 20) score += 10;

    // Specificity
    if (entities.causes.length > 0) score += 10;
    if (entities.activities.length > 0) score += 10;
    if (entities.metrics.length > 0) score += 10;

    // Avoid vagueness
    const vagueWords = [
      "help",
      "support",
      "work",
      "things",
      "stuff",
      "something",
    ];
    const lowerText = text.toLowerCase();
    const vagueCount = vagueWords.filter((word) =>
      lowerText.includes(word),
    ).length;
    if (vagueCount === 0) score += 10;
    else if (vagueCount <= 2) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Identify priority improvements
   */
  private identifyPriorityImprovements(
    missing: string[],
    suggestions: string[],
    completeness: number,
    clarity: number,
  ): string[] {
    const priorities: string[] = [];

    // High priority if scores are low
    if (completeness < 50) {
      priorities.push("Add more specific details to improve completeness");
    }

    if (clarity < 50) {
      priorities.push("Improve clarity with more specific language");
    }

    // Priority missing information
    const highPriorityMissing = missing.filter(
      (m) =>
        m.includes("funding") ||
        m.includes("timeline") ||
        m.includes("contact"),
    );
    priorities.push(...highPriorityMissing);

    // Priority suggestions
    const highPrioritySuggestions = suggestions.filter(
      (s) =>
        s.includes("specific") ||
        s.includes("measurable") ||
        s.includes("clear"),
    );
    priorities.push(...highPrioritySuggestions.slice(0, 2)); // Limit to top 2

    return priorities.slice(0, 3); // Return top 3 priorities
  }
}
