/**
 * Test Suite for Hard Constraints & Invariants
 * 
 * Validates all critical constraints:
 * - No auto-dispatch emails without explicit approval
 * - HubSpot records are never modified
 * - Supabase is single source of truth for workflow state
 * - Risk scores never block outreach
 * - All operations are idempotent
 * - AI outputs are validated against schemas
 */

import * as assert from 'assert';
import * as schemas from '../shared/schemas';
import * as validation from '../shared/validation';
import * as mocks from '../integrations/mocks';
import { ReachOutWorkflow } from '../backend/workflow';
import { v4 as uuidv4 } from 'uuid';

// Test logger
const logger = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${msg}`);
};

describe('Hard Constraints & Invariants', () => {
  let workflow: ReachOutWorkflow;
  let supabase: mocks.MockSupabaseService;
  let email: mocks.MockEmailService;
  let hubspot: mocks.MockHubSpotService;
  let ai: mocks.MockAIService;

  beforeEach(() => {
    // Reset mock database before each test
    mocks.resetMockDatabase();

    // Initialize mock services
    supabase = new mocks.MockSupabaseService(logger);
    email = new mocks.MockEmailService(logger);
    hubspot = new mocks.MockHubSpotService(logger);
    ai = new mocks.MockAIService(logger);

    // Initialize workflow
    workflow = new ReachOutWorkflow(supabase, email, hubspot, ai);
  });

  describe('CONSTRAINT 1: No auto-dispatch without explicit approval', () => {
    it('Should NOT send email without approval record', async () => {
      // Create campaign
      const campaign: schemas.OutreachCampaign = {
        id: uuidv4(),
        name: 'Test Campaign',
        description: 'Test outreach campaign',
        stage: 'approved',
        targetNGOs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
      };

      // Create NGO
      const ngoProfile: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'Test NGO',
        email: 'test@example.com',
        domain: 'education',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngoProfile);

      // Initiate workflow
      const ctx = {
        campaignId: campaign.id,
        ngoId: ngoProfile.id,
        userId: 'test-user',
        logger,
      };

      const initResult = await workflow.initiateOutreach(ctx, ngoProfile);
      assert.ok(initResult.success, 'Workflow should initialize');

      // Generate email
      const emailResult = await workflow.generateEmailDraft(ctx, initResult.workflowId!, campaign);
      assert.ok(emailResult.success, 'Email draft should generate');

      // Try to send without approval (should fail)
      const sendResult = await workflow.sendEmailWithApproval(ctx, emailResult.draftEmail!.id, {} as schemas.UserApproval);
      assert.ok(!sendResult.success, 'CONSTRAINT VIOLATED: Email sent without approval');
    });

    it('Should send email only with valid explicit approval', async () => {
      const campaign: schemas.OutreachCampaign = {
        id: uuidv4(),
        name: 'Test Campaign',
        description: 'Test outreach campaign',
        stage: 'approved',
        targetNGOs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
      };

      const ngoProfile: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'Test NGO',
        email: 'test@example.com',
        domain: 'education',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngoProfile);

      const ctx = {
        campaignId: campaign.id,
        ngoId: ngoProfile.id,
        userId: 'test-user',
        logger,
      };

      const initResult = await workflow.initiateOutreach(ctx, ngoProfile);
      const emailResult = await workflow.generateEmailDraft(ctx, initResult.workflowId!, campaign);

      // Create explicit approval
      const approval: schemas.UserApproval = {
        id: uuidv4(),
        resourceType: 'email',
        resourceId: emailResult.draftEmail!.id,
        approvedBy: 'test-user',
        approvalText: 'Approved for sending',
        approvedAt: new Date().toISOString(),
      };

      await workflow.recordApproval(ctx, approval);

      // Now send with approval
      const sendResult = await workflow.sendEmailWithApproval(ctx, emailResult.draftEmail!.id, approval);
      assert.ok(sendResult.success, 'Email should send with valid approval');
      assert.ok(sendResult.sentAt, 'Should have sentAt timestamp');
    });
  });

  describe('CONSTRAINT 2: HubSpot is read-only, never modified', () => {
    it('Should NOT modify existing HubSpot records', async () => {
      // Create a contact
      const contact = await hubspot.createContactIfNotExists({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });

      assert.ok(contact.success && contact.isNew, 'Contact should be created');
      const originalContact = contact.contact!;

      // Try to "update" by creating again
      const secondResult = await hubspot.createContactIfNotExists({
        email: 'test@example.com',
        firstName: 'Modified',
        lastName: 'Name',
      });

      assert.ok(!secondResult.isNew, 'Should not create duplicate');
      assert.equal(secondResult.contact!.firstName, 'Test', 'CONSTRAINT VIOLATED: Record was modified');
      assert.equal(secondResult.contact!.id, originalContact.id, 'Should return existing contact');
    });

    it('Should allow reading HubSpot records', async () => {
      await hubspot.createContactIfNotExists({
        email: 'read-test@example.com',
        firstName: 'Read',
        lastName: 'Test',
      });

      const retrieved = await hubspot.getContactByEmail('read-test@example.com');
      assert.ok(retrieved, 'Should retrieve contact by email');
      assert.equal(retrieved!.email, 'read-test@example.com');
    });
  });

  describe('CONSTRAINT 3: Supabase is single source of truth for workflow state', () => {
    it('Should persist workflow state to Supabase', async () => {
      const ngo: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'Test NGO',
        email: 'test@example.com',
        domain: 'education',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngo);

      const ctx = {
        campaignId: uuidv4(),
        ngoId: ngo.id,
        userId: 'test-user',
        logger,
      };

      const result = await workflow.initiateOutreach(ctx, ngo);
      assert.ok(result.success, 'Workflow should initialize');

      // Verify in Supabase
      const retrieved = await supabase.getWorkflowState(result.workflowId!);
      assert.ok(retrieved, 'Workflow state should be in Supabase');
      assert.equal(retrieved!.stage, 'initial_research');
    });

    it('Should support workflow state updates', async () => {
      const workflowId = uuidv4();
      const state: schemas.WorkflowState = {
        id: workflowId,
        campaignId: uuidv4(),
        ngoId: uuidv4(),
        stage: 'initial_research',
        data: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
      };

      await supabase.saveWorkflowState(state);

      const updated = await supabase.updateWorkflowStage(workflowId, 'risk_assessment', { riskScore: 45 });
      assert.ok(updated.success);
      assert.equal(updated.state!.stage, 'risk_assessment');
      assert.equal((updated.state!.data as any).riskScore, 45);
    });
  });

  describe('CONSTRAINT 4: Risk assessment is advisory only', () => {
    it('Should NOT block outreach based on risk score', async () => {
      const ngo: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'High Risk NGO',
        email: 'highrisk@example.com',
        domain: 'advocacy',
        riskScore: 95, // Very high risk
        controversySummary: 'Known for controversial positions',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngo);

      const ctx = {
        campaignId: uuidv4(),
        ngoId: ngo.id,
        userId: 'test-user',
        logger,
      };

      // Get advisory assessment
      const assessment = await workflow.getAdvisoryRiskAssessment(ctx, ngo.id);
      assert.ok(assessment, 'Should retrieve assessment');
      assert.equal(assessment!.riskScore, 95);
      assert.ok(assessment!.advisoryOnly, 'Assessment must be marked advisory-only');

      // Should still be able to proceed with outreach
      const initResult = await workflow.initiateOutreach(ctx, ngo);
      assert.ok(initResult.success, 'CONSTRAINT VIOLATED: Outreach blocked by risk score');
    });
  });

  describe('CONSTRAINT 5: Operations are idempotent', () => {
    it('Should prevent duplicate email sends via idempotency', async () => {
      const campaign: schemas.OutreachCampaign = {
        id: uuidv4(),
        name: 'Test Campaign',
        description: 'Test',
        stage: 'approved',
        targetNGOs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
      };

      const ngo: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'Test NGO',
        email: 'test@example.com',
        domain: 'education',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngo);

      const ctx = {
        campaignId: campaign.id,
        ngoId: ngo.id,
        userId: 'test-user',
        logger,
      };

      const initResult = await workflow.initiateOutreach(ctx, ngo);
      const emailResult = await workflow.generateEmailDraft(ctx, initResult.workflowId!, campaign);

      const approval: schemas.UserApproval = {
        id: uuidv4(),
        resourceType: 'email',
        resourceId: emailResult.draftEmail!.id,
        approvedBy: 'test-user',
        approvalText: 'Approved',
        approvedAt: new Date().toISOString(),
      };

      await workflow.recordApproval(ctx, approval);

      // Send first time
      const firstSend = await workflow.sendEmailWithApproval(ctx, emailResult.draftEmail!.id, approval);
      assert.ok(firstSend.success, 'First send should succeed');

      // Try to send again (should be idempotent)
      const secondSend = await workflow.sendEmailWithApproval(ctx, emailResult.draftEmail!.id, approval);
      assert.ok(secondSend.success, 'Second send should also return success');
      assert.ok(secondSend.message?.includes('already sent'), 'Should indicate already sent');
    });
  });

  describe('CONSTRAINT 6: AI outputs validated against schema', () => {
    it('Should validate AI-generated email structure', async () => {
      const validEmail: schemas.AIGeneratedEmail = {
        subject: 'Test Subject',
        body: 'Test body',
        tone: 'professional',
        targetNGOName: 'Test NGO',
        personalizationNotes: ['Note 1', 'Note 2'],
        confidence: 0.85,
        validationErrors: [],
      };

      const result = validation.validateAIGeneratedEmail(validEmail);
      assert.ok(result.valid, 'Valid email should pass validation');
    });

    it('Should reject invalid AI output', () => {
      const invalidEmail = {
        subject: 'Test',
        // missing required fields
      };

      const result = validation.validateAIGeneratedEmail(invalidEmail);
      assert.ok(!result.valid, 'Invalid email should fail validation');
      assert.ok(result.errors.length > 0, 'Should report specific errors');
    });

    it('Should reject confidence outside valid range', () => {
      const email: schemas.AIGeneratedEmail = {
        subject: 'Test',
        body: 'Test',
        tone: 'professional',
        targetNGOName: 'Test',
        personalizationNotes: [],
        confidence: 1.5, // Invalid: > 1
        validationErrors: [],
      };

      const result = validation.validateAIGeneratedEmail(email);
      assert.ok(!result.valid, 'Should reject invalid confidence');
    });
  });

  describe('CONSTRAINT 7: Draft emails before sending', () => {
    it('Should not send email in draft status', async () => {
      const campaign: schemas.OutreachCampaign = {
        id: uuidv4(),
        name: 'Test',
        description: 'Test',
        stage: 'approved',
        targetNGOs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'test-user',
      };

      const ngo: schemas.NGOProfile = {
        id: uuidv4(),
        name: 'Test',
        email: 'test@example.com',
        domain: 'education',
        selectedForOutreach: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await supabase.saveNGOProfile(ngo);

      const ctx = {
        campaignId: campaign.id,
        ngoId: ngo.id,
        userId: 'test-user',
        logger,
      };

      const initResult = await workflow.initiateOutreach(ctx, ngo);
      const emailResult = await workflow.generateEmailDraft(ctx, initResult.workflowId!, campaign);

      // Email should be in draft status
      assert.equal(emailResult.draftEmail!.status, 'draft', 'Generated email should be in draft status');

      // Verify it's stored in Supabase
      const stored = await supabase.getDraftEmail(emailResult.draftEmail!.id);
      assert.equal(stored!.status, 'draft', 'Stored email should remain in draft status');
    });
  });

  describe('Schema validation for all major types', () => {
    it('Should validate DraftEmail schema', () => {
      const email: schemas.DraftEmail = {
        id: uuidv4(),
        campaignId: uuidv4(),
        ngoId: uuidv4(),
        status: 'draft',
        subject: 'Test',
        body: 'Test body',
        recipientEmail: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validation.validateDraftEmail(email);
      assert.ok(result.valid, 'Valid draft email should pass');
    });

    it('Should reject invalid email in DraftEmail', () => {
      const email = {
        id: uuidv4(),
        campaignId: uuidv4(),
        ngoId: uuidv4(),
        status: 'draft',
        subject: 'Test',
        body: 'Test',
        recipientEmail: 'invalid-email', // Invalid format
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validation.validateDraftEmail(email);
      assert.ok(!result.valid, 'Invalid email format should fail');
    });

    it('Should validate UserApproval schema', () => {
      const approval: schemas.UserApproval = {
        id: uuidv4(),
        resourceType: 'email',
        resourceId: uuidv4(),
        approvedBy: 'user-123',
        approvalText: 'Looks good',
        approvedAt: new Date().toISOString(),
      };

      const result = validation.validateUserApproval(approval);
      assert.ok(result.valid, 'Valid approval should pass');
    });
  });
});

// Run tests if this is the main module
if (require.main === module) {
  let passedCount = 0;
  let failedCount = 0;

  const originalDescribe = global.describe as any;
  const originalIt = global.it as any;
  const originalBeforeEach = global.beforeEach as any;

  (global as any).describe = (name: string, fn: () => void) => {
    console.log(`\n${name}`);
    fn();
  };

  (global as any).it = (name: string, fn: () => Promise<void> | void) => {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    ${err.message}`);
          failedCount++;
        });
      } else {
        console.log(`  ✓ ${name}`);
        passedCount++;
      }
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${(err as Error).message}`);
      failedCount++;
    }
  };

  (global as any).beforeEach = (fn: () => void) => {
    fn();
  };
}

export {};
