/**
 * Enhanced Geographic Service
 * Combines hierarchical local database with OpenStreetMap Nominatim API
 * Uses comprehensive geographic data with regions, aliases, ISO codes, and GeoNames IDs
 */

import * as fs from "fs";
import * as path from "path";

export interface LocationInfo {
  name: string;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  coordinates?: { lat: number; lng: number };
  administrativeLevel?: "country" | "state" | "district" | "city";
  confidence: number;
  source: "local" | "nominatim" | "un" | "partial";
}

export interface CachedResult {
  data: LocationInfo;
  timestamp: number;
  source: "local" | "nominatim" | "un" | "partial";
  accessCount: number;
}

// Enhanced nested geographic data structure
interface GeographicData {
  [region: string]: {
    [country: string]: {
      aliases: string[];
      iso2: string;
      iso3: string;
      m49: string;
      subdivisions: {
        [subdivisionType: string]: {
          [subdivisionName: string]: {
            iso3166_2: string;
            aliases: string[];
            cities: {
              [cityName: string]: {
                geoname_id: number;
                lat: number;
                lon: number;
                aliases: string[];
              };
            };
          };
        };
      };
    };
  };
}

export class GeographicService {
  private geographicData: GeographicData = {};
  private cache: Map<string, CachedResult> = new Map();
  private rateLimiter: { lastRequest: number; requestCount: number } = {
    lastRequest: 0,
    requestCount: 0,
  };
  private readonly RATE_LIMIT = 1000; // 1 second between requests
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly dbPath = path.join(
    process.cwd(),
    "data",
    "geographic-database.json",
  );
  private log: (message: string) => void;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
    this.loadDatabase();
  }

  /**
   * Load geographic database from JSON file
   */
  private async loadDatabase(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.dbPath, "utf8");
      this.geographicData = JSON.parse(data);
      const countryCount = Object.values(this.geographicData).reduce(
        (total, region) => total + Object.keys(region).length,
        0,
      );
      this.log(
        `[GeographicService] Loaded ${countryCount} countries from enhanced database`,
      );
    } catch (error) {
      this.log(
        "[GeographicService] No local database found, using fallback data...",
      );
      this.geographicData = await this.getFallbackData();
      await this.saveDatabase();
    }
  }

  /**
   * Save geographic database to JSON file
   */
  private async saveDatabase(): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.dbPath,
        JSON.stringify(this.geographicData, null, 2),
      );
      this.log("[GeographicService] Enhanced database saved to file");
    } catch (error) {
      this.log("[GeographicService] Error saving database: " + error);
    }
  }

  /**
   * Fallback data if database file doesn't exist
   */
  private async getFallbackData(): Promise<GeographicData> {
    return {
      "North America": {
        "United States": {
          aliases: ["USA", "US", "United States of America"],
          iso2: "US",
          iso3: "USA",
          m49: "840",
          subdivisions: {
            states: {
              California: {
                iso3166_2: "US-CA",
                aliases: ["CA"],
                cities: {
                  "Los Angeles": {
                    geoname_id: 5368361,
                    lat: 34.0522,
                    lon: -118.2437,
                    aliases: [],
                  },
                  "San Francisco": {
                    geoname_id: 5391959,
                    lat: 37.7749,
                    lon: -122.4194,
                    aliases: [],
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Find location in enhanced hierarchical geographic data
   */
  private findLocation(location: string): LocationInfo | null {
    const normalized = location.toLowerCase();

    // Search through all regions, countries, subdivisions, and cities
    for (const [regionName, region] of Object.entries(this.geographicData)) {
      for (const [countryName, countryData] of Object.entries(region)) {
        // Check if location matches country name or aliases
        if (
          this.matchesLocation(normalized, countryName, countryData.aliases)
        ) {
          return {
            name: location,
            country: this.capitalize(countryName),
            administrativeLevel: "country",
            confidence: 95,
            source: "local",
          };
        }

        // Search subdivisions and cities
        for (const [subdivisionType, subdivisions] of Object.entries(
          countryData.subdivisions,
        )) {
          for (const [subdivisionName, subdivisionData] of Object.entries(
            subdivisions,
          )) {
            // Check if location matches subdivision name or aliases
            if (
              this.matchesLocation(
                normalized,
                subdivisionName,
                subdivisionData.aliases,
              )
            ) {
              return {
                name: location,
                country: this.capitalize(countryName),
                state: this.capitalize(subdivisionName),
                administrativeLevel: "state",
                confidence: 90,
                source: "local",
              };
            }

            // Search cities
            for (const [cityName, cityData] of Object.entries(
              subdivisionData.cities,
            )) {
              if (
                this.matchesLocation(normalized, cityName, cityData.aliases)
              ) {
                return {
                  name: location,
                  city: this.capitalize(cityName),
                  state: this.capitalize(subdivisionName),
                  country: this.capitalize(countryName),
                  coordinates: { lat: cityData.lat, lng: cityData.lon },
                  administrativeLevel: "city",
                  confidence: 95,
                  source: "local",
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if location matches name or aliases
   */
  private matchesLocation(
    searchTerm: string,
    name: string,
    aliases: string[],
  ): boolean {
    if (name.toLowerCase() === searchTerm) {
      return true;
    }

    return aliases.some((alias) => alias.toLowerCase() === searchTerm);
  }

  /**
   * Capitalize first letter of each word
   */
  private capitalize(str: string): string {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  /**
   * Main location resolution method
   */
  async resolveLocation(location: string): Promise<LocationInfo | null> {
    const normalized = location.toLowerCase();

    // Check cache first
    const cached = this.cache.get(normalized);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      cached.accessCount++;
      this.log(`[GeographicService] Cache hit for: ${location}`);
      return cached.data;
    }

    // Check local database
    const localResult = this.findLocation(location);
    if (localResult) {
      this.cache.set(normalized, {
        data: localResult,
        timestamp: Date.now(),
        source: "local",
        accessCount: 1,
      });
      this.log(`[GeographicService] Enhanced database hit for: ${location}`);
      return localResult;
    }

    // Fallback to API
    try {
      const apiResult = await this.queryNominatim(location);
      if (apiResult) {
        this.cache.set(normalized, {
          data: apiResult,
          timestamp: Date.now(),
          source: "nominatim",
          accessCount: 1,
        });

        this.log(`[GeographicService] API result for: ${location}`);
        return apiResult;
      }
    } catch (error) {
      this.log(`[GeographicService] API error for ${location}: ${error}`);
    }

    return null;
  }

  /**
   * Query OpenStreetMap Nominatim API
   */
  private async queryNominatim(location: string): Promise<LocationInfo | null> {
    await this.rateLimit();

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ReachoutBot/1.0 (geographic-service@example.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = (await response.json()) as any[];

    if (data.length === 0) {
      return null;
    }

    const result = data[0];

    return {
      name: result.display_name.split(",")[0],
      country: result.address?.country,
      state: result.address?.state || result.address?.province,
      district: result.address?.county || result.address?.district,
      city:
        result.address?.city || result.address?.town || result.address?.village,
      coordinates: {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      },
      administrativeLevel: this.determineAdminLevel(result),
      confidence: this.calculateAPIConfidence(result),
      source: "nominatim",
    };
  }

  /**
   * Rate limiting for API calls
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimiter.lastRequest;

    if (timeSinceLastRequest < this.RATE_LIMIT) {
      const waitTime = this.RATE_LIMIT - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.rateLimiter.lastRequest = Date.now();
  }

  /**
   * Determine administrative level from Nominatim result
   */
  private determineAdminLevel(
    result: any,
  ): "country" | "state" | "district" | "city" {
    if (
      result.type === "country" ||
      (result.class === "boundary" &&
        result.type === "administrative" &&
        result.address?.country)
    ) {
      return "country";
    } else if (result.type === "state" || result.type === "province") {
      return "state";
    } else if (result.type === "county" || result.type === "district") {
      return "district";
    } else {
      return "city";
    }
  }

  /**
   * Calculate confidence score for API result
   */
  private calculateAPIConfidence(result: any): number {
    let confidence = 50; // Base confidence

    if (result.importance) {
      confidence += Math.round(result.importance * 30);
    }

    if (result.address?.country && result.address?.state) {
      confidence += 10;
    }

    if (result.type === "city" || result.type === "town") {
      confidence += 10;
    }

    return Math.min(confidence, 95);
  }

  /**
   * Extract locations from text
   */
  async extractLocations(text: string): Promise<LocationInfo[]> {
    const locationPhrases = this.extractLocationPhrases(text);
    const locations: LocationInfo[] = [];

    for (const phrase of locationPhrases) {
      const location = await this.resolveLocation(phrase);
      if (location) {
        locations.push(location);
      }
    }

    return locations;
  }

  /**
   * Extract potential location phrases from text
   */
  private extractLocationPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Simple regex patterns for location mentions
    const patterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:state|province|country|city|town)\b/gi,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:in|from|at|to)\b/gi,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
    ];

    patterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const cleanMatch = match
            .replace(
              /\s+(?:state|province|country|city|town|in|from|at|to)\s*$/i,
              "",
            )
            .trim();
          if (cleanMatch.length > 2 && !phrases.includes(cleanMatch)) {
            phrases.push(cleanMatch);
          }
        });
      }
    });

    return phrases;
  }
}
