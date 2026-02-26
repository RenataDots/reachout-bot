/**
 * Intent Recognition for Brief Analysis
 * Analyzes user intent, urgency, and timeline from brief text
 */

import { GeographicService, LocationInfo } from "./geographic-service";

export interface BriefIntent {
  primaryGoal: "funding" | "partnership" | "research" | "implementation";
  projectType:
    | "conservation"
    | "restoration"
    | "tree_planting"
    | "carbon_offset"
    | "research"
    | "protection"
    | "clean-up";
  environmentalDomain:
    | "marine"
    | "coastal"
    | "freshwater"
    | "forest"
    | "grassland"
    | "wetland"
    | "mountain"
    | "desert"
    | "arctic"
    | "urban"
    | "agricultural"
    | "pollution"
    | "climate"
    | "renewable";
  localization: {
    country?: string;
    state?: string;
    district?: string;
    city?: string;
    region?: string;
    coordinates?: string; // lat/lng if mentioned
    confidence: number; // 0-100 confidence in geographic detection
  };
  urgency: "low" | "medium" | "high" | "critical";
  timeline: "immediate" | "short-term" | "long-term" | "ongoing";
  confidence: number; // 0-100 confidence score
}

export class IntentAnalyzer {
  private log: (message: string) => void;
  private geographicService: GeographicService;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
    this.geographicService = new GeographicService(log);
  }

  /**
   * Analyze intent from brief text
   */
  async analyzeIntent(text: string): Promise<BriefIntent> {
    const lowerText = text.toLowerCase();

    const primaryGoal = this.extractPrimaryGoal(lowerText);
    const projectType = this.extractProjectType(lowerText);
    const environmentalDomain = this.extractEnvironmentalDomain(lowerText);
    const localization = await this.extractLocalization(text);
    const urgency = this.extractUrgency(lowerText);
    const timeline = this.extractTimeline(lowerText);
    const confidence = this.calculateConfidence(
      primaryGoal,
      urgency,
      timeline,
      lowerText,
    );

    const intent: BriefIntent = {
      primaryGoal,
      projectType,
      environmentalDomain,
      localization,
      urgency,
      timeline,
      confidence,
    };

    this.log(`[IntentAnalyzer] Detected intent: ${JSON.stringify(intent)}`);
    return intent;
  }

  /**
   * Extract localization information using GeographicService
   */
  private async extractLocalization(
    text: string,
  ): Promise<BriefIntent["localization"]> {
    const locations = await this.geographicService.extractLocations(text);

    if (locations.length === 0) {
      return { confidence: 0 };
    }

    // Use the highest confidence location
    const bestLocation = locations.reduce((best, current) =>
      current.confidence > best.confidence ? current : best,
    );

    const localization: BriefIntent["localization"] = {
      country: bestLocation.country,
      state: bestLocation.state,
      district: bestLocation.district,
      city: bestLocation.city,
      region: bestLocation.state, // Use state as region for now
      coordinates: bestLocation.coordinates
        ? `${bestLocation.coordinates.lat},${bestLocation.coordinates.lng}`
        : undefined,
      confidence: bestLocation.confidence,
    };

    this.log(
      `[IntentAnalyzer] Geographic localization: ${JSON.stringify(localization)}`,
    );
    return localization;
  }

  /**
   * Extract project type from text
   */
  private extractProjectType(text: string): BriefIntent["projectType"] {
    const projectPatterns = {
      conservation: [
        "protect",
        "preserve",
        "conserve",
        "safeguard",
        "habitat",
        "maintain",
      ],
      restoration: ["restore", "rehabilitate", "recover", "rebuild"],
      tree_planting: [
        "plant trees",
        "tree planting",
        "reforestation",
        "afforestation",
        "plant seedlings",
        "tree seedlings",
        "forest creation",
        "tree establishment",
        "saplings",
        "tree nursery",
        "planting program",
        "tree campaign",
      ],
      carbon_offset: [
        "carbon offset",
        "offsetting",
        "carbon credit",
        "carbon neutral",
        "net zero",
        "carbon negative",
        "sequestration",
        "carbon capture",
        "carbon storage",
        "carbon sink",
        "ghg reduction",
        "greenhouse gas",
        "co2 reduction",
        "carbon footprint",
        "carbon balancing",
      ],
      research: [
        "study",
        "measure",
        "monitor",
        "survey",
        "analyze",
        "data",
        "count",
      ],
      protection: [
        "guard",
        "defend",
        "secure",
        "patrol",
        "prevent",
        "anti-poaching",
      ],
      clean_up: [
        "clean",
        "cleanup",
        "remove",
        "clear",
        "collect",
        "dispose",
        "eliminate",
      ],
    };

    let maxScore = 0;
    let detectedType: BriefIntent["projectType"] = "conservation";

    for (const [type, patterns] of Object.entries(projectPatterns)) {
      const score = patterns.reduce((count, pattern) => {
        return count + (text.includes(pattern) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedType = type as BriefIntent["projectType"];
      }
    }

    return detectedType;
  }

  /**
   * Extract environmental domain from text
   */
  private extractEnvironmentalDomain(
    text: string,
  ): BriefIntent["environmentalDomain"] {
    const domainPatterns = {
      marine: [
        "ocean",
        "sea",
        "marine",
        "offshore",
        "deep sea",
        "open ocean",
        "pelagic",
        "coral reef",
        "seagrass",
        "kelp forest",
        "mangrove",
      ],
      coastal: [
        "coastal",
        "coastline",
        "shore",
        "beach",
        "intertidal",
        "estuary",
        "delta",
        "lagoon",
        "salt marsh",
        "mangrove",
        "coral coast",
      ],
      freshwater: [
        "river",
        "stream",
        "creek",
        "lake",
        "pond",
        "wetland",
        "marsh",
        "swamp",
        "bog",
        "fen",
        "riparian",
        "watershed",
        "aquatic",
      ],
      forest: [
        "forest",
        "woodland",
        "rainforest",
        "temperate forest",
        "boreal",
        "taiga",
        "jungle",
        "woodland",
        "tree",
        "canopy",
        "understory",
      ],
      grassland: [
        "grassland",
        "prairie",
        "savanna",
        "steppe",
        "meadow",
        "plain",
        "pasture",
        "rangeland",
        "grass",
        "herbland",
      ],
      wetland: [
        "wetland",
        "marsh",
        "swamp",
        "bog",
        "fen",
        "peatland",
        "mire",
        "moor",
        "vernal pool",
        "playa",
        "pocosin",
      ],
      mountain: [
        "mountain",
        "alpine",
        "mountainous",
        "high altitude",
        "peak",
        "summit",
        "ridge",
        "slope",
        "crevasses",
        "glacier",
      ],
      desert: [
        "desert",
        "arid",
        "dryland",
        "dune",
        "sahara",
        "xeric",
        "steppe",
        "wadi",
        "playa",
        "badlands",
      ],
      arctic: [
        "arctic",
        "polar",
        "tundra",
        "permafrost",
        "ice cap",
        "glacier",
        "ice sheet",
        "frozen",
        "subarctic",
        "boreal",
      ],
      urban: [
        "urban",
        "city",
        "metropolitan",
        "suburban",
        "industrial",
        "brownfield",
        "greenfield",
        "built environment",
        "infrastructure",
      ],
      agricultural: [
        "farm",
        "agriculture",
        "cropland",
        "farmland",
        "ranch",
        "pasture",
        "orchard",
        "vineyard",
        "agricultural",
        "rural",
      ],
      pollution: [
        "pollution",
        "contaminated",
        "toxic",
        "hazardous",
        "waste",
        "superfund",
        "brownfield",
        "industrial waste",
        "chemical spill",
      ],
      climate: [
        "climate",
        "carbon",
        "emissions",
        "greenhouse",
        "sequestration",
        "mitigation",
        "adaptation",
        "weather",
        "atmospheric",
      ],
      renewable: [
        "renewable",
        "solar",
        "wind",
        "geothermal",
        "hydroelectric",
        "biomass",
        "clean energy",
        "sustainable energy",
      ],
    };

    let maxScore = 0;
    let detectedDomain: BriefIntent["environmentalDomain"] = "forest";

    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      const score = patterns.reduce((count, pattern) => {
        return count + (text.includes(pattern) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedDomain = domain as BriefIntent["environmentalDomain"];
      }
    }

    return detectedDomain;
  }

  /**
   * Extract primary goal from text
   */
  private extractPrimaryGoal(text: string): BriefIntent["primaryGoal"] {
    const goalPatterns = {
      partnership: [
        "partner",
        "collaborate",
        "collaboration",
        "cooperation",
        "joint",
        "alliance",
        "work together",
        "team up",
        "join forces",
        "partnership",
        "cooperative",
      ],
      funding: [
        "fund",
        "funding",
        "donate",
        "donation",
        "grant",
        "investment",
        "sponsor",
        "financial support",
        "money",
        "budget",
        "resources",
        "capital",
      ],
      research: [
        "research",
        "study",
        "investigate",
        "analyze",
        "data",
        "survey",
        "monitor",
        "evaluate",
        "assessment",
        "scientific",
        "academic",
      ],
      implementation: [
        "implement",
        "execute",
        "carry out",
        "deploy",
        "install",
        "build",
        "create",
        "establish",
        "set up",
        "launch",
        "run",
        "operate",
      ],
    };

    let maxScore = 0;
    let detectedGoal: BriefIntent["primaryGoal"] = "partnership";

    for (const [goal, patterns] of Object.entries(goalPatterns)) {
      const score = patterns.reduce((count, pattern) => {
        return count + (text.includes(pattern) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedGoal = goal as BriefIntent["primaryGoal"];
      }
    }

    return detectedGoal;
  }

  /**
   * Extract urgency level from text
   */
  private extractUrgency(text: string): BriefIntent["urgency"] {
    const urgencyPatterns = {
      critical: [
        "urgent",
        "emergency",
        "crisis",
        "critical",
        "asap",
        "immediately",
        "right away",
      ],
      high: [
        "soon",
        "quickly",
        "promptly",
        "high priority",
        "important",
        "need",
      ],
      medium: [
        "in the near future",
        "coming weeks",
        "next month",
        "relatively soon",
      ],
      low: ["when possible", "eventually", "in time", "no rush", "flexible"],
    };

    for (const [level, patterns] of Object.entries(urgencyPatterns)) {
      if (patterns.some((pattern) => text.includes(pattern))) {
        return level as BriefIntent["urgency"];
      }
    }

    return "medium"; // default
  }

  /**
   * Extract timeline from text
   */
  private extractTimeline(text: string): BriefIntent["timeline"] {
    const timelinePatterns = {
      immediate: ["immediately", "right now", "today", "asap", "urgent"],
      "short-term": ["week", "weeks", "month", "months", "short term", "soon"],
      "long-term": [
        "year",
        "years",
        "long term",
        "ongoing",
        "permanent",
        "sustainable",
      ],
      ongoing: ["ongoing", "continuous", "regular", "recurring", "permanent"],
    };

    for (const [timeline, patterns] of Object.entries(timelinePatterns)) {
      if (patterns.some((pattern) => text.includes(pattern))) {
        return timeline as BriefIntent["timeline"];
      }
    }

    return "short-term"; // default
  }

  /**
   * Calculate confidence score for intent detection
   */
  private calculateConfidence(
    primaryGoal: BriefIntent["primaryGoal"],
    urgency: BriefIntent["urgency"],
    timeline: BriefIntent["timeline"],
    text: string,
  ): number {
    let confidence = 50; // base confidence

    // Increase confidence based on text length and clarity
    if (text.length > 50) confidence += 10;
    if (text.length > 150) confidence += 10;

    // Increase confidence if specific indicators are found
    const specificIndicators = [
      "partner",
      "fund",
      "volunteer",
      "advocate",
      "research",
      "urgent",
      "local",
      "global",
      "immediate",
      "ongoing",
    ];

    const indicatorCount = specificIndicators.filter((indicator) =>
      text.includes(indicator),
    ).length;

    confidence += Math.min(indicatorCount * 5, 20);

    // Bonus for structured text
    if (text.includes(".") && text.split(".").length > 2) confidence += 5;
    if (text.match(/\d+/)) confidence += 5; // contains numbers

    return Math.min(confidence, 100);
  }
}
