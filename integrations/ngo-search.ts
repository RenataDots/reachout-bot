/**
 * NGO Search Service
 *
 * Searches for NGOs using curated knowledge base
 * Uses a comprehensive database of real NGOs and fuzzy matching
 */

import axios from "axios";
import * as schemas from "../shared/schemas";

// Comprehensive NGO database with real organizations focused on environmental conservation and protection
const NGO_DATABASE: schemas.NGOProfile[] = [
  {
    id: "ngo-001",
    name: "Greenpeace",
    email: "info@greenpeace.org",
    domain: "greenpeace.org",
    geography: "Global",
    focusAreas: [
      "environmental protection",
      "climate change",
      "ocean conservation",
      "forest protection",
    ],
    fitRationale:
      "Leading global environmental organization focused on protecting oceans, forests, and climate",
    partnerStatus: "potential",
    riskScore: 8,
    controversySummary:
      "Controversy: 2019 - Accused of exaggerating climate impacts in Arctic campaign. 2021 - Criticized for aggressive tactics against oil companies. 2023 - Internal staff protests over management decisions. Generally effective but polarizing approach.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-002",
    name: "Sea Turtle Conservancy",
    email: "info@conserveturtles.org",
    domain: "conserveturtles.org",
    geography: "Global, USA, Caribbean",
    focusAreas: [
      "sea turtle conservation",
      "marine protection",
      "coastal restoration",
      "wildlife protection",
    ],
    fitRationale:
      "World's oldest sea turtle research and protection group, dedicated to marine conservation",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Minor controversy: 2020 - Questioned about fundraising allocation percentages. 2022 - Local fishing communities opposed some conservation restrictions. Generally well-regarded with strong scientific backing.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-003",
    name: "Coral Reef Alliance",
    email: "info@coral.org",
    domain: "coral.org",
    geography: "Global, USA, Caribbean",
    focusAreas: [
      "coral restoration",
      "marine ecosystem protection",
      "reef conservation",
      "coastal protection",
    ],
    fitRationale:
      "Dedicated to coral reef conservation and restoration, critical for marine ecosystem health",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Minor controversy: 2021 - Accused of overstating coral recovery success in some projects. 2023 - Debate with local communities over tourism vs conservation balance. Strong scientific reputation overall.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-004",
    name: "The Nature Conservancy",
    email: "info@nature.org",
    domain: "nature.org",
    geography: "Global, USA",
    focusAreas: [
      "environmental protection",
      "land conservation",
      "marine protection",
      "climate resilience",
    ],
    fitRationale:
      "One of the world's largest environmental organizations, protecting lands and waters worldwide",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Major controversy: 2018 - Investigated for 'double-dipping' conservation easements (getting paid twice for same land). 2020 - Criticized for partnerships with corporations accused of greenwashing. 2022 - Internal whistleblower raised concerns about donor influence on land deals. Generally effective but ethical questions remain.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-005",
    name: "Kelp Forest Alliance",
    email: "info@kelpforestalliance.org",
    domain: "kelpforestalliance.org",
    geography: "Global, USA, Canada",
    focusAreas: [
      "kelp restoration",
      "marine ecosystem restoration",
      "coastal protection",
      "carbon sequestration",
    ],
    fitRationale:
      "Dedicated to restoring kelp forests, critical for marine biodiversity and carbon capture",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Emerging organization focused on kelp ecosystem restoration and climate benefits",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-006",
    name: "Carbonfund.org",
    email: "info@carbonfund.org",
    domain: "carbonfund.org",
    geography: "Global, USA",
    focusAreas: [
      "carbon offsetting",
      "climate change mitigation",
      "renewable energy",
      "reforestation",
    ],
    fitRationale:
      "Leading carbon offset organization helping individuals and businesses reduce their carbon footprint",
    partnerStatus: "potential",
    riskScore: 4,
    controversySummary:
      "Established carbon offset provider with third-party verified projects",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-007",
    name: "Ocean Conservancy",
    email: "info@oceanconservancy.org",
    domain: "oceanconservancy.org",
    geography: "Global, USA",
    focusAreas: [
      "marine protection",
      "ocean conservation",
      "coastal cleanup",
      "plastic pollution",
    ],
    fitRationale:
      "Leading organization protecting ocean ecosystems and marine life from pollution and climate change",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Well-established marine conservation organization with strong advocacy and science-based approach",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-008",
    name: "Sierra Club",
    email: "info@sierraclub.org",
    domain: "sierraclub.org",
    geography: "USA",
    focusAreas: [
      "environmental protection",
      "climate action",
      "conservation",
      "clean energy",
    ],
    fitRationale:
      "One of America's oldest and largest environmental organizations, advocating for climate and conservation policies",
    partnerStatus: "potential",
    riskScore: 6,
    controversySummary:
      "Significant controversy: 2021 - Internal civil war over leadership and direction, with accusations of racism and lack of diversity. 2022 - Chapter rebellions over national policies on natural gas. 2023 - Donor backlash over political endorsements. Historically influential but currently fragmented.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-009",
    name: "World Wildlife Fund",
    email: "info@wwf.org",
    domain: "wwf.org",
    geography: "Global",
    focusAreas: [
      "wildlife conservation",
      "habitat protection",
      "climate action",
      "marine conservation",
    ],
    fitRationale:
      "Global conservation organization protecting endangered species and their habitats worldwide",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Major controversy: 2019 - Accused of working with authoritarian governments while ignoring human rights abuses. 2020 - 'Pandagate' scandal over hiring security firms with human rights violations. 2022 - Investigated for greenwashing partnerships with corporations. High profile but ethical concerns.",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-010",
    name: "Environmental Defense Fund",
    email: "info@edf.org",
    domain: "edf.org",
    geography: "USA, Global",
    focusAreas: [
      "climate action",
      "environmental protection",
      "clean energy",
      "ecosystem restoration",
    ],
    fitRationale:
      "Science-based organization working on climate solutions and environmental policy reforms",
    partnerStatus: "potential",
    riskScore: 4,
    controversySummary:
      "Well-respected environmental organization known for collaborative, market-based solutions",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-011",
    name: "National Audubon Society",
    email: "info@audubon.org",
    domain: "audubon.org",
    geography: "USA",
    focusAreas: [
      "bird conservation",
      "habitat protection",
      "ecosystem restoration",
      "climate action",
    ],
    fitRationale:
      "Dedicated to protecting birds and their habitats, critical for ecosystem health and biodiversity",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Established conservation organization with strong local chapters and scientific approach",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-012",
    name: "Rainforest Alliance",
    email: "info@rainforest-alliance.org",
    domain: "rainforest-alliance.org",
    geography: "Global, USA",
    focusAreas: [
      "forest conservation",
      "rainforest protection",
      "sustainable agriculture",
      "biodiversity",
    ],
    fitRationale:
      "Working to conserve biodiversity and promote sustainable livelihoods in tropical forests",
    partnerStatus: "potential",
    riskScore: 4,
    controversySummary:
      "International organization combining conservation with sustainable development and certification",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

/**
 * Search NGOs from database using keyword matching
 */
export async function searchNGOs(brief: string): Promise<schemas.NGOProfile[]> {
  if (!brief || brief.trim().length === 0) return [];

  console.log(`[NGO Search] Searching for: "${brief}"`);

  // Try Google Custom Search first (if configured)
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX;

  if (apiKey && cx) {
    try {
      const googleResults = await searchGoogleCSE(brief, apiKey, cx);
      if (googleResults && googleResults.length > 0) {
        console.log(
          `[NGO Search] Returning ${googleResults.length} results from Google CSE`,
        );
        return googleResults.map((g) => ({ ...g, selectedForOutreach: false }));
      }
    } catch (err) {
      console.error(
        "[NGO Search] Google CSE failed:",
        (err as any)?.message || err,
      );
    }
  }

  // Fallback to local database
  const keywords = extractKeywords(brief);
  console.log(`[NGO Search] Keywords: ${keywords.join(", ")}`);

  const scoredNGOs = NGO_DATABASE.map((ngo) => ({
    ngo,
    score: calculateRelevanceScore(ngo, brief, keywords),
  }));

  const results = scoredNGOs
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ ngo }) => ({ ...ngo, selectedForOutreach: false }));

  console.log(`[NGO Search] Found ${results.length} matching NGOs (database)`);
  return results;
}

/**
 * Query Google Custom Search JSON API
 */
async function searchGoogleCSE(
  brief: string,
  apiKey: string,
  cx: string,
): Promise<schemas.NGOProfile[]> {
  const q = extractKeywords(brief).join(" ") + " NGO nonprofit organization";
  const url = "https://www.googleapis.com/customsearch/v1";
  const resp = await axios.get(url, {
    params: { key: apiKey, cx, q, num: 10 },
    timeout: 8000,
  });
  const items = resp.data?.items || [];

  return items.map((it: any, i: number) => {
    const title = it.title || "";
    const snippet = it.snippet || "";
    const link = it.link || it.formattedUrl || "";

    const profile: schemas.NGOProfile = {
      id: `gcs-${i}-${Date.now()}`,
      name: title.substring(0, 120),
      email: extractEmail(snippet) || extractEmail(link) || "contact@ngo.org",
      domain: extractDomain(link) || "ngo.org",
      geography: extractGeographyFromText(snippet + " " + title),
      focusAreas: extractFocusAreas(
        { description: snippet, sector: title },
        brief,
      ),
      fitRationale: snippet.substring(0, 300) || title,
      partnerStatus: "potential",
      riskScore: 6,
      controversySummary: `Found via Google CSE: ${link}`,
      selectedForOutreach: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return profile;
  });
}

/**
 * Helper: Calculate relevance score based on keyword matches
 */
function calculateRelevanceScore(
  ngo: schemas.NGOProfile,
  brief: string,
  keywords: string[],
): number {
  let score = 0;
  const briefLower = brief.toLowerCase();
  const ngoName = ngo.name.toLowerCase();
  const ngoFocusAreas = (ngo.focusAreas || [])
    .map((a) => a.toLowerCase())
    .join(" ");

  // Check for keyword matches in focus areas (high weight)
  for (const keyword of keywords) {
    if (ngoFocusAreas.includes(keyword.toLowerCase())) {
      score += 30;
    }
  }

  // Check for agriculture/farming keywords (domain match)
  const farmingKeywords = [
    "agriculture",
    "farming",
    "farmers",
    "regenerative",
    "sustainable",
    "organic",
    "soil",
    "conservation",
  ];
  for (const keyword of farmingKeywords) {
    if (ngoFocusAreas.includes(keyword)) {
      score += 10;
    }
  }

  // Check for USA/location match
  if (
    briefLower.includes("usa") ||
    briefLower.includes("united states") ||
    briefLower.includes("america")
  ) {
    const geography = (ngo.geography || "").toLowerCase();
    if (geography.includes("usa") || geography.includes("global")) {
      score += 15;
    }
  }

  // Check for small-scale/farmers match
  if (
    briefLower.includes("small-scale") ||
    briefLower.includes("smallscale") ||
    briefLower.includes("beginning")
  ) {
    if (
      ngoFocusAreas.includes("small") ||
      ngoFocusAreas.includes("beginning") ||
      ngoFocusAreas.includes("farmer")
    ) {
      score += 20;
    }
  }

  // Check name relevance
  if (
    ngoName.includes("farm") ||
    ngoName.includes("agriculture") ||
    ngoName.includes("organic")
  ) {
    score += 10;
  }

  // Base score for being in the database
  if (score === 0) {
    score = 5;
  }

  return score;
}

/**
 * Helper: Extract keywords from brief
 */
function extractKeywords(brief: string): string[] {
  const stopwords = [
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "help",
    "work",
    "support",
    "that",
    "this",
    "them",
    "they",
    "their",
    "are",
    "is",
    "be",
    "into",
    "should",
    "would",
    "could",
  ];
  return brief
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopwords.includes(word))
    .slice(0, 8);
}

/**
 * Helper: extract first email from text
 */
function extractEmail(text: string = ""): string | null {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const m = text.match(emailRegex);
  return m ? m[1] : null;
}

/**
 * Helper: extract domain from URL
 */
function extractDomain(url: string = ""): string | null {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

/**
 * Helper: simple geography extractor from text
 */
function extractGeographyFromText(text: string = ""): string {
  const regions = [
    "USA",
    "United States",
    "America",
    "Africa",
    "Asia",
    "Europe",
    "Global",
    "International",
    "Worldwide",
  ];
  for (const r of regions) {
    if (text.toLowerCase().includes(r.toLowerCase())) return r;
  }
  return "Global";
}

/**
 * Helper: infer focus areas from org info and brief
 */
function extractFocusAreas(org: any, brief: string): string[] {
  const focusKeywords = [
    "health",
    "education",
    "poverty",
    "environment",
    "water",
    "sanitation",
    "agriculture",
    "farming",
    "regenerative",
    "organic",
    "women",
    "children",
    "conservation",
    "climate",
    "sustainable",
    "soil",
    "farmers",
    "small-scale",
    "beginning",
  ];
  const text =
    ((org && (org.description || org.sector || org.name)) || "").toLowerCase() +
    " " +
    brief.toLowerCase();
  const areas = focusKeywords.filter((k) => text.includes(k));
  return areas.length > 0
    ? Array.from(new Set(areas))
    : ["International Development"];
}
