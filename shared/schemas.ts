/**
 * Shared JSON Schemas for Reach Out Bot MVP
 * 
 * All AI outputs, external API responses, and workflow state must conform
 * to these explicit schemas before downstream use.
 * 
 * HARD CONSTRAINT: JSON schema validation is mandatory before any side effects.
 */

export interface NGOProfile {
  id: string;
  name: string;
  email: string;
  domain: string;
  geography?: string;
  focusAreas?: string[];
  fitRationale?: string;
  partnerStatus?: 'potential' | 'engaged' | 'partner' | 'inactive';
  hubspotContactId?: string;
  riskScore?: number;
  controversySummary?: string;
  selectedForOutreach: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCampaign {
  id: string;
  name: string;
  description: string;
  stage: 'draft' | 'approved' | 'in_progress' | 'completed' | 'paused';
  targetNGOs: string[]; // Array of NGO IDs
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
}

/**
 * Draft Email Message - Requires explicit user approval before sending
 * 
 * HARD CONSTRAINT: Must never be sent without explicit per-message user approval.
 * This is the only safe form for storing email drafts.
 */
export interface DraftEmail {
  id: string;
  campaignId: string;
  ngoId: string;
  status: 'draft' | 'approved' | 'sent' | 'failed';
  subject: string;
  body: string;
  recipientEmail: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  sentAt?: string;
  sentBy?: string;
  failureReason?: string;
}

/**
 * Workflow State stored in Supabase
 * 
 * HARD CONSTRAINT: Supabase is the single source of truth for workflow state.
 */
export interface WorkflowState {
  id: string;
  campaignId: string;
  ngoId: string;
  stage: WorkflowStage;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type WorkflowStage =
  | 'initial_research'
  | 'risk_assessment'
  | 'ngo_selection'
  | 'draft_generation'
  | 'user_review'
  | 'approval_pending'
  | 'sending'
  | 'follow_up'
  | 'completed'
  | 'failed';

/**
 * HubSpot Contact Record (read-only)
 * 
 * HARD CONSTRAINT: We NEVER modify, enrich, or overwrite existing HubSpot records.
 * HubSpot is the single source of truth for CRM data.
 */
export interface HubSpotContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * AI-Generated Content Output
 * 
 * All AI outputs must be validated against this schema before use.
 */
export interface AIGeneratedEmail {
  subject: string;
  body: string;
  tone: 'professional' | 'friendly' | 'formal' | 'casual';
  targetNGOName: string;
  personalizationNotes: string[];
  confidence: number; // 0-1 confidence score
  validationErrors: string[];
}

/**
 * Reputational Risk Assessment
 * 
 * HARD CONSTRAINT: Risk scores and controversy summaries are ADVISORY ONLY.
 * They must NEVER block NGO selection or outreach.
 */
export interface RiskAssessment {
  ngoId: string;
  riskScore: number; // 0-100, higher = more risk
  controversySummary: string;
  sources: string[];
  issueClusters: string[];
  advisoryOnly: boolean; // Always true - for human review only
  lastAssessedAt: string;
}

/**
 * Idempotency Key for outbound side effects
 * 
 * HARD CONSTRAINT: All outbound side effects (emails, HubSpot creation, follow-ups)
 * must be idempotent. Use this key to prevent duplicates.
 */
export interface IdempotencyKey {
  key: string;
  operationType: 'send_email' | 'create_hubspot_record' | 'schedule_followup';
  resourceId: string; // Email ID, NGO ID, etc.
  createdAt: string;
  completedAt?: string;
  result?: unknown;
}

/**
 * User Approval Record
 * 
 * HARD CONSTRAINT: Explicit per-message approval before any side effects.
 */
export interface UserApproval {
  id: string;
  resourceType: 'email' | 'campaign' | 'outreach_batch';
  resourceId: string;
  approvedBy: string;
  approvalText: string;
  approvedAt: string;
  expiresAt?: string;
}

// JSON Schema Definitions for validation
export const NGOProfileSchema = {
  type: 'object' as const,
  required: ['id', 'name', 'email', 'domain', 'selectedForOutreach', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    domain: { type: 'string' },
    hubspotContactId: { type: 'string' },
    riskScore: { type: 'number', minimum: 0, maximum: 100 },
    controversySummary: { type: 'string' },
    selectedForOutreach: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const DraftEmailSchema = {
  type: 'object' as const,
  required: [
    'id',
    'campaignId',
    'ngoId',
    'status',
    'subject',
    'body',
    'recipientEmail',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: { type: 'string' },
    campaignId: { type: 'string' },
    ngoId: { type: 'string' },
    status: {
      type: 'string',
      enum: ['draft', 'approved', 'sent', 'failed'],
    },
    subject: { type: 'string' },
    body: { type: 'string' },
    recipientEmail: { type: 'string', format: 'email' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    approvedAt: { type: 'string', format: 'date-time' },
    approvedBy: { type: 'string' },
    sentAt: { type: 'string', format: 'date-time' },
    sentBy: { type: 'string' },
    failureReason: { type: 'string' },
  },
};

export const AIGeneratedEmailSchema = {
  type: 'object' as const,
  required: ['subject', 'body', 'tone', 'targetNGOName', 'personalizationNotes', 'confidence', 'validationErrors'],
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
    tone: {
      type: 'string',
      enum: ['professional', 'friendly', 'formal', 'casual'],
    },
    targetNGOName: { type: 'string' },
    personalizationNotes: {
      type: 'array',
      items: { type: 'string' },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    validationErrors: {
      type: 'array',
      items: { type: 'string' },
    },
  },
};

export const UserApprovalSchema = {
  type: 'object' as const,
  required: ['id', 'resourceType', 'resourceId', 'approvedBy', 'approvalText', 'approvedAt'],
  properties: {
    id: { type: 'string' },
    resourceType: {
      type: 'string',
      enum: ['email', 'campaign', 'outreach_batch'],
    },
    resourceId: { type: 'string' },
    approvedBy: { type: 'string' },
    approvalText: { type: 'string' },
    approvedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
};
