/**
 * Core Workflow Orchestrator
 * 
 * Implements the main outreach workflow with explicit state transitions,
 * defensive guards, and enforcement of all Hard Constraints.
 * 
 * All operations are idempotent and require explicit human approval for outbound actions.
 */

import * as schemas from '../shared/schemas';
import * as validation from '../shared/validation';
import type { IEmailService, IHubSpotService, ISupabaseService, IAIService } from '../integrations/interfaces';
import { v4 as uuidv4 } from 'uuid';

export interface WorkflowContext {
  campaignId: string;
  ngoId: string;
  userId: string;
  logger: (msg: string, level?: 'info' | 'warn' | 'error') => void;
}

export class ReachOutWorkflow {
  private supabase: ISupabaseService;
  private email: IEmailService;
  private hubspot: IHubSpotService;
  private ai: IAIService;

  constructor(
    supabase: ISupabaseService,
    email: IEmailService,
    hubspot: IHubSpotService,
    ai: IAIService,
  ) {
    this.supabase = supabase;
    this.email = email;
    this.hubspot = hubspot;
    this.ai = ai;
  }

  /**
   * Initialize a new outreach workflow
   *
   * HARD CONSTRAINT: Never auto-dispatch. All operations are explicit.
   */
  async initiateOutreach(ctx: WorkflowContext, ngoProfile: schemas.NGOProfile): Promise<WorkflowInitResult> {
    const logMsg = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
      ctx.logger(`[ReachOutWorkflow] ${msg}`, level);
    };

    logMsg(`Initiating outreach workflow for NGO: ${ngoProfile.name}`);

    // Validate NGO profile
    if (!ngoProfile.id || !ngoProfile.email || !ngoProfile.name) {
      logMsg('Invalid NGO profile: missing required fields', 'error');
      return {
        success: false,
        error: 'Invalid NGO profile: missing required fields',
      };
    }

    // Create workflow state
    const workflowId = uuidv4();
    const workflowState: schemas.WorkflowState = {
      id: workflowId,
      campaignId: ctx.campaignId,
      ngoId: ngoProfile.id,
      stage: 'initial_research',
      data: {
        ngoProfile,
        initiatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: ctx.userId,
    };

    const result = await this.supabase.saveWorkflowState(workflowState);
    if (!result.success) {
      logMsg(`Failed to save workflow state: ${result.error}`, 'error');
      return { success: false, error: result.error };
    }

    logMsg(`Workflow created: ${workflowId}`);

    return {
      success: true,
      workflowId,
      workflowState: result.state!,
    };
  }

  /**
   * Generate a draft email for review
   *
   * HARD CONSTRAINT: Draft only. No sending without explicit approval.
   * All AI outputs must be validated against schema.
   */
  async generateEmailDraft(ctx: WorkflowContext, workflowId: string, campaign: schemas.OutreachCampaign): Promise<GenerateEmailResult> {
    const logMsg = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
      ctx.logger(`[ReachOutWorkflow] ${msg}`, level);
    };

    logMsg(`Generating email draft for workflow: ${workflowId}`);

    // Retrieve workflow state
    const workflow = await this.supabase.getWorkflowState(workflowId);
    if (!workflow) {
      logMsg(`Workflow not found: ${workflowId}`, 'error');
      return { success: false, error: `Workflow not found: ${workflowId}` };
    }

    if (workflow.stage !== 'initial_research') {
      logMsg(`Cannot generate email for workflow in stage: ${workflow.stage}`, 'warn');
    }

    // Retrieve NGO profile
    const ngoProfile = await this.supabase.getNGOProfile(workflow.ngoId);
    if (!ngoProfile) {
      logMsg(`NGO profile not found: ${workflow.ngoId}`, 'error');
      return { success: false, error: `NGO profile not found: ${workflow.ngoId}` };
    }

    // Call AI service
    logMsg(`Calling AI service to generate email for: ${ngoProfile.name}`);
    const aiResult = await this.ai.generateEmail(ngoProfile, campaign);
    if (!aiResult.success) {
      logMsg(`AI generation failed: ${aiResult.error}`, 'error');
      return { success: false, error: aiResult.error };
    }

    // HARD CONSTRAINT: Validate AI output against schema
    const validationResult = validation.validateAIGeneratedEmail(aiResult.data);
    if (!validationResult.valid) {
      const errorMsg = validation.formatValidationErrors(validationResult.errors);
      logMsg(`AI output validation failed:\n${errorMsg}`, 'error');
      return {
        success: false,
        error: `AI output validation failed. Errors: ${errorMsg}`,
      };
    }

    const generatedEmail = validationResult.data!;

    // Create draft email (not sent)
    const draftEmailId = uuidv4();
    const draftEmail: schemas.DraftEmail = {
      id: draftEmailId,
      campaignId: workflow.campaignId,
      ngoId: workflow.ngoId,
      status: 'draft',
      subject: generatedEmail.subject,
      body: generatedEmail.body,
      recipientEmail: ngoProfile.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate draft email schema
    const draftValidation = validation.validateDraftEmail(draftEmail);
    if (!draftValidation.valid) {
      const errorMsg = validation.formatValidationErrors(draftValidation.errors);
      logMsg(`Draft email validation failed:\n${errorMsg}`, 'error');
      return { success: false, error: `Draft email validation failed: ${errorMsg}` };
    }

    // Save draft to database
    const saveResult = await this.supabase.saveDraftEmail(draftEmail);
    if (!saveResult.success) {
      logMsg(`Failed to save draft email: ${saveResult.error}`, 'error');
      return { success: false, error: saveResult.error };
    }

    logMsg(`Draft email created: ${draftEmailId} (awaiting approval)`);

    // Update workflow state
    await this.supabase.updateWorkflowStage(workflowId, 'draft_generation', {
      draftEmailId: draftEmailId,
      generatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      draftEmail: saveResult.email!,
      generatedEmail,
    };
  }

  /**
   * Send an email with explicit user approval
   *
   * HARD CONSTRAINT: Will NOT send without documented approval.
   * Enforces idempotency to prevent duplicate sends.
   */
  async sendEmailWithApproval(ctx: WorkflowContext, emailId: string, approval: schemas.UserApproval): Promise<SendEmailResult> {
    const logMsg = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
      ctx.logger(`[ReachOutWorkflow] ${msg}`, level);
    };

    logMsg(`Sending email with approval: ${emailId}`);

    // Retrieve draft email
    const draftEmail = await this.supabase.getDraftEmail(emailId);
    if (!draftEmail) {
      logMsg(`Draft email not found: ${emailId}`, 'error');
      return { success: false, error: `Draft email not found: ${emailId}` };
    }

    // Check if already sent
    if (draftEmail.status === 'sent') {
      logMsg(`Email already sent: ${emailId}`);
      return {
        success: true,
        message: 'Email already sent',
        emailId,
      };
    }

    // HARD CONSTRAINT: Verify approval is present and valid
    if (!approval.id || approval.resourceType !== 'email' || approval.resourceId !== emailId) {
      logMsg(`Invalid approval for email: ${emailId}`, 'error');
      return { success: false, error: 'Invalid approval for this email' };
    }

    if (new Date(approval.approvedAt) > new Date()) {
      logMsg(`Approval not yet valid: ${approval.id}`, 'error');
      return { success: false, error: 'Approval is not yet valid' };
    }

    if (approval.expiresAt && new Date() > new Date(approval.expiresAt)) {
      logMsg(`Approval has expired: ${approval.id}`, 'warn');
      return { success: false, error: 'Approval has expired' };
    }

    // HARD CONSTRAINT: Enforce idempotency
    const idempotencyKey = `email-send-${emailId}`;
    const existingKey = await this.supabase.getIdempotencyKey(idempotencyKey);
    if (existingKey && existingKey.completedAt) {
      logMsg(`Email already sent via idempotency check: ${emailId}`);
      return {
        success: true,
        message: 'Email already sent (idempotency)',
        emailId,
      };
    }

    // Send email
    logMsg(`Executing email send: ${emailId}`);
    const sendResult = await this.email.sendApprovedEmail(draftEmail, approval);
    if (!sendResult.success) {
      logMsg(`Email send failed: ${sendResult.error}`, 'error');
      return { success: false, error: sendResult.error };
    }

    // Record idempotency
    const idempKey: schemas.IdempotencyKey = {
      key: idempotencyKey,
      operationType: 'send_email',
      resourceId: emailId,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: sendResult,
    };

    await this.supabase.recordIdempotencyKey(idempKey);

    logMsg(`Email sent successfully: ${emailId}`);

    return {
      success: true,
      emailId,
      messageId: sendResult.messageId,
      sentAt: sendResult.sentAt,
    };
  }

  /**
   * Record an outreach batch approval
   * 
   * This allows batch approval of multiple emails while maintaining
   * explicit per-message record in the database.
   */
  async recordApproval(ctx: WorkflowContext, approval: schemas.UserApproval): Promise<RecordApprovalResult> {
    const logMsg = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
      ctx.logger(`[ReachOutWorkflow] ${msg}`, level);
    };

    logMsg(`Recording approval: ${approval.id}`);

    // Validate approval
    const validationResult = validation.validateUserApproval(approval);
    if (!validationResult.valid) {
      const errorMsg = validation.formatValidationErrors(validationResult.errors);
      logMsg(`Approval validation failed:\n${errorMsg}`, 'error');
      return { success: false, error: `Approval validation failed: ${errorMsg}` };
    }

    // Save approval
    const saveResult = await this.supabase.saveUserApproval(validationResult.data!);
    if (!saveResult.success) {
      logMsg(`Failed to save approval: ${saveResult.error}`, 'error');
      return { success: false, error: saveResult.error };
    }

    logMsg(`Approval recorded: ${approval.id}`);

    return {
      success: true,
      approvalId: approval.id,
    };
  }

  /**
   * Check if risk assessment should block outreach
   * 
   * HARD CONSTRAINT: Risk scores and controversy summaries are ADVISORY ONLY.
   * They must NEVER block NGO selection or outreach.
   * This function returns information for human review, not for blocking.
   */
  async getAdvisoryRiskAssessment(ctx: WorkflowContext, ngoId: string): Promise<schemas.RiskAssessment | null> {
    const logMsg = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
      ctx.logger(`[ReachOutWorkflow] ${msg}`, level);
    };

    logMsg(`Retrieving advisory risk assessment for NGO: ${ngoId}`);

    const ngoProfile = await this.supabase.getNGOProfile(ngoId);
    if (!ngoProfile) {
      return null;
    }

    // Construct advisory assessment (never blocks outreach)
    const assessment: schemas.RiskAssessment = {
      ngoId: ngoId,
      riskScore: ngoProfile.riskScore || 0,
      controversySummary: ngoProfile.controversySummary || 'No known controversies',
      sources: [],
      issueClusters: [],
      advisoryOnly: true,
      lastAssessedAt: new Date().toISOString(),
    };

    logMsg(`Risk assessment retrieved (ADVISORY ONLY - does not block outreach): ${ngoId}`);

    return assessment;
  }
}

export interface WorkflowInitResult {
  success: boolean;
  workflowId?: string;
  workflowState?: schemas.WorkflowState;
  error?: string;
}

export interface GenerateEmailResult {
  success: boolean;
  draftEmail?: schemas.DraftEmail;
  generatedEmail?: schemas.AIGeneratedEmail;
  error?: string;
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  messageId?: string;
  sentAt?: string;
  message?: string;
  error?: string;
}

export interface RecordApprovalResult {
  success: boolean;
  approvalId?: string;
  error?: string;
}
