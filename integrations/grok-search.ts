/**
 * Grok Search Service
 *
 * PURPOSE: Integrates with xAI's Grok API for intelligent NGO search
 * FUNCTIONALITY:
 *   - Sends campaign briefs to Grok for NGO recommendations
 *   - Parses structured JSON responses from Grok
 *   - Converts responses to NGOProfile format
 *   - Handles API errors and fallbacks
 *
 * INPUT: Campaign brief text
 * OUTPUT: Array of NGOProfile objects
 * DEPENDENCIES: OpenAI client for xAI API compatibility
 */

import * as schemas from "../shared/schemas";
import OpenAI from "openai";

export class GrokSearchService {
  private client: OpenAI | null = null;

  constructor() {
    // Initialize OpenAI client with xAI API endpoint
    if (process.env.XAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: "https://api.x.ai/v1",
        timeout: 360000, // 6 minutes timeout
      });
    }
  }

  /**
   * Search for NGOs using Grok API
   *
   * @param brief - Campaign brief text
   * @returns Promise<schemas.NGOProfile[]> - Array of matching NGOs
   */
  async searchNGOs(brief: string): Promise<schemas.NGOProfile[]> {
    if (!process.env.XAI_API_KEY || !this.client) {
      throw new Error(
        "XAI_API_KEY environment variable is required for Grok search",
      );
    }

    try {
      console.log(
        "[Grok Search] Sending brief to Grok API:",
        brief.substring(0, 100) + "...",
      );

      const response = await this.client.chat.completions.create({
        model: process.env.GROK_MODEL || "grok-4-1-fast-reasoning",
        messages: [
          { role: "system", content: this.getSystemPrompt() },
          { role: "user", content: this.buildNGOSearchPrompt(brief) },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from Grok API");
      }

      console.log("[Grok Search] Received response from Grok API");

      // Parse JSON response
      const grokResponse = this.parseJSONResponse(content);

      // Convert to NGOProfile format
      const ngos = this.convertToNGOProfiles(grokResponse);

      console.log(
        `[Grok Search] Converted ${ngos.length} NGOs from Grok response`,
      );
      return ngos;
    } catch (error) {
      console.error("[Grok Search] Error:", error);
      throw error;
    }
  }

  /**
   * System prompt for Grok API
   */
  private getSystemPrompt(): string {
    return `You are an expert environmental NGO researcher and analyst. Your task is to identify and recommend NGOs that would be suitable partners for environmental campaigns.

You will be given a campaign brief and need to:
1. Analyze the campaign goals, geographic scope, and focus areas
2. Identify relevant NGOs that match the campaign requirements
3. Provide structured information about each NGO
4. Assess their suitability as partners

Respond with a JSON object containing an array of NGOs. Each NGO should include:
- name: Full official name
- email: Contact email (use info@domain.org if unknown)
- domain: Organization website domain
- geography: Geographic scope (e.g., "Global", "USA", "Africa", "Southeast Asia")
- focusAreas: Array of environmental focus areas
- fitRationale: Brief explanation of why this NGO fits the campaign
- partnerStatus: "potential" for all recommendations
- riskScore: Risk assessment (1-5, where 1 is lowest risk)
- controversySummary: Brief summary of any controversies or "No major controversies"

Focus on real, existing environmental organizations. Be specific and accurate in your recommendations.`;
  }

  /**
   * Build user prompt for NGO search
   */
  private buildNGOSearchPrompt(brief: string): string {
    return `Please analyze this campaign brief and recommend suitable environmental NGOs:

CAMPAIGN BRIEF:
${brief}

Please provide 5-10 NGOs that would be good matches for this campaign. Consider:
- Geographic alignment
- Focus area relevance
- Organizational capacity
- Partnership potential

Respond with JSON in this format:
{
  "ngos": [
    {
      "name": "Organization Name",
      "email": "contact@organization.org",
      "domain": "organization.org",
      "geography": "Geographic Scope",
      "focusAreas": ["focus area 1", "focus area 2"],
      "fitRationale": "Why this NGO fits the campaign",
      "partnerStatus": "potential",
      "riskScore": 2,
      "controversySummary": "Brief controversy summary or 'No major controversies'"
    }
  ]
}`;
  }

  /**
   * Parse JSON response from Grok
   */
  private parseJSONResponse(content: string): any {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Grok response");
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error("[Grok Search] JSON parsing error:", error);
      throw new Error("Failed to parse Grok response as JSON");
    }
  }

  /**
   * Convert Grok response to NGOProfile format
   */
  private convertToNGOProfiles(grokResponse: any): schemas.NGOProfile[] {
    if (!grokResponse.ngos || !Array.isArray(grokResponse.ngos)) {
      throw new Error("Invalid Grok response format");
    }

    return grokResponse.ngos.map((ngo: any, index: number) => {
      return {
        id: `grok-${index + 1}`,
        name: ngo.name || "Unknown NGO",
        email: ngo.email || "info@example.org",
        domain: ngo.domain || "example.org",
        geography: ngo.geography || "Global",
        focusAreas: Array.isArray(ngo.focusAreas) ? ngo.focusAreas : [],
        fitRationale: ngo.fitRationale || "Recommended by Grok AI",
        partnerStatus: ngo.partnerStatus || "potential",
        riskScore: typeof ngo.riskScore === "number" ? ngo.riskScore : 3,
        controversySummary:
          ngo.controversySummary || "No controversy information available",
        selectedForOutreach: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }
}
