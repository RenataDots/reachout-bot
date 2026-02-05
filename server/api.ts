/**
 * Express API Server for Reach Out Bot
 *
 * Provides REST endpoints for:
 * - Creating campaigns and initiating workflows
 * - Generating email drafts
 * - Reviewing and approving emails
 * - Checking workflow status
 * - Retrieving mock data
 */

import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import * as mocks from "../integrations/mocks";
import * as schemas from "../shared/schemas";
import { ReachOutWorkflow } from "../backend/workflow";
import { searchNGOs } from "../integrations/ngo-search";
import { v4 as uuidv4 } from "uuid";

// Load environment variables from .env (if present)
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static("frontend"));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize mock services
const supabase = new mocks.MockSupabaseService(console.log);
const email = new mocks.MockEmailService(console.log);
const hubspot = new mocks.MockHubSpotService(console.log);
const ai = new mocks.MockAIService(console.log);

// Create workflow orchestrator
const workflow = new ReachOutWorkflow(supabase, email, hubspot, ai);

// Context for workflow operations
const getContext = (): any => ({
  userId: "web-user",
  userEmail: "admin@reachoutbot.local",
  timestamp: new Date().toISOString(),
  logger: (msg: string, level: "info" | "warn" | "error" = "info") => {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    console.log(`[${timestamp}] [${levelStr}] [API] ${msg}`);
  },
});

/**
 * GET /api/status
 * Get overall server status
 */
app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    mode: "mock",
    timestamp: new Date().toISOString(),
    message: "Reach Out Bot API - Mock Mode",
  });
});

/**
 * POST /api/campaigns
 * Create a test campaign
 */
app.post("/api/campaigns", (req: Request, res: Response) => {
  const { name, description } = req.body;

  const campaign: schemas.OutreachCampaign = {
    id: uuidv4(),
    name: name || "Test Campaign " + new Date().toLocaleString(),
    description: description || "Campaign created via web interface",
    stage: "approved",
    targetNGOs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "web-user",
  };

  res.json({
    success: true,
    campaign,
    message: "Campaign created successfully",
  });
});

/**
 * POST /api/ngos
 * Create or register an NGO
 */
app.post("/api/ngos", (req: Request, res: Response) => {
  const { name, email: ngoEmail, website } = req.body;

  const ngo: schemas.NGOProfile = {
    id: uuidv4(),
    name: name || "Test NGO",
    email: ngoEmail || "contact@testngo.org",
    domain: "testngo.org",
    riskScore: 15,
    controversySummary: "Well-established organization",
    selectedForOutreach: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    ngo,
    message: "NGO created successfully",
  });
});

/**
 * POST /api/ngos/search
 * Search NGOs based on brief text using GlobalGiving and DuckDuckGo
 */
app.post("/api/ngos/search", async (req: Request, res: Response) => {
  const { brief } = req.body;

  if (!brief || brief.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Please provide a brief to search for matching NGOs",
    });
  }

  try {
    const results = await searchNGOs(brief);

    res.json({
      success: true,
      count: results.length,
      ngos: results,
      message: `Found ${results.length} matching NGO(s)`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Error searching for NGOs",
    });
  }
});

/**
 * POST /api/workflows/initiate
 * Initiate a workflow for an NGO
 */
app.post("/api/workflows/initiate", async (req: Request, res: Response) => {
  try {
    const { ngoProfile } = req.body;

    if (!ngoProfile) {
      return res.status(400).json({
        success: false,
        error: "Missing ngoProfile in request body",
      });
    }

    const result = await workflow.initiateOutreach(getContext(), ngoProfile);

    res.json({
      success: result.success,
      workflowId: result.workflowId,
      message: "Workflow initiated successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

/**
 * POST /api/workflows/:workflowId/generate-draft
 * Generate an email draft for a workflow
 */
app.post(
  "/api/workflows/:workflowId/generate-draft",
  async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.workflowId as string;
      const { campaign } = req.body;

      if (!campaign) {
        return res.status(400).json({
          success: false,
          error: "Missing campaign in request body",
        });
      }

      const result = await workflow.generateEmailDraft(
        getContext(),
        workflowId,
        campaign,
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Failed to generate email draft",
        });
      }

      res.json({
        success: true,
        email: result.draftEmail,
        message: "Email draft generated successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

/**
 * POST /api/approvals
 * Record user approval for an email
 */
app.post("/api/approvals", async (req: Request, res: Response) => {
  try {
    const { resourceId, approvalText } = req.body;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: "Missing resourceId in request body",
      });
    }

    const approval: schemas.UserApproval = {
      id: uuidv4(),
      resourceType: "email",
      resourceId,
      approvedBy: getContext().userId,
      approvalText: approvalText || "Approved via web interface",
      approvedAt: new Date().toISOString(),
    };

    const result = await workflow.recordApproval(getContext(), approval);

    res.json({
      success: result.success,
      approval,
      message: "Approval recorded successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

/**
 * POST /api/emails/:emailId/send
 * Send an approved email
 */
app.post("/api/emails/:emailId/send", async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId as string;
    const { approval } = req.body;

    if (!approval) {
      return res.status(400).json({
        success: false,
        error: "Missing approval in request body",
      });
    }

    const result = await workflow.sendEmailWithApproval(
      getContext(),
      emailId,
      approval,
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }

    res.json({
      success: true,
      messageId: result.messageId,
      sentAt: result.sentAt,
      message: "Email sent successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

/**
 * GET /api/workflows/:workflowId/status
 * Get workflow status
 */
app.get(
  "/api/workflows/:workflowId/status",
  async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.workflowId as string;
      const result = await supabase.getWorkflowState(workflowId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Workflow not found",
        });
      }

      res.json({
        success: true,
        workflow: result,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: (err as Error).message,
      });
    }
  },
);

/**
 * GET /api/emails/:emailId
 * Get email details
 */
app.get("/api/emails/:emailId", async (req: Request, res: Response) => {
  try {
    const emailId = req.params.emailId as string;
    const result = await supabase.getDraftEmail(emailId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Email not found",
      });
    }

    res.json({
      success: true,
      email: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
});

/**
 * GET /api/data/mock
 * Get entire mock database state
 */
app.get("/api/data/mock", (req: Request, res: Response) => {
  const state = mocks.getMockDatabaseState();
  res.json({
    success: true,
    data: state,
  });
});

/**
 * POST /api/data/reset
 * Reset mock database
 */
app.post("/api/data/reset", (req: Request, res: Response) => {
  mocks.resetMockDatabase();
  res.json({
    success: true,
    message: "Mock database reset successfully",
  });
});

/**
 * Start server
 */
const server = app.listen(PORT, () => {
  console.log(`\n✅ Reach Out Bot API Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api/status`);
  console.log(`\n🔧 Available endpoints:`);
  console.log(`   POST   /api/campaigns`);
  console.log(`   POST   /api/ngos`);
  console.log(`   POST   /api/ngos/search`);
  console.log(`   POST   /api/workflows/initiate`);
  console.log(`   POST   /api/workflows/:workflowId/generate-draft`);
  console.log(`   POST   /api/approvals`);
  console.log(`   POST   /api/emails/:emailId/send`);
  console.log(`   GET    /api/workflows/:workflowId/status`);
  console.log(`   GET    /api/emails/:emailId`);
  console.log(`   GET    /api/data/mock`);
  console.log(`   POST   /api/data/reset`);
  console.log(`\n💾 Mock mode enabled - no external services contacted\n`);
});

export default app;
