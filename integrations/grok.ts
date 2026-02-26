/**
 * Grok AI Integration Service
 *
 * Provides NGO search and analysis using xAI's Grok API
 */

import axios from "axios";
import * as dotenv from "dotenv";
import * as schemas from "../shared/schemas";
import * as path from "path";

// Load environment variables from .env file
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

// Debug: Check if environment variables are loaded
console.log("[GrokService Debug] Environment variables loaded:");
console.log("[GrokService Debug] Env path:", envPath);
console.log(
  "[GrokService Debug] XAI_API_KEY exists:",
  !!process.env.XAI_API_KEY,
);
console.log(
  "[GrokService Debug] XAI_API_KEY length:",
  process.env.XAI_API_KEY?.length || 0,
);
console.log(
  "[GrokService Debug] XAI_API_KEY preview:",
  process.env.XAI_API_KEY?.substring(0, 10) + "...",
);

export interface GrokNGOSearchResult {
  success: boolean;
  ngos?: schemas.NGOProfile[];
  error?: string;
  totalFound?: number;
  searchQuery?: string;
}

export interface GrokNGOAnalysis {
  name: string;
  description: string;
  email?: string;
  website?: string;
  focusAreas: string[];
  geography: string;
  relevanceScore: number;
  reasoning: string;
}

export class GrokService {
  private apiKey: string;
  private baseURL: string;
  private model: string;
  private logger: (msg: string, level?: "info" | "warn" | "error") => void;

  constructor(
    logger?: (msg: string, level?: "info" | "warn" | "error") => void,
  ) {
    this.logger = logger || console.log;
    this.apiKey = process.env.XAI_API_KEY || "";
    this.baseURL = "https://api.x.ai/v1";
    this.model = "grok-4"; // Using grok-4 as specified in your example

    if (!this.apiKey) {
      this.logger(
        "[GrokService] XAI_API_KEY not found in environment",
        "error",
      );
    } else {
      this.logger("[GrokService] API key loaded successfully");
    }
  }

  async initialize(): Promise<boolean> {
    try {
      this.logger("[GrokService] Initializing Grok connection...");

      if (!this.apiKey) {
        this.logger(
          "[GrokService] Missing XAI_API_KEY in environment",
          "error",
        );
        return false;
      }

      // Test connection with a simple request
      const testResponse = await this.makeRequest([
        {
          role: "user",
          content:
            "Hello, can you confirm you're working? Just respond with 'Grok is ready'.",
        },
      ]);

      this.logger(`[GrokService] Test response: "${testResponse}"`);

      if (testResponse && testResponse.includes("Grok is ready")) {
        this.logger("[GrokService] Successfully connected to Grok API");
        return true;
      }

      this.logger(
        "[GrokService] Test response did not contain expected text",
        "warn",
      );
      return false;
    } catch (error) {
      this.logger(
        `[GrokService] Initialization failed: ${(error as Error).message}`,
        "error",
      );
      return false;
    }
  }

  async searchNGOs(
    campaign: schemas.OutreachCampaign,
    searchCriteria?: {
      geography?: string;
      focusAreas?: string[];
      organizationSize?: string;
    },
  ): Promise<GrokNGOSearchResult> {
    try {
      this.logger(
        `[GrokService] Searching for NGOs with criteria: ${campaign.name}`,
      );

      const searchPrompt = this.buildNGOSearchPrompt(campaign, searchCriteria);

      const response = await this.makeRequest([
        {
          role: "system",
          content: `You are an expert NGO researcher and analyst. Your task is to find NGOs that match specific campaign requirements. 

Search for real, existing NGOs that would be good matches for the campaign. Use your web search capabilities to find current information about these organizations.

For each NGO, provide:
- Name (exact official name)
- Brief description of their work
- Contact email if available
- Website URL
- Main focus areas (3-5 key areas)
- Geographic scope/operations
- Relevance score (0-100) for this specific campaign
- Brief reasoning for the match

Return results in JSON format with an array of NGOs. Focus on quality over quantity - 5-10 highly relevant NGOs is better than 50 marginal ones.`,
        },
        {
          role: "user",
          content: searchPrompt,
        },
      ]);

      // Parse the response to extract NGO data
      const ngos = this.parseNGOResponse(response);

      this.logger(
        `[GrokService] Found ${ngos.length} NGOs for campaign: ${campaign.name}`,
      );

      return {
        success: true,
        ngos: ngos,
        totalFound: ngos.length,
        searchQuery: searchPrompt,
      };
    } catch (error) {
      this.logger(
        `[GrokService] NGO search failed: ${(error as Error).message}`,
        "error",
      );
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private buildNGOSearchPrompt(
    campaign: schemas.OutreachCampaign,
    criteria?: {
      geography?: string;
      focusAreas?: string[];
      organizationSize?: string;
    },
  ): string {
    let prompt = `Find NGOs that would be excellent matches for this outreach campaign:

CAMPAIGN DETAILS:
- Name: ${campaign.name}
- Description: ${campaign.description}
- Stage: ${campaign.stage}
- Target NGOs Count: ${campaign.targetNGOs.length} NGOs already identified`;

    if (criteria) {
      prompt += `\n\nSEARCH CRITERIA:`;
      if (criteria.geography) {
        prompt += `\n- Geographic Focus: ${criteria.geography}`;
      }
      if (criteria.focusAreas && criteria.focusAreas.length > 0) {
        prompt += `\n- Focus Areas: ${criteria.focusAreas.join(", ")}`;
      }
      if (criteria.organizationSize) {
        prompt += `\n- Organization Size Preference: ${criteria.organizationSize}`;
      }
    }

    prompt += `\n\nPlease search for and analyze NGOs that would be strong candidates for partnership or collaboration on this campaign. Focus on organizations whose mission and work align closely with the campaign goals.`;

    return prompt;
  }

  private parseNGOResponse(response: string): schemas.NGOProfile[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        this.logger("[GrokService] No JSON array found in response", "warn");
        return [];
      }

      const ngoData = JSON.parse(jsonMatch[0]);

      // Convert Grok response to NGOProfile format
      return ngoData.map(
        (ngo: GrokNGOAnalysis, index: number): schemas.NGOProfile => ({
          id: `grok-ngo-${index + 1}`,
          name: ngo.name,
          email:
            ngo.email ||
            `contact@${ngo.website?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "example.org"}`,
          domain:
            ngo.website?.replace(/^https?:\/\//, "").replace(/\/$/, "") ||
            "unknown.org",
          geography: ngo.geography,
          focusAreas: ngo.focusAreas.slice(0, 5), // Limit to 5 focus areas
          fitRationale: ngo.reasoning, // Use reasoning as fit rationale
          selectedForOutreach: false, // Default to false, user can select later
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      this.logger(
        `[GrokService] Failed to parse NGO response: ${(error as Error).message}`,
        "error",
      );
      return [];
    }
  }

  private async makeRequest(messages: any[]): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseURL}/responses`,
        {
          input: messages,
          model: this.model,
          stream: false,
          temperature: 0.7,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 60000, // 60 second timeout
        },
      );

      if (response.data && response.data.output) {
        return response.data.output;
      }

      throw new Error("No response from Grok API");
    } catch (error) {
      this.logger(
        `[GrokService] API request failed: ${(error as Error).message}`,
        "error",
      );
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger("[GrokService] Testing Grok API connection...");

      const response = await this.makeRequest([
        {
          role: "user",
          content: "What is 2 + 2? Just give the number.",
        },
      ]);

      if (response && response.includes("4")) {
        this.logger("[GrokService] Connection test successful");
        return true;
      }

      return false;
    } catch (error) {
      this.logger(
        `[GrokService] Connection test failed: ${(error as Error).message}`,
        "error",
      );
      return false;
    }
  }
}
