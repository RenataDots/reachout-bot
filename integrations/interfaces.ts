/**
 * Integration Interfaces
 * 
 * All external integrations are abstracted behind interfaces that support
 * mock or sandbox implementations for local testing.
 * 
 * HARD CONSTRAINT: Local execution must support running without cloud deployment.
 */

import * as schemas from '../shared/schemas';

/**
 * Gmail Integration Interface
 * 
 * HARD CONSTRAINT: No auto-dispatch. All emails require explicit per-message approval.
 */
export interface IEmailService {
  /**
   * Send an approved email
   * Only callable after explicit user approval has been recorded
   */
  sendApprovedEmail(draftEmail: schemas.DraftEmail, approval: schemas.UserApproval): Promise<EmailSendResult>;

  /**
   * Schedule a follow-up email (with explicit approval)
   * Must track idempotency to prevent duplicate sends
   */
  scheduleFollowUp(
    draftEmail: schemas.DraftEmail,
    approval: schemas.UserApproval,
    delayMs: number,
    idempotencyKey: string,
  ): Promise<FollowUpScheduleResult>;
}

export interface EmailSendResult {
  success: boolean;
  emailId?: string;
  messageId?: string;
  sentAt?: string;
  error?: string;
}

export interface FollowUpScheduleResult {
  success: boolean;
  scheduledEmailId?: string;
  scheduledAt?: string;
  error?: string;
}

/**
 * HubSpot Integration Interface
 * 
 * HARD CONSTRAINT: HubSpot is single source of truth for CRM data.
 * We NEVER modify, enrich, or overwrite existing HubSpot records.
 * Read-only operations only.
 */
export interface IHubSpotService {
  /**
   * Retrieve a contact by email (read-only)
   */
  getContactByEmail(email: string): Promise<schemas.HubSpotContact | null>;

  /**
   * Retrieve a contact by ID (read-only)
   */
  getContactById(id: string): Promise<schemas.HubSpotContact | null>;

  /**
   * List contacts (read-only)
   */
  listContacts(limit: number, offset: number): Promise<schemas.HubSpotContact[]>;

  /**
   * Create a NEW contact only if it doesn't already exist
   * Never modifies existing records
   */
  createContactIfNotExists(contact: Partial<schemas.HubSpotContact>): Promise<CreateContactResult>;
}

export interface CreateContactResult {
  success: boolean;
  contact?: schemas.HubSpotContact;
  isNew: boolean; // true if newly created, false if already existed
  error?: string;
}

/**
 * Google Drive Integration Interface
 * 
 * For storing campaign documents, research notes, and approval records
 */
export interface IGoogleDriveService {
  /**
   * Upload a file to a specific folder
   */
  uploadFile(folderId: string, fileName: string, mimeType: string, content: string): Promise<DriveFileResult>;

  /**
   * Create a new folder
   */
  createFolder(parentFolderId: string, folderName: string): Promise<DriveFolderResult>;

  /**
   * List files in a folder
   */
  listFiles(folderId: string): Promise<DriveFile[]>;

  /**
   * Download file content
   */
  downloadFile(fileId: string): Promise<string>;
}

export interface DriveFileResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  url?: string;
  error?: string;
}

export interface DriveFolderResult {
  success: boolean;
  folderId?: string;
  folderName?: string;
  error?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  webViewLink: string;
}

/**
 * Supabase Integration Interface
 * 
 * HARD CONSTRAINT: Supabase is the single source of truth for workflow state.
 */
export interface ISupabaseService {
  /**
   * Store workflow state
   */
  saveWorkflowState(state: schemas.WorkflowState): Promise<WorkflowStateResult>;

  /**
   * Retrieve workflow state
   */
  getWorkflowState(id: string): Promise<schemas.WorkflowState | null>;

  /**
   * Query workflow states by campaign
   */
  getWorkflowStatesByCampaign(campaignId: string): Promise<schemas.WorkflowState[]>;

  /**
   * Update workflow state stage
   */
  updateWorkflowStage(stateId: string, newStage: schemas.WorkflowStage, data: Record<string, unknown>): Promise<WorkflowStateResult>;

  /**
   * Store draft email (not sent yet)
   */
  saveDraftEmail(email: schemas.DraftEmail): Promise<DraftEmailResult>;

  /**
   * Retrieve draft email
   */
  getDraftEmail(id: string): Promise<schemas.DraftEmail | null>;

  /**
   * List draft emails by campaign
   */
  listDraftEmailsByCampaign(campaignId: string): Promise<schemas.DraftEmail[]>;

  /**
   * Store user approval record
   */
  saveUserApproval(approval: schemas.UserApproval): Promise<UserApprovalResult>;

  /**
   * Retrieve user approval
   */
  getUserApproval(id: string): Promise<schemas.UserApproval | null>;

  /**
   * Check if resource has approval
   */
  hasApproval(resourceType: string, resourceId: string): Promise<boolean>;

  /**
   * Store NGO profile
   */
  saveNGOProfile(profile: schemas.NGOProfile): Promise<NGOProfileResult>;

  /**
   * Retrieve NGO profile
   */
  getNGOProfile(id: string): Promise<schemas.NGOProfile | null>;

  /**
   * Store idempotency key to prevent duplicate operations
   */
  recordIdempotencyKey(key: schemas.IdempotencyKey): Promise<IdempotencyResult>;

  /**
   * Check if operation was already performed
   */
  getIdempotencyKey(key: string): Promise<schemas.IdempotencyKey | null>;
}

export interface WorkflowStateResult {
  success: boolean;
  state?: schemas.WorkflowState;
  error?: string;
}

export interface DraftEmailResult {
  success: boolean;
  email?: schemas.DraftEmail;
  error?: string;
}

export interface UserApprovalResult {
  success: boolean;
  approval?: schemas.UserApproval;
  error?: string;
}

export interface NGOProfileResult {
  success: boolean;
  profile?: schemas.NGOProfile;
  error?: string;
}

export interface IdempotencyResult {
  success: boolean;
  key?: schemas.IdempotencyKey;
  error?: string;
}

/**
 * AI Generation Service Interface
 * 
 * For generating personalized email content
 */
export interface IAIService {
  /**
   * Generate email content for an NGO
   * Output MUST be validated against AIGeneratedEmailSchema before use
   */
  generateEmail(ngo: schemas.NGOProfile, campaign: schemas.OutreachCampaign): Promise<AIGenerationResult>;

  /**
   * Generate email with custom prompt
   */
  generateEmailWithPrompt(prompt: string): Promise<AIGenerationResult>;
}

export interface AIGenerationResult {
  success: boolean;
  data?: schemas.AIGeneratedEmail;
  error?: string;
  rawResponse?: unknown;
}
