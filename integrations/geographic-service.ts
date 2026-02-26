/**
 * Hybrid Geographic Service
 * Combines local database with OpenStreetMap Nominatim API
 * Uses UN official data for country/subdivision reference
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

// Nested geographic data structure
interface GeographicData {
  [country: string]: {
    type: "country";
    code: string;
    coordinates?: { lat: number; lng: number };
    subdivisions: {
      [state: string]: {
        type: "state" | "province" | "territory" | "region";
        code: string;
        coordinates?: { lat: number; lng: number };
        cities?: {
          [city: string]: {
            type: "city";
            coordinates: { lat: number; lng: number };
          };
        };
        districts?: {
          [district: string]: {
            type: "district";
            coordinates: { lat: number; lng: number };
          };
        };
      };
    };
  };
}

// UN API response types
interface UNCountry {
  geoAreaCode: string;
  geoAreaName: string;
  parentCode?: string;
  type: string;
}

interface UNSubdivision {
  geoAreaCode: string;
  geoAreaName: string;
  parentCode: string;
  type: string;
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
      this.log(
        `[GeographicService] Loaded ${Object.keys(this.geographicData).length} countries from local database`,
      );
    } catch (error) {
      this.log(
        "[GeographicService] No local database found, fetching from UN services...",
      );
      await this.initializeFromUNData();
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
      this.log("[GeographicService] Database saved to file");
    } catch (error) {
      this.log("[GeographicService] Error saving database: " + error);
    }
  }

  /**
   * Initialize database from UN official data
   */
  private async initializeFromUNData(): Promise<void> {
    try {
      this.log("[GeographicService] Fetching data from UN services...");

      // Fetch UN M49 countries and subdivisions
      const unData = await this.fetchUNOfficialData();

      // Transform UN data to our nested structure
      this.geographicData = this.transformUNData(
        unData.countries,
        unData.subdivisions,
      );

      // Add major cities (not available from UN API)
      await this.addMajorCities();

      this.log(
        `[GeographicService] Initialized with ${Object.keys(this.geographicData).length} countries from UN data`,
      );
    } catch (error) {
      this.log(
        "[GeographicService] UN API error, using fallback data: " + error,
      );
      this.geographicData = await this.getFallbackData();
    }
  }

  /**
   * Fetch official geographic data from reliable APIs
   */
  private async fetchUNOfficialData(): Promise<{
    countries: UNCountry[];
    subdivisions: UNSubdivision[];
  }> {
    try {
      // Use REST Countries API for countries (more reliable than UN API)
      const countriesResponse = await fetch(
        "https://restcountries.com/v3.1/all?fields=name,cca2,cca3",
      );
      const countriesData = (await countriesResponse.json()) as any[];

      // Transform to our format
      const countries: UNCountry[] = countriesData.map((country) => ({
        geoAreaCode: country.cca2 || country.cca3,
        geoAreaName: country.name.common,
        type: "country",
      }));

      // For subdivisions, we'll use a more limited approach since UN API is not working
      const subdivisions: UNSubdivision[] = this.getMajorSubdivisions();

      this.log(
        `[GeographicService] Fetched ${countries.length} countries and ${subdivisions.length} subdivisions from APIs`,
      );

      return { countries, subdivisions };
    } catch (error) {
      this.log("[GeographicService] API error: " + error);
      throw error;
    }
  }

  /**
   * Get major subdivisions (since UN API is not available)
   */
  private getMajorSubdivisions(): UNSubdivision[] {
    return [
      // US States
      {
        geoAreaCode: "US-CA",
        geoAreaName: "California",
        parentCode: "US",
        type: "State",
      },
      {
        geoAreaCode: "US-TX",
        geoAreaName: "Texas",
        parentCode: "US",
        type: "State",
      },
      {
        geoAreaCode: "US-NY",
        geoAreaName: "New York",
        parentCode: "US",
        type: "State",
      },
      {
        geoAreaCode: "US-FL",
        geoAreaName: "Florida",
        parentCode: "US",
        type: "State",
      },
      {
        geoAreaCode: "US-WA",
        geoAreaName: "Washington",
        parentCode: "US",
        type: "State",
      },
      {
        geoAreaCode: "US-CO",
        geoAreaName: "Colorado",
        parentCode: "US",
        type: "State",
      },

      // Canadian Provinces
      {
        geoAreaCode: "CA-ON",
        geoAreaName: "Ontario",
        parentCode: "CA",
        type: "Province",
      },
      {
        geoAreaCode: "CA-QC",
        geoAreaName: "Quebec",
        parentCode: "CA",
        type: "Province",
      },
      {
        geoAreaCode: "CA-BC",
        geoAreaName: "British Columbia",
        parentCode: "CA",
        type: "Province",
      },
      {
        geoAreaCode: "CA-AB",
        geoAreaName: "Alberta",
        parentCode: "CA",
        type: "Province",
      },

      // Brazilian States
      {
        geoAreaCode: "BR-SP",
        geoAreaName: "São Paulo",
        parentCode: "BR",
        type: "State",
      },
      {
        geoAreaCode: "BR-RJ",
        geoAreaName: "Rio de Janeiro",
        parentCode: "BR",
        type: "State",
      },
      {
        geoAreaCode: "BR-AM",
        geoAreaName: "Amazonas",
        parentCode: "BR",
        type: "State",
      },
      {
        geoAreaCode: "BR-MT",
        geoAreaName: "Mato Grosso",
        parentCode: "BR",
        type: "State",
      },

      // UK Countries
      {
        geoAreaCode: "GB-ENG",
        geoAreaName: "England",
        parentCode: "GB",
        type: "Country",
      },
      {
        geoAreaCode: "GB-SCT",
        geoAreaName: "Scotland",
        parentCode: "GB",
        type: "Country",
      },
      {
        geoAreaCode: "GB-WLS",
        geoAreaName: "Wales",
        parentCode: "GB",
        type: "Country",
      },
      {
        geoAreaCode: "GB-NIR",
        geoAreaName: "Northern Ireland",
        parentCode: "GB",
        type: "Country",
      },

      // German States
      {
        geoAreaCode: "DE-BY",
        geoAreaName: "Bavaria",
        parentCode: "DE",
        type: "State",
      },
      {
        geoAreaCode: "DE-BE",
        geoAreaName: "Berlin",
        parentCode: "DE",
        type: "State",
      },

      // French Regions
      {
        geoAreaCode: "FR-IDF",
        geoAreaName: "Île-de-France",
        parentCode: "FR",
        type: "Region",
      },
      {
        geoAreaCode: "FR-PACA",
        geoAreaName: "Provence-Alpes-Côte d'Azur",
        parentCode: "FR",
        type: "Region",
      },

      // Australian States
      {
        geoAreaCode: "AU-NSW",
        geoAreaName: "New South Wales",
        parentCode: "AU",
        type: "State",
      },
      {
        geoAreaCode: "AU-VIC",
        geoAreaName: "Victoria",
        parentCode: "AU",
        type: "State",
      },
      {
        geoAreaCode: "AU-QLD",
        geoAreaName: "Queensland",
        parentCode: "AU",
        type: "State",
      },

      // Japanese Prefectures
      {
        geoAreaCode: "JP-13",
        geoAreaName: "Tokyo",
        parentCode: "JP",
        type: "Prefecture",
      },
      {
        geoAreaCode: "JP-27",
        geoAreaName: "Osaka",
        parentCode: "JP",
        type: "Prefecture",
      },

      // Chinese Provinces
      {
        geoAreaCode: "CN-GD",
        geoAreaName: "Guangdong",
        parentCode: "CN",
        type: "Province",
      },
      {
        geoAreaCode: "CN-BJ",
        geoAreaName: "Beijing",
        parentCode: "CN",
        type: "Municipality",
      },
      {
        geoAreaCode: "CN-SH",
        geoAreaName: "Shanghai",
        parentCode: "CN",
        type: "Municipality",
      },
      {
        geoAreaCode: "CN-SC",
        geoAreaName: "Sichuan",
        parentCode: "CN",
        type: "Province",
      },

      // Indian States
      {
        geoAreaCode: "IN-KA",
        geoAreaName: "Karnataka",
        parentCode: "IN",
        type: "State",
      },
      {
        geoAreaCode: "IN-MH",
        geoAreaName: "Maharashtra",
        parentCode: "IN",
        type: "State",
      },
      {
        geoAreaCode: "IN-TN",
        geoAreaName: "Tamil Nadu",
        parentCode: "IN",
        type: "State",
      },
    ];
  }

  /**
   * Transform UN data to our nested structure
   */
  private transformUNData(
    countries: UNCountry[],
    subdivisions: UNSubdivision[],
  ): GeographicData {
    const geographicData: GeographicData = {};

    // Process countries
    countries.forEach((country) => {
      const countryName = country.geoAreaName.toLowerCase();
      geographicData[countryName] = {
        type: "country",
        code: country.geoAreaCode,
        coordinates: this.getCountryCoordinates(country.geoAreaCode),
        subdivisions: {},
      };
    });

    // Process subdivisions
    subdivisions.forEach((subdivision) => {
      const subdivisionName = subdivision.geoAreaName.toLowerCase();
      const parentCountry = this.findParentCountry(
        subdivision.parentCode,
        countries,
      );

      if (parentCountry) {
        const countryName = parentCountry.geoAreaName.toLowerCase();
        if (geographicData[countryName]) {
          geographicData[countryName].subdivisions[subdivisionName] = {
            type: this.getSubdivisionType(subdivision.type),
            code: subdivision.geoAreaCode,
            coordinates: this.getSubdivisionCoordinates(
              subdivision.geoAreaCode,
            ),
            cities: {},
          };
        }
      }
    });

    return geographicData;
  }

  /**
   * Find parent country for a subdivision
   */
  private findParentCountry(
    parentCode: string,
    countries: UNCountry[],
  ): UNCountry | undefined {
    return countries.find((country) => country.geoAreaCode === parentCode);
  }

  /**
   * Get subdivision type from UN classification
   */
  private getSubdivisionType(
    unType: string,
  ): "state" | "province" | "territory" | "region" {
    const typeMap: {
      [key: string]: "state" | "province" | "territory" | "region";
    } = {
      State: "state",
      Province: "province",
      Territory: "territory",
      Region: "region",
      "Federal District": "state",
      "Autonomous Region": "region",
    };

    return typeMap[unType] || "state";
  }

  /**
   * Get country coordinates (fallback to major city if needed)
   */
  private getCountryCoordinates(
    countryCode: string,
  ): { lat: number; lng: number } | undefined {
    // Major country coordinates (could be expanded)
    const coordinates: { [key: string]: { lat: number; lng: number } } = {
      US: { lat: 39.8283, lng: -98.5795 },
      CA: { lat: 56.1304, lng: -106.3468 },
      BR: { lat: -14.235, lng: -51.9253 },
      GB: { lat: 55.3781, lng: -3.436 },
      DE: { lat: 51.1657, lng: 10.4515 },
      FR: { lat: 46.2276, lng: 2.2137 },
      IT: { lat: 41.8719, lng: 12.5674 },
      ES: { lat: 40.4637, lng: -3.7492 },
      RU: { lat: 61.524, lng: 105.3188 },
      CN: { lat: 35.8617, lng: 104.1954 },
      IN: { lat: 20.5937, lng: 78.9629 },
      JP: { lat: 36.2048, lng: 138.2529 },
      AU: { lat: -25.2744, lng: 133.7751 },
      MX: { lat: 23.6345, lng: -102.5528 },
      AR: { lat: -38.4161, lng: -63.6167 },
      ZA: { lat: -30.5595, lng: 22.9375 },
      EG: { lat: 26.8206, lng: 30.8025 },
      ID: { lat: -0.7893, lng: 113.9213 },
      TH: { lat: 15.87, lng: 100.9925 },
      PH: { lat: 12.8797, lng: 121.774 },
      NZ: { lat: -40.9006, lng: 174.886 },
      CL: { lat: -35.6751, lng: -71.543 },
      PE: { lat: -9.19, lng: -75.0152 },
      CO: { lat: 4.5709, lng: -74.2973 },
      KE: { lat: -0.0236, lng: 37.9062 },
      NG: { lat: 9.082, lng: 8.6753 },
      TR: { lat: 38.9637, lng: 35.2433 },
    };

    return coordinates[countryCode];
  }

  /**
   * Get subdivision coordinates (limited data)
   */
  private getSubdivisionCoordinates(
    subdivisionCode: string,
  ): { lat: number; lng: number } | undefined {
    // This would need to be expanded or fetched from another source
    // For now, return undefined and let API handle it
    return undefined;
  }

  /**
   * Add major cities (not available from UN API)
   */
  private async addMajorCities(): Promise<void> {
    // Add major cities to existing subdivisions
    const majorCities = {
      "united states": {
        california: {
          "los angeles": {
            type: "city" as const,
            coordinates: { lat: 34.0522, lng: -118.2437 },
          },
          "san francisco": {
            type: "city" as const,
            coordinates: { lat: 37.7749, lng: -122.4194 },
          },
          "san diego": {
            type: "city" as const,
            coordinates: { lat: 32.7157, lng: -117.1611 },
          },
          sacramento: {
            type: "city" as const,
            coordinates: { lat: 38.5816, lng: -121.4944 },
          },
          oakland: {
            type: "city" as const,
            coordinates: { lat: 37.8044, lng: -122.2712 },
          },
        },
        texas: {
          houston: {
            type: "city" as const,
            coordinates: { lat: 29.7604, lng: -95.3698 },
          },
          austin: {
            type: "city" as const,
            coordinates: { lat: 30.2672, lng: -97.7431 },
          },
          dallas: {
            type: "city" as const,
            coordinates: { lat: 32.7767, lng: -96.797 },
          },
        },
        "new york": {
          "new york": {
            type: "city" as const,
            coordinates: { lat: 40.7128, lng: -74.006 },
          },
        },
      },
      brazil: {
        "são paulo": {
          "são paulo": {
            type: "city" as const,
            coordinates: { lat: -23.5505, lng: -46.6333 },
          },
        },
      },
      canada: {
        ontario: {
          toronto: {
            type: "city" as const,
            coordinates: { lat: 43.6532, lng: -79.3832 },
          },
          ottawa: {
            type: "city" as const,
            coordinates: { lat: 45.4215, lng: -75.6972 },
          },
        },
      },
    };

    // Add cities to the geographic data
    Object.entries(majorCities).forEach(([country, states]) => {
      const countryKey = country.toLowerCase();
      if (this.geographicData[countryKey]) {
        Object.entries(states).forEach(([state, cities]) => {
          const stateKey = state.toLowerCase();
          if (this.geographicData[countryKey].subdivisions[stateKey]) {
            this.geographicData[countryKey].subdivisions[stateKey].cities =
              cities;
          }
        });
      }
    });
  }

  /**
   * Fallback data if UN API fails
   */
  private async getFallbackData(): Promise<GeographicData> {
    return {
      "united states": {
        type: "country",
        code: "US",
        coordinates: { lat: 39.8283, lng: -98.5795 },
        subdivisions: {
          california: {
            type: "state",
            code: "CA",
            coordinates: { lat: 36.7783, lng: -119.4179 },
            cities: {
              "los angeles": {
                type: "city",
                coordinates: { lat: 34.0522, lng: -118.2437 },
              },
              "san francisco": {
                type: "city",
                coordinates: { lat: 37.7749, lng: -122.4194 },
              },
              oakland: {
                type: "city",
                coordinates: { lat: 37.8044, lng: -122.2712 },
              },
            },
          },
          texas: {
            type: "state",
            code: "TX",
            coordinates: { lat: 31.9686, lng: -99.9018 },
            cities: {
              houston: {
                type: "city",
                coordinates: { lat: 29.7604, lng: -95.3698 },
              },
              austin: {
                type: "city",
                coordinates: { lat: 30.2672, lng: -97.7431 },
              },
            },
          },
        },
      },
      brazil: {
        type: "country",
        code: "BR",
        coordinates: { lat: -14.235, lng: -51.9253 },
        subdivisions: {
          "são paulo": {
            type: "state",
            code: "SP",
            coordinates: { lat: -23.5505, lng: -46.6333 },
            cities: {
              "são paulo": {
                type: "city",
                coordinates: { lat: -23.5505, lng: -46.6333 },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Find location in nested geographic data
   */
  private findLocation(location: string): LocationInfo | null {
    const normalized = location.toLowerCase();

    // Search cities first
    for (const [country, countryData] of Object.entries(this.geographicData)) {
      for (const [state, stateData] of Object.entries(
        countryData.subdivisions,
      )) {
        if (stateData.cities?.[normalized]) {
          const cityData = stateData.cities[normalized];
          return {
            name: location,
            city: location,
            state: this.capitalize(state),
            country: this.capitalize(country),
            coordinates: cityData.coordinates,
            administrativeLevel: "city",
            confidence: 95,
            source: "local",
          };
        }
      }
    }

    // Search states
    for (const [country, countryData] of Object.entries(this.geographicData)) {
      if (countryData.subdivisions[normalized]) {
        const stateData = countryData.subdivisions[normalized];
        return {
          name: location,
          state: location,
          country: this.capitalize(country),
          coordinates: stateData.coordinates,
          administrativeLevel: "state",
          confidence: 90,
          source: "local",
        };
      }
    }

    // Search countries
    if (this.geographicData[normalized]) {
      return {
        name: location,
        country: location,
        coordinates: this.geographicData[normalized].coordinates,
        administrativeLevel: "country",
        confidence: 95,
        source: "local",
      };
    }

    return null;
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
      this.log(`[GeographicService] Local database hit for: ${location}`);
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

        // Learn from API result if confidence is high
        if (apiResult.confidence >= 70) {
          await this.learnFromAPI(location, apiResult);
        }

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
   * Learn from API results to improve local database
   */
  private async learnFromAPI(
    location: string,
    apiResult: LocationInfo,
  ): Promise<void> {
    if (apiResult.confidence < 70) return;

    const normalized = location.toLowerCase();

    // Add to local database if it's a high-confidence result
    if (apiResult.country && !this.geographicData[normalized]) {
      // This is a new country - would need more sophisticated logic
      this.log(`[GeographicService] Learned new location: ${location}`);
    }
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
