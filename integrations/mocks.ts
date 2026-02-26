/**
 * Mock Implementations for Local Testing
 *
 * These implementations allow full local development and testing without
 * connecting to real external services. They simulate realistic behavior
 * and help validate workflows locally.
 */

import * as fs from "fs";
import * as path from "path";
import * as schemas from "../shared/schemas";
import * as interfaces from "./interfaces";
import { v4 as uuidv4 } from "uuid";

// In-memory storage for mock implementations
let mockDatabase: {
  emails: Map<string, schemas.DraftEmail>;
  workflows: Map<string, schemas.WorkflowState>;
  approvals: Map<string, schemas.UserApproval>;
  ngoProfiles: Map<string, schemas.NGOProfile>;
  idempotencyKeys: Map<string, schemas.IdempotencyKey>;
  contacts: Map<string, schemas.HubSpotContact>;
  sentEmails: Map<string, interfaces.EmailSendResult>;
} = {
  emails: new Map(),
  workflows: new Map(),
  approvals: new Map(),
  ngoProfiles: new Map(),
  idempotencyKeys: new Map(),
  contacts: new Map(),
  sentEmails: new Map(),
};

const MOCK_DATA_DIR = process.env.MOCK_DATA_DIR || "./mock-data";

/**
 * Mock Email Service
 *
 * Writes emails to disk instead of sending them.
 * Simulates realistic send delays.
 */
export class MockEmailService implements interfaces.IEmailService {
  private logger: (msg: string) => void;

  constructor(logger?: (msg: string) => void) {
    this.logger = logger || console.log;
  }

  async sendApprovedEmail(
    draftEmail: schemas.DraftEmail,
    approval: schemas.UserApproval,
  ): Promise<interfaces.EmailSendResult> {
    this.logger(`[MockEmailService] Sending approved email: ${draftEmail.id}`);

    // Simulate network delay
    await this.delay(100);

    const emailId = uuidv4();
    const sentAt = new Date().toISOString();

    const result: interfaces.EmailSendResult = {
      success: true,
      emailId,
      messageId: `mock-msg-${emailId}`,
      sentAt,
    };

    // Write to disk for inspection
    this.writeSentEmail(draftEmail, result);

    // Update in-memory record
    mockDatabase.sentEmails.set(emailId, result);

    // Update draft email status
    draftEmail.status = "sent";
    draftEmail.sentAt = sentAt;
    mockDatabase.emails.set(draftEmail.id, draftEmail);

    this.logger(`[MockEmailService] Email sent: ${emailId}`);

    return result;
  }

  async scheduleFollowUp(
    draftEmail: schemas.DraftEmail,
    approval: schemas.UserApproval,
    delayMs: number,
    idempotencyKey: string,
  ): Promise<interfaces.FollowUpScheduleResult> {
    this.logger(
      `[MockEmailService] Scheduling follow-up: ${draftEmail.id} (delay: ${delayMs}ms)`,
    );

    // Check idempotency
    const existingKey = await mockDatabase.idempotencyKeys.get(idempotencyKey);
    if (existingKey && existingKey.completedAt) {
      this.logger(
        `[MockEmailService] Follow-up already scheduled for idempotency key: ${idempotencyKey}`,
      );
      return {
        success: true,
        scheduledEmailId: (existingKey.result as any)
          ?.scheduledEmailId as string,
      };
    }

    // Simulate scheduling
    await this.delay(10);

    const scheduledEmailId = uuidv4();

    // Record idempotency
    const idempKey: schemas.IdempotencyKey = {
      key: idempotencyKey,
      operationType: "schedule_followup",
      resourceId: draftEmail.id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: { scheduledEmailId },
    };

    mockDatabase.idempotencyKeys.set(idempotencyKey, idempKey);

    this.logger(`[MockEmailService] Follow-up scheduled: ${scheduledEmailId}`);

    return {
      success: true,
      scheduledEmailId,
      scheduledAt: new Date().toISOString(),
    };
  }

  private writeSentEmail(
    email: schemas.DraftEmail,
    result: interfaces.EmailSendResult,
  ): void {
    if (!fs.existsSync(MOCK_DATA_DIR)) {
      fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
    }

    const filename = path.join(MOCK_DATA_DIR, `sent-email-${email.id}.json`);
    const data = {
      draftEmail: email,
      sendResult: result,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    this.logger(`[MockEmailService] Email written to disk: ${filename}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock HubSpot Service
 *
 * Provides read-only contact access from local data.
 * Never modifies records.
 */
export class MockHubSpotService implements interfaces.IHubSpotService {
  private logger: (msg: string) => void;

  constructor(logger?: (msg: string) => void) {
    this.logger = logger || console.log;
  }

  async getContactByEmail(
    email: string,
  ): Promise<schemas.HubSpotContact | null> {
    this.logger(`[MockHubSpotService] Retrieving contact by email: ${email}`);

    // Simulate network delay
    await this.delay(10);

    for (const contact of mockDatabase.contacts.values()) {
      if (contact.email === email) {
        this.logger(`[MockHubSpotService] Found contact: ${contact.id}`);
        return contact;
      }
    }

    this.logger(`[MockHubSpotService] No contact found for email: ${email}`);
    return null;
  }

  async getContactById(id: string): Promise<schemas.HubSpotContact | null> {
    this.logger(`[MockHubSpotService] Retrieving contact by ID: ${id}`);
    await this.delay(10);

    const contact = mockDatabase.contacts.get(id);
    if (contact) {
      this.logger(`[MockHubSpotService] Found contact: ${id}`);
      return contact;
    }

    this.logger(`[MockHubSpotService] No contact found for ID: ${id}`);
    return null;
  }

  async listContacts(
    limit: number,
    offset: number,
  ): Promise<schemas.HubSpotContact[]> {
    this.logger(
      `[MockHubSpotService] Listing contacts (limit: ${limit}, offset: ${offset})`,
    );
    await this.delay(10);

    const contacts = Array.from(mockDatabase.contacts.values()).slice(
      offset,
      offset + limit,
    );
    this.logger(`[MockHubSpotService] Returned ${contacts.length} contacts`);
    return contacts;
  }

  async createContactIfNotExists(
    contact: Partial<schemas.HubSpotContact>,
  ): Promise<interfaces.CreateContactResult> {
    if (!contact.email) {
      return {
        success: false,
        error: "Email is required to create a contact",
        isNew: false,
      };
    }

    this.logger(
      `[MockHubSpotService] Creating contact if not exists: ${contact.email}`,
    );
    await this.delay(10);

    // Check if already exists
    for (const existingContact of mockDatabase.contacts.values()) {
      if (existingContact.email === contact.email) {
        this.logger(
          `[MockHubSpotService] Contact already exists: ${existingContact.id}`,
        );
        return {
          success: true,
          contact: existingContact,
          isNew: false,
        };
      }
    }

    // Create new contact
    const newContact: schemas.HubSpotContact = {
      id: uuidv4(),
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      company: contact.company,
      phone: contact.phone,
      properties: contact.properties || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDatabase.contacts.set(newContact.id, newContact);
    this.logger(`[MockHubSpotService] Contact created: ${newContact.id}`);

    return {
      success: true,
      contact: newContact,
      isNew: true,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock Supabase Service
 *
 * Stores all workflow state and draft emails in memory.
 * Persists to disk for inspection.
 */
export class MockSupabaseService implements interfaces.ISupabaseService {
  private logger: (msg: string) => void;

  constructor(logger?: (msg: string) => void) {
    this.logger = logger || console.log;
  }

  async saveWorkflowState(
    state: schemas.WorkflowState,
  ): Promise<interfaces.WorkflowStateResult> {
    this.logger(`[MockSupabaseService] Saving workflow state: ${state.id}`);
    await this.delay(10);

    mockDatabase.workflows.set(state.id, state);
    this.persistState();

    return {
      success: true,
      state,
    };
  }

  async getWorkflowState(id: string): Promise<schemas.WorkflowState | null> {
    this.logger(`[MockSupabaseService] Retrieving workflow state: ${id}`);
    await this.delay(10);

    const state = mockDatabase.workflows.get(id);
    return state || null;
  }

  async getWorkflowStatesByCampaign(
    campaignId: string,
  ): Promise<schemas.WorkflowState[]> {
    this.logger(
      `[MockSupabaseService] Retrieving workflow states for campaign: ${campaignId}`,
    );
    await this.delay(10);

    const states = Array.from(mockDatabase.workflows.values()).filter(
      (s) => s.campaignId === campaignId,
    );
    this.logger(`[MockSupabaseService] Found ${states.length} workflow states`);

    return states;
  }

  async updateWorkflowStage(
    stateId: string,
    newStage: schemas.WorkflowStage,
    data: Record<string, unknown>,
  ): Promise<interfaces.WorkflowStateResult> {
    this.logger(
      `[MockSupabaseService] Updating workflow stage: ${stateId} -> ${newStage}`,
    );
    await this.delay(10);

    const state = mockDatabase.workflows.get(stateId);
    if (!state) {
      return {
        success: false,
        error: `Workflow state not found: ${stateId}`,
      };
    }

    state.stage = newStage;
    state.data = { ...state.data, ...data };
    state.updatedAt = new Date().toISOString();

    mockDatabase.workflows.set(stateId, state);
    this.persistState();

    return {
      success: true,
      state,
    };
  }

  async saveDraftEmail(
    email: schemas.DraftEmail,
  ): Promise<interfaces.DraftEmailResult> {
    this.logger(`[MockSupabaseService] Saving draft email: ${email.id}`);
    await this.delay(10);

    mockDatabase.emails.set(email.id, email);
    this.persistState();

    return {
      success: true,
      email,
    };
  }

  async getDraftEmail(id: string): Promise<schemas.DraftEmail | null> {
    this.logger(`[MockSupabaseService] Retrieving draft email: ${id}`);
    await this.delay(10);

    return mockDatabase.emails.get(id) || null;
  }

  async listDraftEmailsByCampaign(
    campaignId: string,
  ): Promise<schemas.DraftEmail[]> {
    this.logger(
      `[MockSupabaseService] Listing draft emails for campaign: ${campaignId}`,
    );
    await this.delay(10);

    const emails = Array.from(mockDatabase.emails.values()).filter(
      (e) => e.campaignId === campaignId,
    );
    this.logger(`[MockSupabaseService] Found ${emails.length} draft emails`);

    return emails;
  }

  async saveUserApproval(
    approval: schemas.UserApproval,
  ): Promise<interfaces.UserApprovalResult> {
    this.logger(`[MockSupabaseService] Saving user approval: ${approval.id}`);
    await this.delay(10);

    mockDatabase.approvals.set(approval.id, approval);
    this.persistState();

    return {
      success: true,
      approval,
    };
  }

  async getUserApproval(id: string): Promise<schemas.UserApproval | null> {
    this.logger(`[MockSupabaseService] Retrieving user approval: ${id}`);
    await this.delay(10);

    return mockDatabase.approvals.get(id) || null;
  }

  async hasApproval(
    resourceType: string,
    resourceId: string,
  ): Promise<boolean> {
    this.logger(
      `[MockSupabaseService] Checking approval: ${resourceType}/${resourceId}`,
    );
    await this.delay(10);

    for (const approval of mockDatabase.approvals.values()) {
      if (
        approval.resourceType === resourceType &&
        approval.resourceId === resourceId
      ) {
        return true;
      }
    }

    return false;
  }

  async saveNGOProfile(
    profile: schemas.NGOProfile,
  ): Promise<interfaces.NGOProfileResult> {
    this.logger(`[MockSupabaseService] Saving NGO profile: ${profile.id}`);
    await this.delay(10);

    mockDatabase.ngoProfiles.set(profile.id, profile);
    this.persistState();

    return {
      success: true,
      profile,
    };
  }

  async getNGOProfile(id: string): Promise<schemas.NGOProfile | null> {
    this.logger(`[MockSupabaseService] Retrieving NGO profile: ${id}`);
    await this.delay(10);

    return mockDatabase.ngoProfiles.get(id) || null;
  }

  async recordIdempotencyKey(
    key: schemas.IdempotencyKey,
  ): Promise<interfaces.IdempotencyResult> {
    this.logger(`[MockSupabaseService] Recording idempotency key: ${key.key}`);
    await this.delay(10);

    mockDatabase.idempotencyKeys.set(key.key, key);
    this.persistState();

    return {
      success: true,
      key,
    };
  }

  async getIdempotencyKey(key: string): Promise<schemas.IdempotencyKey | null> {
    this.logger(`[MockSupabaseService] Retrieving idempotency key: ${key}`);
    await this.delay(10);

    return mockDatabase.idempotencyKeys.get(key) || null;
  }

  private persistTimeout: NodeJS.Timeout | null = null;

  private persistState(): void {
    // Temporarily disabled to prevent I/O issues
    this.logger(`[MockSupabaseService] Persistence disabled for performance`);
    return;
  }

  private delay(ms: number): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Mock AI Service
 *
 * Generates realistic but templated emails for testing
 */
export class MockAIService implements interfaces.IAIService {
  private logger: (msg: string) => void;

  constructor(logger?: (msg: string) => void) {
    this.logger = logger || console.log;
  }

  async generateEmail(
    ngo: schemas.NGOProfile,
    campaign: schemas.OutreachCampaign,
  ): Promise<interfaces.AIGenerationResult> {
    this.logger(`[MockAIService] Generating email for NGO: ${ngo.name}`);

    // Template-based email generation
    const template = this.getTemplateForNGO(ngo, campaign);

    const email: schemas.AIGeneratedEmail = {
      subject: template.subject
        .replace("{{ngoName}}", ngo.name)
        .replace("{{campaignName}}", campaign.name),
      body: template.body
        .replace("{{ngoName}}", ngo.name)
        .replace(
          "{{ngoFocus}}",
          ngo.focusAreas
            ? ngo.focusAreas.join(", ")
            : "environmental conservation",
        )
        .replace("{{campaignName}}", campaign.name)
        .replace("{{ngoDomain}}", ngo.domain || "environmental protection"),
      tone: "professional",
      targetNGOName: ngo.name,
      personalizationNotes: [
        `Organization focuses on ${ngo.domain}`,
        "Consider mentioning relevant impact metrics",
        `Highlight their work in ${ngo.focusAreas ? ngo.focusAreas.slice(0, 2).join(", ") : "environmental protection"}`,
      ],
      confidence: 0.85,
      validationErrors: [],
    };

    this.logger(`[MockAIService] Email generated successfully using template`);

    return {
      success: true,
      data: email,
    };
  }

  private getTemplateForNGO(
    ngo: schemas.NGOProfile,
    campaign: schemas.OutreachCampaign,
  ): { subject: string; body: string } {
    // TODO: Fetch from Google Drive template
    // For now, using a hardcoded template based on your Google Doc
    return {
      subject: "Partnership Opportunity: {{campaignName}}",
      body: `Dear {{ngoName}} Team,

We hope this message finds you well. We are reaching out to explore potential collaboration opportunities with your organization.

We are launching {{campaignName}}, a new initiative focused on marine conservation and ecosystem restoration, and we've been following your impressive work in {{ngoFocus}}. Your organization's expertise and impact in this field align perfectly with our goals.

We believe there may be significant synergies between our initiatives and your work. We'd welcome the opportunity to discuss how we might work together to create greater impact in protecting our marine ecosystems and coastal environments.

Would you be available for a brief call next week to explore potential partnership opportunities?

Best regards,
The Reach Out Team`,
    };
  }

  async generateEmailWithPrompt(
    prompt: string,
  ): Promise<interfaces.AIGenerationResult> {
    this.logger(
      `[MockAIService] Generating email from prompt: ${prompt.substring(0, 50)}...`,
    );

    // No delay for instant response

    const email: schemas.AIGeneratedEmail = {
      subject: "Collaboration Opportunity",
      body: `Dear Partner,

${prompt}

We look forward to hearing from you.

Best regards,
The Reach Out Team`,
      tone: "professional",
      targetNGOName: "Unknown",
      personalizationNotes: ["Custom prompt provided"],
      confidence: 0.75,
      validationErrors: [],
    };

    return {
      success: true,
      data: email,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Sample NGO Database for Mock Mode
 * (Note: searchNGOs is now handled by ngo-search.ts which uses GlobalGiving and DuckDuckGo)
 */
// NGO database now uses online search - see ngo-search.ts

/**
 * Initialize mock NGO database
 * (Note: searchNGOs is now handled by ngo-search.ts which uses GlobalGiving and DuckDuckGo)
 */
function initializeMockNGOs(): void {
  // NGO database now uses online search instead of mock data
}

// Initialize on module load
initializeMockNGOs();

/**
 * Reset mock database for testing
 */
export function resetMockDatabase(): void {
  mockDatabase = {
    emails: new Map(),
    workflows: new Map(),
    approvals: new Map(),
    ngoProfiles: new Map(),
    idempotencyKeys: new Map(),
    contacts: new Map(),
    sentEmails: new Map(),
  };
  initializeMockNGOs();
}

/**
 * Get current state of mock database
 */
export function getMockDatabaseState(): typeof mockDatabase {
  return mockDatabase;
}
