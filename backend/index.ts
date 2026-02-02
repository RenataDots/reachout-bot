/**
 * Backend Entry Point
 * 
 * Example usage of the Reach Out Bot workflow in mock mode.
 * Run with: npm run dev
 */

import * as mocks from '../integrations/mocks';
import * as schemas from '../shared/schemas';
import { ReachOutWorkflow } from './workflow';
import { v4 as uuidv4 } from 'uuid';

const logger = (msg: string, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] [${levelStr}] ${msg}`);
};

/**
 * Example: Full workflow execution
 */
async function exampleFullWorkflow() {
  logger('=== Reach Out Bot MVP Example Workflow ===', 'info');
  logger('Running in MOCK mode (no external services contacted)', 'info');
  logger('');

  // Initialize mock services
  const supabase = new mocks.MockSupabaseService(logger);
  const email = new mocks.MockEmailService(logger);
  const hubspot = new mocks.MockHubSpotService(logger);
  const ai = new mocks.MockAIService(logger);

  // Create workflow
  const workflow = new ReachOutWorkflow(supabase, email, hubspot, ai);

  logger('Step 1: Creating test campaign and NGO profile', 'info');

  // Create campaign
  const campaign: schemas.OutreachCampaign = {
    id: uuidv4(),
    name: 'Global Health Initiative Q1 2026',
    description: `We're launching a collaborative initiative to improve healthcare access in underserved regions.
We believe organizations like yours could be powerful partners in this effort.
We'd love to explore potential synergies and ways we might work together.`,
    stage: 'approved',
    targetNGOs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'campaign-creator',
  };

  // Create NGO profile
  const ngoProfile: schemas.NGOProfile = {
    id: uuidv4(),
    name: 'Doctors Without Borders',
    email: 'partnerships@doctorswithoutborders.org',
    domain: 'healthcare',
    riskScore: 15, // Very low risk
    controversySummary: 'Well-established organization, no major controversies',
    selectedForOutreach: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save NGO profile to database
  await supabase.saveNGOProfile(ngoProfile);
  logger(`Created NGO: ${ngoProfile.name}`, 'info');

  // Workflow context
  const ctx = {
    campaignId: campaign.id,
    ngoId: ngoProfile.id,
    userId: 'campaign-creator',
    logger,
  };

  logger('', 'info');
  logger('Step 2: Initiating outreach workflow', 'info');

  // Initiate workflow
  const initResult = await workflow.initiateOutreach(ctx, ngoProfile);
  if (!initResult.success) {
    logger(`Failed to initiate workflow: ${initResult.error}`, 'error');
    return;
  }

  const workflowId = initResult.workflowId!;
  logger(`Workflow initiated: ${workflowId}`, 'info');

  logger('', 'info');
  logger('Step 3: Generating email draft (NO SENDING YET)', 'info');

  // Generate draft email
  const emailResult = await workflow.generateEmailDraft(ctx, workflowId, campaign);
  if (!emailResult.success) {
    logger(`Failed to generate email: ${emailResult.error}`, 'error');
    return;
  }

  const draftEmail = emailResult.draftEmail!;
  logger(`Draft email created: ${draftEmail.id}`, 'info');
  logger(`Status: ${draftEmail.status} (awaiting approval)`, 'info');
  logger(`Subject: ${draftEmail.subject}`, 'info');
  logger(`Recipient: ${draftEmail.recipientEmail}`, 'info');

  logger('', 'info');
  logger('Step 4: [USER REVIEW] Email is presented to human for approval', 'info');
  logger('(In UI, user would review and approve)', 'info');

  // Simulate user approval
  const approval: schemas.UserApproval = {
    id: uuidv4(),
    resourceType: 'email',
    resourceId: draftEmail.id,
    approvedBy: 'campaign-creator',
    approvalText: 'Email looks great! Personalization is appropriate. Send it.',
    approvedAt: new Date().toISOString(),
  };

  logger('', 'info');
  logger('Step 5: Recording user approval', 'info');

  const approvalResult = await workflow.recordApproval(ctx, approval);
  if (!approvalResult.success) {
    logger(`Failed to record approval: ${approvalResult.error}`, 'error');
    return;
  }

  logger(`Approval recorded: ${approval.id}`, 'info');
  logger(`Approved by: ${approval.approvedBy}`, 'info');

  logger('', 'info');
  logger('Step 6: Sending email with documented approval', 'info');

  // Send email with approval
  const sendResult = await workflow.sendEmailWithApproval(ctx, draftEmail.id, approval);
  if (!sendResult.success) {
    logger(`Failed to send email: ${sendResult.error}`, 'error');
    return;
  }

  logger(`Email sent successfully!`, 'info');
  logger(`Message ID: ${sendResult.messageId}`, 'info');
  logger(`Sent at: ${sendResult.sentAt}`, 'info');

  logger('', 'info');
  logger('Step 7: Checking advisory risk assessment', 'info');

  const assessment = await workflow.getAdvisoryRiskAssessment(ctx, ngoProfile.id);
  logger(`Risk Score: ${assessment?.riskScore}/100 (ADVISORY ONLY)`, 'info');
  logger(`Summary: ${assessment?.controversySummary}`, 'info');
  logger(`Note: Risk score never blocks outreach - for human review only`, 'info');

  logger('', 'info');
  logger('=== Workflow Complete ===', 'info');
  logger('All operations were:', 'info');
  logger('  ✓ Explicit (required user approval)', 'info');
  logger('  ✓ Validated (all data against schemas)', 'info');
  logger('  ✓ Idempotent (safe to retry)', 'info');
  logger('  ✓ Auditable (full state trail)', 'info');
  logger('', 'info');

  // Show what was persisted
  logger('Persisted Data:', 'info');
  logger(`- Mock data directory: ${process.env.MOCK_DATA_DIR || './mock-data'}`, 'info');
  logger('- Check mock-data/sent-email-*.json for email details', 'info');
  logger('- Check mock-data/mock-database.json for full state', 'info');
}

/**
 * Run example
 */
async function main() {
  try {
    await exampleFullWorkflow();
  } catch (err) {
    logger(`Fatal error: ${(err as Error).message}`, 'error');
    console.error(err);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

export { exampleFullWorkflow };
