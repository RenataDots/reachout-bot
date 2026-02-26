/**
 * Entity Extraction for Brief Analysis
 * Extracts organizations, locations, causes, activities, and metrics from brief text
 */

export interface BriefEntities {
  organizations: string[];      // Mentioned NGOs/companies
  locations: string[];          // Geographic references
  causes: string[];             // Environmental/social causes
  activities: string[];          // Specific actions needed
  metrics: string[];            // Numbers, targets, goals
}

export class EntityExtractor {
  private log: (message: string) => void;

  constructor(log: (message: string) => void = console.log) {
    this.log = log;
  }

  /**
   * Extract entities from brief text
   */
  extractEntities(text: string): BriefEntities {
    const organizations = this.extractOrganizations(text);
    const locations = this.extractLocations(text);
    const causes = this.extractCauses(text);
    const activities = this.extractActivities(text);
    const metrics = this.extractMetrics(text);

    const entities: BriefEntities = {
      organizations,
      locations,
      causes,
      activities,
      metrics
    };

    this.log(`[EntityExtractor] Extracted entities: ${JSON.stringify(entities)}`);
    return entities;
  }

  /**
   * Extract organization names
   */
  private extractOrganizations(text: string): string[] {
    // Common NGO indicators
    const orgIndicators = [
      'foundation', 'fund', 'society', 'association', 'institute', 'council',
      'alliance', 'coalition', 'network', 'organization', 'org', 'conservancy',
      'conservation', 'defense', 'defense fund', 'club', 'trust', 'initiative'
    ];

    // Known organizations (from our database)
    const knownOrgs = [
      'greenpeace', 'world wildlife fund', 'wwf', 'sierra club', 'nature conservancy',
      'ocean conservancy', 'environmental defense fund', 'audubon society',
      'rainforest alliance', 'carbonfund', 'kelp forest alliance', 'sea turtle conservancy',
      'coral reef alliance'
    ];

    const organizations: string[] = [];
    const words = text.toLowerCase().split(/\s+/);

    // Check for known organizations
    knownOrgs.forEach(org => {
      if (text.toLowerCase().includes(org)) {
        organizations.push(org);
      }
    });

    // Look for organization patterns
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (orgIndicators.some(indicator => word.includes(indicator))) {
        // Look for potential organization name before the indicator
        if (i > 0) {
          const potentialOrg = words[i - 1] + ' ' + word;
          organizations.push(potentialOrg);
        }
        organizations.push(word);
      }
    }

    return [...new Set(organizations)]; // Remove duplicates
  }

  /**
   * Extract geographic locations
   */
  private extractLocations(text: string): string[] {
    const locations: string[] = [];
    
    // Common geographic indicators
    const geoIndicators = [
      'city', 'state', 'country', 'nation', 'region', 'area', 'zone',
      'community', 'town', 'village', 'county', 'province', 'territory'
    ];

    // Continents and regions
    const regions = [
      'africa', 'asia', 'europe', 'north america', 'south america',
      'oceania', 'antarctica', 'middle east', 'latin america',
      'caribbean', 'pacific', 'atlantic', 'indian ocean'
    ];

    // Countries (major ones)
    const countries = [
      'usa', 'united states', 'canada', 'mexico', 'brazil', 'argentina',
      'uk', 'britain', 'france', 'germany', 'italy', 'spain', 'russia',
      'china', 'india', 'japan', 'australia', 'south africa', 'kenya'
    ];

    const lowerText = text.toLowerCase();

    // Add regions
    regions.forEach(region => {
      if (lowerText.includes(region)) {
        locations.push(region);
      }
    });

    // Add countries
    countries.forEach(country => {
      if (lowerText.includes(country)) {
        locations.push(country);
      }
    });

    // Look for geographic patterns
    geoIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        locations.push(indicator);
      }
    });

    // Extract capitalized words that might be places
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];
    capitalizedWords.forEach(word => {
      if (word.length > 3 && !this.isCommonWord(word)) {
        locations.push(word);
      }
    });

    return [...new Set(locations)];
  }

  /**
   * Extract causes and issues
   */
  private extractCauses(text: string): string[] {
    const causeCategories = {
      environmental: [
        'climate change', 'global warming', 'carbon emissions', 'renewable energy',
        'solar', 'wind', 'sustainability', 'conservation', 'biodiversity',
        'deforestation', 'reforestation', 'ocean', 'marine', 'coral reef',
        'pollution', 'plastic pollution', 'air pollution', 'water pollution',
        'endangered species', 'habitat loss', 'ecosystem', 'environment'
      ],
      social: [
        'education', 'health', 'healthcare', 'poverty', 'hunger', 'homelessness',
        'human rights', 'equality', 'justice', 'community development',
        'youth', 'children', 'elderly', 'disabilities', 'inclusion'
      ],
      economic: [
        'economic development', 'job creation', 'employment', 'training',
        'skills development', 'entrepreneurship', 'small business',
        'agriculture', 'farming', 'food security', 'water access'
      ]
    };

    const causes: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, causeList] of Object.entries(causeCategories)) {
      causeList.forEach(cause => {
        if (lowerText.includes(cause)) {
          causes.push(cause);
        }
      });
    }

    return [...new Set(causes)];
  }

  /**
   * Extract activities and actions
   */
  private extractActivities(text: string): string[] {
    const activityPatterns = {
      research: [
        'research', 'study', 'investigate', 'analyze', 'survey', 'monitor',
        'evaluate', 'assess', 'measure', 'track', 'observe', 'document'
      ],
      conservation: [
        'protect', 'conserve', 'preserve', 'restore', 'rehabilitate',
        'clean', 'cleanup', 'plant', 'grow', 'maintain', 'manage'
      ],
      education: [
        'teach', 'educate', 'train', 'inform', 'awareness', 'outreach',
        'workshop', 'seminar', 'campaign', 'advocate', 'promote'
      ],
      support: [
        'help', 'support', 'assist', 'provide', 'fund', 'donate',
        'volunteer', 'partner', 'collaborate', 'coordinate', 'organize'
      ]
    };

    const activities: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [category, patternList] of Object.entries(activityPatterns)) {
      patternList.forEach(pattern => {
        if (lowerText.includes(pattern)) {
          activities.push(pattern);
        }
      });
    }

    return [...new Set(activities)];
  }

  /**
   * Extract metrics and numbers
   */
  private extractMetrics(text: string): string[] {
    const metrics: string[] = [];

    // Extract numbers with context
    const numberPatterns = [
      /\b(\d+)\s*(acres|hectares|km|kilometers|miles|sq\s*km|square\s*kilometers)\b/gi,
      /\b(\d+)\s*(dollars|usd|\$|euros|pounds)\b/gi,
      /\b(\d+)\s*(people|volunteers|participants|members|staff)\b/gi,
      /\b(\d+)\s*(years|months|weeks|days)\b/gi,
      /\b(\d+)%\b/g,
      /\b(\d+)\s*(trees|species|animals|plants)\b/gi
    ];

    numberPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        metrics.push(...matches);
      }
    });

    // Extract standalone numbers that might be targets
    const standaloneNumbers = text.match(/\b\d{2,}\b/g) || [];
    standaloneNumbers.forEach(num => {
      if (parseInt(num) > 10) { // Only significant numbers
        metrics.push(num);
      }
    });

    // Extract metric-related keywords
    const metricKeywords = [
      'goal', 'target', 'objective', 'budget', 'funding', 'timeline',
      'deadline', 'milestone', 'kpi', 'metric', 'measure', 'outcome'
    ];

    const lowerText = text.toLowerCase();
    metricKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        metrics.push(keyword);
      }
    });

    return [...new Set(metrics)];
  }

  /**
   * Check if word is too common to be a location
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'The', 'This', 'That', 'These', 'Those', 'We', 'Our', 'They', 'Their',
      'Need', 'Looking', 'Seeking', 'Want', 'Like', 'Love', 'Best', 'Good',
      'New', 'Great', 'Amazing', 'Excellent', 'Perfect', 'Important'
    ];
    return commonWords.includes(word);
  }
}
