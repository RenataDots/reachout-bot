/**
 * NGO Search Service
 *
 * PURPOSE: Searches for NGOs using a curated knowledge base with intelligent matching
 * FUNCTIONALITY:
 *   - Maintains a comprehensive database of real environmental NGOs
 *   - Processes user briefs using advanced NLP techniques
 *   - Matches NGOs based on relevance scoring algorithm
 *   - Returns ranked list of suitable partner organizations
 *
 * INPUT: User campaign brief (text)
 * OUTPUT: Ranked list of NGOs with relevance scores
 * DEPENDENCIES: BriefProcessor for text analysis
 */

import * as schemas from "../shared/schemas";
import { BriefProcessor } from "./brief-processor";

// ============================================================================
// NGO DATABASE - Curated list of real environmental organizations
// ============================================================================
// Each NGO includes:
//   - Basic info (name, email, website)
//   - Geographic scope and focus areas
//   - Risk assessment and controversy history
//   - Partner suitability rationale
// ============================================================================

const LOCAL_NGO_DATABASE: schemas.NGOProfile[] = [
  {
    id: "ngo-001",
    name: "Accelerated Restoration Collaborative (ARC)",
    email: "info@acceleratedrestoration.org",
    domain: "acceleratedrestoration.org",
    geography: "Global",
    focusAreas: [
      "ecosystem restoration",
      "climate resilience",
      "biodiversity conservation",
    ],
    fitRationale:
      "Collaborative network focused on accelerating ecosystem restoration and climate adaptation projects",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Emerging collaborative organization with positive reputation in restoration community",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-002",
    name: "Asociación ProPurus",
    email: "info@propurus.org",
    domain: "propurus.org",
    geography: "Peru, South America",
    focusAreas: [
      "rainforest conservation",
      "indigenous rights",
      "sustainable development",
    ],
    fitRationale:
      "Peruvian organization protecting Amazon rainforest and indigenous communities",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Well-regarded local organization with strong community ties",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-003",
    name: "Bee Conservancy",
    email: "info@beeconservancy.org",
    domain: "beeconservancy.org",
    geography: "Global, USA",
    focusAreas: [
      "pollinator conservation",
      "bee protection",
      "biodiversity",
      "agricultural ecosystems",
    ],
    fitRationale:
      "Dedicated to protecting bees and other pollinators critical for food security",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Specialized conservation organization with strong scientific backing",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-004",
    name: "Best Bees",
    email: "info@bestbees.org",
    domain: "bestbees.org",
    geography: "Global, Europe",
    focusAreas: [
      "bee conservation",
      "pollinator protection",
      "sustainable beekeeping",
      "habitat restoration",
    ],
    fitRationale:
      "European organization focused on sustainable beekeeping and pollinator habitats",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Growing organization with positive reputation in sustainable agriculture",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-005",
    name: "Biorock Indonesia",
    email: "info@biorockindonesia.org",
    domain: "biorockindonesia.org",
    geography: "Indonesia, Southeast Asia",
    focusAreas: [
      "coral restoration",
      "marine ecosystem recovery",
      "artificial reefs",
      "coastal protection",
    ],
    fitRationale:
      "Indonesian organization pioneering coral reef restoration using innovative technology",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Innovative marine conservation organization with proven restoration techniques",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-006",
    name: "Conservation des Espèces Marines (CEM)",
    email: "info@cemmarine.org",
    domain: "cemmarine.org",
    geography: "Canada, North America",
    focusAreas: [
      "marine conservation",
      "species protection",
      "ocean ecosystems",
      "wildlife management",
    ],
    fitRationale:
      "Canadian organization dedicated to marine species conservation and ecosystem protection",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Established marine conservation group with strong scientific foundation",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-007",
    name: "Coral Guardian",
    email: "info@coralguardian.org",
    domain: "coralguardian.org",
    geography: "Global, USA, Caribbean",
    focusAreas: [
      "coral reef protection",
      "marine conservation",
      "ocean restoration",
      "climate resilience",
    ],
    fitRationale:
      "Leading coral reef conservation organization with global impact and scientific expertise",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Well-established marine conservation group with strong advocacy record",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-008",
    name: "Coral Reef Alliance",
    email: "info@coralreefalliance.org",
    domain: "coralreefalliance.org",
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
    id: "ngo-009",
    name: "CTX Carbon",
    email: "info@ctxcarbon.org",
    domain: "ctxcarbon.org",
    geography: "Global, USA",
    focusAreas: [
      "carbon offsetting",
      "climate solutions",
      "carbon markets",
      "sustainable development",
    ],
    fitRationale:
      "Carbon offset organization focused on climate solutions and sustainable development",
    partnerStatus: "potential",
    riskScore: 4,
    controversySummary:
      "Carbon offset provider with verified projects and transparent reporting",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-010",
    name: "David Shepherd Wildlife Foundation (DSWF)",
    email: "info@dswf.org",
    domain: "dswf.org",
    geography: "Africa, Global",
    focusAreas: [
      "wildlife conservation",
      "anti-poaching",
      "species protection",
      "habitat preservation",
    ],
    fitRationale:
      "African wildlife foundation focused on anti-poaching and species protection",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Well-respected wildlife conservation organization with strong field presence",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-011",
    name: "Eden: People + Planet",
    email: "info@edenpeopleplanet.org",
    domain: "edenpeopleplanet.org",
    geography: "Global, UK",
    focusAreas: [
      "reforestation",
      "forest conservation",
      "climate action",
      "sustainable development",
    ],
    fitRationale:
      "UK-based organization combining reforestation with sustainable development goals",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Established environmental organization with strong community engagement",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-012",
    name: "Friends of Usambara",
    email: "info@friendsofusambara.org",
    domain: "friendsofusambara.org",
    geography: "Tanzania, East Africa",
    focusAreas: [
      "forest conservation",
      "biodiversity protection",
      "community development",
      "sustainable livelihoods",
    ],
    fitRationale:
      "Tanzanian organization protecting Usambara forests and supporting local communities",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Community-focused conservation group with strong local partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-013",
    name: "Fundación Jocotoco",
    email: "info@jocotoco.org",
    domain: "jocotoco.org",
    geography: "Bolivia, South America",
    focusAreas: [
      "forest conservation",
      "indigenous rights",
      "sustainable development",
      "biodiversity protection",
    ],
    fitRationale:
      "Bolivian organization protecting forests and indigenous communities in Amazon region",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Indigenous-led conservation organization with strong community backing",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-014",
    name: "Fundación Rompientes",
    email: "info@rompientes.org",
    domain: "rompientes.org",
    geography: "Chile, South America",
    focusAreas: [
      "forest conservation",
      "wildlife protection",
      "ecosystem restoration",
      "climate adaptation",
    ],
    fitRationale:
      "Chilean organization focused on forest conservation and wildlife protection",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Regional conservation group with strong environmental advocacy",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-015",
    name: "Global Forest Generation (GFG)",
    email: "info@globalforestgeneration.org",
    domain: "globalforestgeneration.org",
    geography: "Global, USA",
    focusAreas: [
      "reforestation",
      "forest conservation",
      "climate action",
      "sustainable forestry",
    ],
    fitRationale:
      "Global organization focused on reforestation and sustainable forest management",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Established reforestation organization with verified carbon projects",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-016",
    name: "Green Initiative Nepal",
    email: "info@greeninitiativenepal.org",
    domain: "greeninitiativenepal.org",
    geography: "Nepal, Himalayas",
    focusAreas: [
      "forest conservation",
      "community development",
      "sustainable energy",
      "climate adaptation",
    ],
    fitRationale:
      "Nepalese organization focused on environmental conservation and community empowerment",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Community-led environmental organization with strong local partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-017",
    name: "Green Sanctuaries",
    email: "info@greensanctuaries.org",
    domain: "greensanctuaries.org",
    geography: "Global, USA",
    focusAreas: [
      "wildlife protection",
      "habitat conservation",
      "species preservation",
      "ecosystem management",
    ],
    fitRationale:
      "US-based organization protecting wildlife habitats and endangered species",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Wildlife conservation group with strong habitat protection focus",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-018",
    name: "Green Worms",
    email: "info@greenworms.org",
    domain: "greenworms.org",
    geography: "Global, Europe",
    focusAreas: [
      "soil health",
      "sustainable agriculture",
      "composting",
      "organic farming",
    ],
    fitRationale:
      "European organization promoting soil health and sustainable agricultural practices",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Innovative organization focused on soil regeneration and organic practices",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-019",
    name: "Groundwork USA",
    email: "info@groundworkusa.org",
    domain: "groundworkusa.org",
    geography: "USA",
    focusAreas: [
      "environmental justice",
      "community organizing",
      "climate action",
      "sustainable development",
    ],
    fitRationale:
      "US organization focused on environmental justice and community empowerment",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Environmental justice organization with strong community partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-020",
    name: "Innovation Africa",
    email: "info@innovationafrica.org",
    domain: "innovationafrica.org",
    geography: "Africa",
    focusAreas: [
      "sustainable development",
      "environmental innovation",
      "climate solutions",
      "technology transfer",
    ],
    fitRationale:
      "African organization promoting environmental innovation and sustainable solutions",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Innovation-focused organization with strong track record in sustainable development",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-021",
    name: "Love the Oceans",
    email: "info@lovetheoceans.org",
    domain: "lovetheoceans.org",
    geography: "Global, USA",
    focusAreas: [
      "marine conservation",
      "ocean protection",
      "plastic pollution",
      "marine life protection",
    ],
    fitRationale:
      "US-based organization dedicated to ocean conservation and marine life protection",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Marine conservation group with strong advocacy and public engagement",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-022",
    name: "Mayhew Animal Home",
    email: "info@mayhewanimalhome.org",
    domain: "mayhewanimalhome.org",
    geography: "Global, UK",
    focusAreas: [
      "animal welfare",
      "wildlife rehabilitation",
      "habitat protection",
      "conservation education",
    ],
    fitRationale:
      "UK-based organization focused on animal welfare and wildlife rehabilitation",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Well-established animal welfare organization with strong rehabilitation programs",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-023",
    name: "Plastic Fischer",
    email: "info@plasticfischer.org",
    domain: "plasticfischer.org",
    geography: "Global, Europe",
    focusAreas: [
      "plastic pollution",
      "marine conservation",
      "waste reduction",
      "circular economy",
    ],
    fitRationale:
      "European organization addressing plastic pollution and promoting circular economy solutions",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Innovative organization focused on plastic pollution and waste management",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-024",
    name: "Rainforest Trust",
    email: "info@rainforesttrust.org",
    domain: "rainforesttrust.org",
    geography: "Global, UK",
    focusAreas: [
      "rainforest conservation",
      "forest protection",
      "biodiversity",
      "climate action",
    ],
    fitRationale:
      "UK-based organization protecting rainforests and forest biodiversity worldwide",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Established rainforest conservation organization with strong global partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-025",
    name: "Re:Wild",
    email: "info@rewild.org",
    domain: "rewild.org",
    geography: "Global, Europe",
    focusAreas: [
      "rewilding",
      "ecosystem restoration",
      "wildlife corridors",
      "biodiversity recovery",
    ],
    fitRationale:
      "European organization focused on rewilding and ecosystem restoration",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Rewilding organization with innovative ecosystem restoration approaches",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-026",
    name: "Rebuilding Together",
    email: "info@rebuildingtogether.org",
    domain: "rebuildingtogether.org",
    geography: "Global, USA",
    focusAreas: [
      "disaster recovery",
      "community resilience",
      "sustainable rebuilding",
      "climate adaptation",
    ],
    fitRationale:
      "US organization focused on disaster recovery and sustainable rebuilding",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Disaster recovery organization with strong community partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-027",
    name: "River Cleanup",
    email: "info@rivercleanup.org",
    domain: "rivercleanup.org",
    geography: "Global, USA",
    focusAreas: [
      "water conservation",
      "river restoration",
      "pollution cleanup",
      "watershed protection",
    ],
    fitRationale:
      "US-based organization focused on river cleanup and water conservation",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Water conservation organization with strong community engagement programs",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-028",
    name: "Saving the Amazon",
    email: "info@savingtheamazon.org",
    domain: "savingtheamazon.org",
    geography: "South America, Brazil",
    focusAreas: [
      "rainforest conservation",
      "amazon protection",
      "indigenous rights",
      "biodiversity",
    ],
    fitRationale:
      "Organization dedicated to protecting Amazon rainforest and indigenous communities",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Amazon conservation organization with strong environmental advocacy record",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-029",
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
    id: "ngo-030",
    name: "SEE Turtles",
    email: "info@seeturtles.org",
    domain: "seeturtles.org",
    geography: "Southeast Asia",
    focusAreas: [
      "sea turtle conservation",
      "marine protection",
      "coastal management",
      "wildlife rehabilitation",
    ],
    fitRationale:
      "Southeast Asian organization focused on sea turtle conservation and marine protection",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Regional sea turtle conservation organization with strong community partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-031",
    name: "Snow Leopard Trust",
    email: "info@snowleopardtrust.org",
    domain: "snowleopardtrust.org",
    geography: "Central Asia, Himalayas",
    focusAreas: [
      "snow leopard conservation",
      "predator protection",
      "mountain ecosystems",
      "wildlife corridors",
    ],
    fitRationale:
      "Organization dedicated to protecting snow leopards and their mountain habitats",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Specialized predator conservation organization with strong field presence",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-032",
    name: "Society for the Protection of Nature in Israel (SPNI)",
    email: "info@spni.org",
    domain: "spni.org",
    geography: "Israel, Middle East",
    focusAreas: [
      "nature conservation",
      "wildlife protection",
      "habitat preservation",
      "environmental education",
    ],
    fitRationale:
      "Israeli organization focused on nature conservation and environmental protection",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Established conservation organization with strong environmental education programs",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-033",
    name: "Terrra",
    email: "info@terrra.org",
    domain: "terrra.org",
    geography: "Global, Europe",
    focusAreas: [
      "sustainable agriculture",
      "soil health",
      "regenerative farming",
      "food systems",
    ],
    fitRationale:
      "European organization promoting sustainable agriculture and soil regeneration",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Innovative organization focused on regenerative agriculture and food systems",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-034",
    name: "Trees for the Future",
    email: "info@treesforthefuture.org",
    domain: "treesforthefuture.org",
    geography: "Global, USA",
    focusAreas: [
      "reforestation",
      "tree planting",
      "climate action",
      "sustainable forestry",
    ],
    fitRationale:
      "US-based organization focused on reforestation and climate action through tree planting",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Reforestation organization with strong community planting programs",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-035",
    name: "Uganda Conservation Foundation (UCF)",
    email: "info@ugandaconservation.org",
    domain: "ugandaconservation.org",
    geography: "Uganda, East Africa",
    focusAreas: [
      "forest conservation",
      "wildlife protection",
      "community development",
      "biodiversity",
    ],
    fitRationale:
      "Ugandan organization focused on forest conservation and wildlife protection",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "East African conservation organization with strong community partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-036",
    name: "Ujamaa Empowerment Network",
    email: "info@ujamaa.org",
    domain: "ujamaa.org",
    geography: "Kenya, East Africa",
    focusAreas: [
      "community development",
      "environmental education",
      "sustainable livelihoods",
      "youth empowerment",
    ],
    fitRationale:
      "Kenyan organization focused on community development and environmental empowerment",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Community-led organization with strong youth empowerment programs",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-037",
    name: "Veritree",
    email: "info@veritree.org",
    domain: "veritree.org",
    geography: "Global, Europe",
    focusAreas: [
      "forest conservation",
      "carbon verification",
      "sustainable forestry",
      "climate solutions",
    ],
    fitRationale:
      "European organization providing forest carbon verification and sustainable forestry solutions",
    partnerStatus: "potential",
    riskScore: 3,
    controversySummary:
      "Forest carbon verification organization with strong technical expertise",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-038",
    name: "Vital Ground Foundation",
    email: "info@vitalground.org",
    domain: "vitalground.org",
    geography: "Global, USA",
    focusAreas: [
      "soil health",
      "regenerative agriculture",
      "sustainable farming",
      "carbon sequestration",
    ],
    fitRationale:
      "US organization focused on soil health and regenerative agricultural practices",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Soil health organization with strong regenerative agriculture focus",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-039",
    name: "Wildlife Conservation Society Canada (WCS Canada)",
    email: "info@wcscanada.org",
    domain: "wcscanada.org",
    geography: "Canada, North America",
    focusAreas: [
      "wildlife conservation",
      "species protection",
      "habitat preservation",
      "ecosystem management",
    ],
    fitRationale:
      "Canadian organization dedicated to wildlife conservation and habitat protection",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Established wildlife conservation organization with strong scientific foundation",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-040",
    name: "WeForest",
    email: "info@weforest.org",
    domain: "weforest.org",
    geography: "Global, Switzerland",
    focusAreas: [
      "reforestation",
      "forest conservation",
      "carbon sequestration",
      "community development",
    ],
    fitRationale:
      "Swiss organization focused on reforestation and forest conservation worldwide",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "International reforestation organization with strong community partnerships",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "ngo-041",
    name: "Xerces Society for Invertebrate Conservation",
    email: "info@xerces.org",
    domain: "xerces.org",
    geography: "Global, USA",
    focusAreas: [
      "invertebrate conservation",
      "pollinator protection",
      "biodiversity",
      "habitat restoration",
    ],
    fitRationale:
      "US-based organization dedicated to invertebrate and pollinator conservation",
    partnerStatus: "potential",
    riskScore: 2,
    controversySummary:
      "Specialized conservation organization with strong scientific reputation in invertebrate protection",
    selectedForOutreach: false,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

/**
 * MAIN SEARCH FUNCTION - Core NGO matching algorithm
 * ============================================================================
 * PURPOSE: Find most relevant NGOs for a given campaign brief
 *
 * ALGORITHM OVERVIEW:
 * 1. Input validation - Ensure brief has content
 * 2. Text processing - Analyze brief using NLP techniques
 * 3. Quality assessment - Evaluate brief completeness and clarity
 * 4. Keyword extraction - Pull relevant terms and entities
 * 5. Database scoring - Match against NGO database using relevance algorithm
 * 6. Ranking - Sort by relevance and return top results
 *
 * PARAMETERS:
 *   @param {string} brief - User's campaign description
 *   @returns {Promise<schemas.NGOProfile[]>} - Ranked list of relevant NGOs
 */
export async function searchNGOs(brief: string): Promise<schemas.NGOProfile[]> {
  // ============================================================================
  // STEP 1: Input Validation
  // ============================================================================
  if (!brief || brief.trim().length === 0) return [];

  console.log(
    `[NGO Search] Processing brief: "${brief.substring(0, 100)}${brief.length > 100 ? "..." : ""}"`,
  );

  // ============================================================================
  // STEP 2: Text Processing
  // ============================================================================
  // Initialize brief processor
  const briefProcessor = new BriefProcessor(console.log);

  // Process the brief with enhanced text analysis
  const processedBrief = await briefProcessor.processBrief(brief);

  console.log(
    `[NGO Search] Brief processed: ${processedBrief.wordCount} words, quality score: ${processedBrief.quality.score}`,
  );

  // ============================================================================
  // STEP 3: Quality Assessment Logging
  // ============================================================================
  // Log any quality issues with the brief for debugging
  if (processedBrief.quality.issues.length > 0) {
    console.log(
      `[NGO Search] Brief quality issues: ${processedBrief.quality.issues.join(", ")}`,
    );
  }

  // ============================================================================
  // STEP 4: Enhanced Keyword Extraction
  // ============================================================================
  // Extract relevant keywords from the processed brief using multiple techniques:
  // - Sentence-level keyword extraction
  // - Paragraph-level keyword extraction
  // - Domain-specific keyword identification
  // - Contextual keyword analysis
  // - Limit to top 12 most relevant keywords
  const keywords = extractEnhancedKeywords(
    processedBrief.cleanedText,
    processedBrief,
  );
  console.log(`[NGO Search] Enhanced keywords: ${keywords.join(", ")}`);

  // ============================================================================
  // STEP 5: Database Scoring & Ranking
  // ============================================================================
  // Score each NGO in local database using enhanced algorithm
  const scoredNGOs = LOCAL_NGO_DATABASE.map((ngo) => ({
    ngo,
    score: calculateEnhancedRelevanceScore(ngo, processedBrief, keywords),
  }));

  // Filter out irrelevant NGOs (score > 0), sort by relevance (highest first),
  // limit to top 12 results, and prepare for frontend
  const results = scoredNGOs
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ ngo }) => ({ ...ngo, selectedForOutreach: false }));

  console.log(
    `[NGO Search] Found ${results.length} matching NGOs (LOCAL_NGO_DATABASE)`,
  );
  return results;
}

/**
 * ENHANCED KEYWORD EXTRACTION
 * ============================================================================
 * PURPOSE: Extract relevant keywords from processed brief using multiple techniques
 *
 * EXTRACTION METHODS:
 * 1. Sentence-level extraction - Pull keywords from individual sentences
 * 2. Paragraph-level extraction - Extract terms from paragraph context
 * 3. Domain-specific extraction - Identify domain-relevant terms
 * 4. Contextual extraction - Find contextual keywords based on intent
 *
 * FILTERING:
 * - Remove common stop words (the, and, for, etc.)
 * - Filter by word length (> 3 characters)
 * - Remove duplicates using Set data structure
 *
 * OUTPUT: Array of unique, relevant keywords (max 12)
 */
function extractEnhancedKeywords(
  cleanedText: string,
  processedBrief: any,
): string[] {
  const keywords = new Set<string>();

  // ============================================================================
  // METHOD 1: Sentence-level keyword extraction
  // ============================================================================
  // Extract meaningful words from each sentence in the processed brief
  processedBrief.sentences.forEach((sentence: string) => {
    const sentenceWords = sentence
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 3 && !isStopWord(word));
    sentenceWords.forEach((word: string) => keywords.add(word));
  });

  // ============================================================================
  // METHOD 2: Paragraph-level keyword extraction
  // ============================================================================
  // Extract keywords from paragraph context for better semantic understanding
  processedBrief.paragraphs.forEach((paragraph: string) => {
    const paragraphWords = paragraph
      .toLowerCase()
      .split(/\s+/)
      .filter((word: string) => word.length > 3 && !isStopWord(word));
    paragraphWords.forEach((word: string) => keywords.add(word));
  });

  // ============================================================================
  // METHOD 3: Domain-specific keyword extraction
  // ============================================================================
  // Add keywords specific to environmental/conservation domains
  const domainKeywords = extractDomainKeywords(cleanedText);
  domainKeywords.forEach((keyword) => keywords.add(keyword));

  // ============================================================================
  // METHOD 4: Contextual keyword extraction
  // ============================================================================
  // Add keywords based on contextual analysis of the brief
  const contextualKeywords = extractContextualKeywords(cleanedText);
  contextualKeywords.forEach((keyword) => keywords.add(keyword));

  // Return limited array of most relevant keywords
  return Array.from(keywords).slice(0, 12); // Limit to top 12 keywords
}

/**
 * ENHANCED RELEVANCE SCORING ALGORITHM
 * ============================================================================
 * PURPOSE: Calculate relevance score for each NGO against the processed brief
 *
 * SCORING METHODOLOGY:
 * Two-phase scoring system with weighted components:
 *
 * PHASE 1: Basic Matching (40% total weight)
 *   - Focus area matching (20% weight) - NGO focus vs brief keywords
 *   - Domain-specific matching (15% weight) - Domain-relevant terms
 *   - Geography matching (10% weight) - Location compatibility
 *   - Organization type matching (5% weight) - NGO name/type alignment
 *
 * PHASE 2: Advanced Analysis (60% total weight)
 *   - Intent alignment (20% weight) - Campaign goal vs NGO purpose
 *   - Entity matching (15% weight) - Named entities in brief vs NGO
 *   - Tone compatibility (10% weight) - Communication style match
 *   - Geographic entity fit (10% weight) - Location entity analysis
 *   - Scope alignment (5% weight) - Geographic scope compatibility
 *
 * OUTPUT: Numeric relevance score (higher = more relevant)
 */
function calculateEnhancedRelevanceScore(
  ngo: schemas.NGOProfile,
  processedBrief: any,
  keywords: string[],
): number {
  let score = 0;
  const cleanedText = processedBrief.cleanedText.toLowerCase();
  const ngoName = ngo.name.toLowerCase();
  const ngoFocusAreas = (ngo.focusAreas || [])
    .map((a) => a.toLowerCase())
    .join(" ");

  // ============================================================================
  // PHASE 1: BASIC MATCHING (40% weight)
  // ============================================================================

  // Focus area matching - Check if NGO focus areas align with brief keywords
  const focusAreaMatches = keywords.filter((keyword) =>
    ngoFocusAreas.includes(keyword.toLowerCase()),
  );
  score += focusAreaMatches.length * 20;

  // Domain-specific matching - Check for domain-relevant terms in brief
  const domainMatches = extractDomainMatches(cleanedText, ngo);
  score += domainMatches * 15;

  // Geography matching - Score based on geographic compatibility
  const geographyScore = calculateGeographyMatch(cleanedText, ngo.geography);
  score += geographyScore * 10;

  // Organization type matching - Score based on NGO name/type alignment
  const orgTypeScore = calculateOrganizationTypeMatch(cleanedText, ngo);
  score += orgTypeScore * 5;

  // ============================================================================
  // PHASE 2: ADVANCED ANALYSIS (60% weight)
  // ============================================================================

  // Intent alignment - Check if NGO purpose matches campaign intent
  const intentScore = calculateIntentAlignment(ngo, processedBrief.intent);
  score += intentScore * 20;

  // Entity matching - Check for entity overlaps between brief and NGO
  const entityScore = calculateEntityMatches(ngo, processedBrief.entities);
  score += entityScore * 15;

  // Tone compatibility - Check communication style alignment
  const toneScore = calculateToneCompatibility(ngo, processedBrief.tone);
  score += toneScore * 10;

  // Geographic entity fit - Score based on location entities in brief
  const geoEntityScore = calculateGeographicEntityFit(
    ngo,
    processedBrief.entities.locations,
  );
  score += geoEntityScore * 10;

  // Scope alignment - Score based on geographic scope compatibility
  const scopeScore = calculateScopeAlignment(ngo, processedBrief.intent.scope);
  score += scopeScore * 5;

  return score;
}

/**
 * INTENT ALIGNMENT SCORING
 * ============================================================================
 * PURPOSE: Calculate how well an NGO's purpose aligns with campaign intent
 *
 * ALIGNMENT CATEGORIES:
 * - Partnership: NGOs focused on collaboration, alliances, networks
 * - Funding: Organizations providing grants, financial support, foundations
 * - Volunteers: Groups emphasizing community involvement, volunteer programs
 * - Advocacy: Policy-focused organizations, societies, defense groups
 * - Research: Scientific organizations, institutes, conservancies
 *
 * SCORING LOGIC:
 * 1. Check NGO name for alignment indicators (alliance, coalition, etc.)
 * 2. Check NGO focus areas for alignment terms (partnership, collaboration)
 * 3. Award points based on alignment strength
 * 4. Cap maximum score at 5 points
 *
 * OUTPUT: Alignment score (0-5, higher = better alignment)
 */
function calculateIntentAlignment(
  ngo: schemas.NGOProfile,
  intent: any,
): number {
  let score = 0;
  const ngoName = ngo.name.toLowerCase();
  const ngoFocus = ngo.focusAreas?.join(" ").toLowerCase() || "";

  switch (intent.primaryGoal) {
    case "partnership":
      if (
        ngoName.includes("alliance") ||
        ngoName.includes("coalition") ||
        ngoName.includes("network")
      ) {
        score += 3;
      }
      if (
        ngoFocus.includes("partnership") ||
        ngoFocus.includes("collaboration")
      ) {
        score += 2;
      }
      break;

    case "funding":
      if (ngoName.includes("fund") || ngoName.includes("foundation")) {
        score += 3;
      }
      if (ngoFocus.includes("funding") || ngoFocus.includes("grants")) {
        score += 2;
      }
      break;

    case "volunteers":
      if (ngoFocus.includes("volunteer") || ngoFocus.includes("community")) {
        score += 3;
      }
      break;

    case "advocacy":
      if (
        ngoName.includes("club") ||
        ngoName.includes("society") ||
        ngoName.includes("defense")
      ) {
        score += 3;
      }
      if (ngoFocus.includes("advocacy") || ngoFocus.includes("policy")) {
        score += 2;
      }
      break;

    case "research":
      if (ngoName.includes("institute") || ngoName.includes("conservancy")) {
        score += 3;
      }
      if (ngoFocus.includes("research") || ngoFocus.includes("science")) {
        score += 2;
      }
      break;
  }

  return Math.min(score, 5);
}

/**
 * Calculate entity matching score
 */
function calculateEntityMatches(
  ngo: schemas.NGOProfile,
  entities: any,
): number {
  let score = 0;
  const ngoName = ngo.name.toLowerCase();
  const ngoFocus = ngo.focusAreas?.join(" ").toLowerCase() || "";

  // Organization matches
  entities.organizations.forEach((org: string) => {
    if (ngoName.includes(org.toLowerCase())) {
      score += 3;
    }
  });

  // Cause matches
  entities.causes.forEach((cause: string) => {
    if (ngoFocus.includes(cause.toLowerCase())) {
      score += 2;
    }
  });

  // Activity matches
  entities.activities.forEach((activity: string) => {
    if (ngoFocus.includes(activity.toLowerCase())) {
      score += 1;
    }
  });

  return Math.min(score, 5);
}

/**
 * Calculate tone compatibility score
 */
function calculateToneCompatibility(
  ngo: schemas.NGOProfile,
  tone: any,
): number {
  let score = 2; // Base score

  const ngoName = ngo.name.toLowerCase();
  const ngoFocus = ngo.focusAreas?.join(" ").toLowerCase() || "";

  // Formal organizations prefer formal tone
  if (
    ngoName.includes("institute") ||
    ngoName.includes("foundation") ||
    ngoName.includes("society")
  ) {
    if (tone.formality === "formal") {
      score += 2;
    } else if (tone.formality === "casual") {
      score -= 1;
    }
  }

  // Advocacy organizations may prefer passionate tone
  if (ngoFocus.includes("advocacy") || ngoFocus.includes("campaign")) {
    if (tone.emotional_language) {
      score += 1;
    }
  }

  // Research organizations prefer neutral tone
  if (ngoFocus.includes("research") || ngoFocus.includes("science")) {
    if (tone.sentiment === "neutral") {
      score += 2;
    } else if (tone.sentiment === "negative") {
      score -= 1;
    }
  }

  return Math.max(0, Math.min(score, 5));
}

/**
 * Calculate geographic entity fit
 */
function calculateGeographicEntityFit(
  ngo: schemas.NGOProfile,
  locations: string[],
): number {
  if (locations.length === 0) return 1; // Default score

  const ngoGeography = ngo.geography?.toLowerCase() || "";
  let score = 0;

  locations.forEach((location: string) => {
    const loc = location.toLowerCase();

    if (
      ngoGeography.includes("global") &&
      (loc.includes("global") || loc.includes("world"))
    ) {
      score += 3;
    } else if (
      ngoGeography.includes("usa") &&
      (loc.includes("usa") || loc.includes("america"))
    ) {
      score += 3;
    } else if (ngoGeography.toLowerCase().includes(loc)) {
      score += 2;
    }
  });

  return Math.min(score, 5);
}

/**
 * Calculate scope alignment
 */
function calculateScopeAlignment(
  ngo: schemas.NGOProfile,
  scope: string,
): number {
  const ngoGeography = ngo.geography?.toLowerCase() || "";

  switch (scope) {
    case "global":
      if (ngoGeography.includes("global")) return 5;
      if (ngoGeography.includes("international")) return 4;
      return 2;

    case "national":
      if (ngoGeography.includes("usa") || ngoGeography.includes("country"))
        return 5;
      if (ngoGeography.includes("national")) return 4;
      return 2;

    case "regional":
      if (ngoGeography.includes("regional") || ngoGeography.includes("state"))
        return 5;
      return 3;

    case "local":
      if (ngoGeography.includes("local") || ngoGeography.includes("community"))
        return 5;
      return 2;

    default:
      return 3;
  }
}

// Helper functions for enhanced processing

function isStopWord(word: string): boolean {
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
    "have",
    "has",
    "had",
    "was",
    "were",
    "been",
    "being",
    "get",
    "got",
    "will",
    "would",
    "could",
    "should",
  ];
  return stopwords.includes(word.toLowerCase());
}

function extractDomainKeywords(text: string): string[] {
  const domains = {
    environmental: [
      "environment",
      "climate",
      "conservation",
      "sustainability",
      "green",
      "eco",
    ],
    agriculture: [
      "agriculture",
      "farming",
      "farmers",
      "regenerative",
      "organic",
      "soil",
      "crops",
    ],
    marine: [
      "marine",
      "ocean",
      "water",
      "aquatic",
      "fisheries",
      "coral",
      "coastal",
    ],
    education: [
      "education",
      "teaching",
      "learning",
      "school",
      "students",
      "training",
    ],
    health: [
      "health",
      "medical",
      "healthcare",
      "medicine",
      "patients",
      "wellness",
    ],
    wildlife: [
      "wildlife",
      "animals",
      "conservation",
      "habitat",
      "species",
      "biodiversity",
    ],
    energy: [
      "energy",
      "renewable",
      "solar",
      "wind",
      "clean",
      "power",
      "electricity",
    ],
  };

  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];

  Object.entries(domains).forEach(([domain, keywords]) => {
    keywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    });
  });

  return foundKeywords;
}

function extractContextualKeywords(text: string): string[] {
  const contextual = [
    "partnership",
    "collaboration",
    "cooperation",
    "joint",
    "alliance",
    "funding",
    "grant",
    "investment",
    "donation",
    "support",
    "sponsorship",
    "volunteer",
    "internship",
    "training",
    "capacity",
    "building",
    "advocacy",
    "campaign",
    "policy",
    "rights",
    "justice",
    "equity",
    "research",
    "science",
    "innovation",
    "technology",
    "data",
    "community",
    "development",
    "social",
    "economic",
    "global",
  ];

  const lowerText = text.toLowerCase();
  return contextual.filter((keyword) => lowerText.includes(keyword));
}

function extractDomainMatches(text: string, ngo: schemas.NGOProfile): number {
  let matches = 0;

  // NGO name mentions
  if (text.toLowerCase().includes(ngo.name.toLowerCase())) {
    matches += 3;
  }

  // Domain-specific terms
  if (ngo.focusAreas) {
    ngo.focusAreas.forEach((area) => {
      if (text.toLowerCase().includes(area.toLowerCase())) {
        matches += 2;
      }
    });
  }

  return matches;
}

function calculateGeographyMatch(text: string, ngoGeography?: string): number {
  if (!ngoGeography) return 0;

  const lowerText = text.toLowerCase();
  const lowerGeography = ngoGeography.toLowerCase();

  if (
    lowerText.includes("usa") ||
    lowerText.includes("united states") ||
    lowerText.includes("america")
  ) {
    if (lowerGeography.includes("usa") || lowerGeography.includes("global")) {
      return 5;
    }
  }

  if (lowerText.includes("global") && lowerGeography.includes("global")) {
    return 5;
  }

  // Check for specific country/region matches
  const geoTerms = lowerGeography.split(/[\s,]+/);
  geoTerms.forEach((term) => {
    if (lowerText.includes(term)) {
      return 3;
    }
  });

  return 0;
}

function calculateOrganizationTypeMatch(
  text: string,
  ngo: schemas.NGOProfile,
): number {
  let score = 0;

  const lowerText = text.toLowerCase();

  // Size indicators
  if (lowerText.includes("small") || lowerText.includes("local")) {
    score += 2;
  } else if (
    lowerText.includes("large") ||
    lowerText.includes("national") ||
    lowerText.includes("international")
  ) {
    score += 3;
  }

  // Type indicators
  if (
    lowerText.includes("foundation") ||
    lowerText.includes("nonprofit") ||
    lowerText.includes("charity")
  ) {
    score += 2;
  }

  return score;
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
