# Architecture Overview

## System Design Principles

1. **Explicit Over Implicit** - All operations require explicit action, never auto-dispatch
2. **Schema Validation First** - All data validated before use, especially AI outputs
3. **Single Source of Truth** - Clear ownership: HubSpot for CRM, Supabase for workflows
4. **Defensive Programming** - Guards on all critical operations, detailed logging
5. **Local-First Development** - Full functionality in mock mode without external services
6. **Hybrid Intelligence** - AI-powered search with reliable local fallback

## Component Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Future)                         │
│           User Approval & Email Review UI                    │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│           Backend Workflow Orchestrator                      │
│  - Workflow state machine                                    │
│  - Email draft management                                    │
│  - Approval validation                                       │
│  - Risk assessment (advisory)                                │
└──────────┬─────────────────┬──────────────────┬─────┘
           │                         │                  │
      ┌────┴────┐        ┌──────────┴──────┐      ┌────┴────┐
      │          │        │                 │      │         │
   ┌──┴──┐   ┌──┴──┐   ┌─┴──┐        ┌─────┴───┐ ┌─────┴───┐ ┌─┴──┐  ┌──┴──┐
   │Email │   │Hub  │   │Supa│        │ Google  │ │ AI │  │Risk │  │Grok │
   │Svc   │   │Spot │   │base│        │ Drive   │ │Svc │  │Svc  │  │Search│
   └──┬──┘   └──┬──┘   └─┬──┘        └─────┬───┘ └─┬──┘  └──┬──┘  └──┬──┘
      │         │        │                 │      │      │
   ┌──┴───────┬─┴─────┬──┴────────┬────────┴──────┴──────┴──────┴──┐
   │ Mock Implementations (Local)                          │
   │ - MockEmailService                                    │
   │ - MockHubSpotService                                  │
   │ - MockSupabaseService                                 │
   │ - MockAIService                                       │
   │ - Local NGO Database (41 organizations)                 │
   └───────────────────────────────────────────────────────┘

   ↓ Swap to Live ↓

   ┌─────────────────────────────────────────────────────────┐
   │ Live Service Implementations (Production)               │
   │ - Gmail API                                             │
   │ - Real HubSpot                                          │
   │ - Real Supabase                                         │
   │ - Google Drive API                                      │
   │ - OpenAI API                                            │
   │ - xAI Grok API                                         │
   └─────────────────────────────────────────────────────────┘
```

## Data Flow

### NGO Search & Discovery

```
Campaign Brief Input
         ↓
   Brief Processing & Analysis
   - Geographic extraction
   - Intent analysis
   - Entity recognition
   - Quality assessment
         ↓
   ┌─────────────────────────────────┐
   │  Hybrid Search Orchestrator   │
   │  Try Grok API First          │
   │  ↓ (if fails)              │
   │  Fallback to Local Database   │
   └──────────┬──────────────────┘
         ↓
   NGO Results (AI + Local)
         ↓
   NGO Profile Generation
   - Risk assessment
   - Partnership scoring
   - Contact validation
```

### Email Generation & Sending

```
1. User selects NGO for outreach
   ↓
2. System calls AI Service
   - Input: NGO profile, campaign details
   ↓
3. AI returns email content (unvalidated)
   ↓
4. VALIDATION CHECKPOINT
   - Validate against AIGeneratedEmailSchema
   - Check confidence > 0.7
   - Check no validation errors
   ↓
5. Store as DraftEmail (status: draft)
   - Not sent yet
   - Awaiting human review
   ↓
6. User reviews in UI
   - Reads email content
   - Can edit if needed
   ↓
7. User clicks "Approve"
   - Creates UserApproval record
   - Stored in Supabase with timestamp
   ↓
8. System sends email
   - IDEMPOTENCY CHECK: Has this email been sent?
   - No: Proceed with send
   - Yes: Return success (already sent)
   ↓
9. Email sent via Gmail API
   - Update DraftEmail status: sent
   - Record message ID
   - Full audit trail
```

### Workflow State Machine

```
                    ┌─────────────────────┐
                    │  initial_research   │
                    │  (workflow start)   │
                    └──────────┬──────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  draft_generation   │
                    │  (AI generates)     │
                    └──────────┬──────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   user_review       │
                    │  (human approves)   │
                    └──────────┬──────────┘
                              │
                              ▼
                    ┌─────────────────────┐
         ┌──────────▶ approval_pending   │
         │          │  (explicit approval)│
         │          └──────────┬──────────┘
         │                     │
         │                     ▼
    ┌────┴──────┐   ┌─────────────────────┐
    │   failed  │◀──┤     sending         │
    │ (retry OK)│   │   (send via Gmail)  │
    └───────────┘   └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     follow_up       │
                    │  (optional sequel)  │
                    └──────────┬──────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │     completed       │
                    │  (workflow end)     │
                    └─────────────────────┘
```

## Service Interfaces & Implementations

### Email Service

```typescript
interface IEmailService {
  // Requires explicit approval + approval object
  sendApprovedEmail(draft, approval) → sent email

  // Requires explicit approval + idempotency key
  scheduleFollowUp(draft, approval, delayMs, key) → scheduled
}

// Mock: Writes to data/mock-data/sent-email-*.json
// Live: Calls Gmail API v1
```

### HubSpot Service

```typescript
interface IHubSpotService {
  // READ ONLY
  getContactByEmail(email) → contact or null
  getContactById(id) → contact or null
  listContacts(limit, offset) → contacts[]

  // CREATE NEW ONLY (idempotent)
  createContactIfNotExists(partial) → (contact, isNew)
}

// Mock: In-memory contact store
// Live: HubSpot CRM API (read-only)
// NOTE: Never modifies existing records
```

### Supabase Service

```typescript
interface ISupabaseService {
  // Workflow state (single source of truth)
  saveWorkflowState(state) → saved
  getWorkflowState(id) → state or null
  getWorkflowStatesByCampaign(campaignId) → states[]
  updateWorkflowStage(id, newStage, data) → updated

  // Draft emails (persistent, auditable)
  saveDraftEmail(email) → saved
  getDraftEmail(id) → email or null
  listDraftEmailsByCampaign(campaignId) → emails[]

  // User approvals (explicit records)
  saveUserApproval(approval) → saved
  getUserApproval(id) → approval or null
  hasApproval(resourceType, resourceId) → boolean

  // Idempotency keys (prevent duplicates)
  recordIdempotencyKey(key) → recorded
  getIdempotencyKey(key) → key or null
}

// Mock: In-memory maps + JSON persistence
// Live: Real Supabase PostgreSQL
```

### AI Service

```typescript
interface IAIService {
  // Generates email (output MUST be validated)
  generateEmail(ngo, campaign) → {
    data: AIGeneratedEmail (validated)
    success: boolean
    error?: string
  }

  generateEmailWithPrompt(prompt) → AIGenerationResult
}

// Output ALWAYS validated against AIGeneratedEmailSchema
// Mock: Returns templated emails
// Live: Calls OpenAI API
```

## Hard Constraint Enforcement Points

### 1. No Auto-Dispatch

- **Check Point**: `workflow.sendEmailWithApproval()`
  - Requires explicit `UserApproval` object
  - Validates approval record exists in Supabase
  - Validates approval hasn't expired
  - Logs all attempts (approval required)

### 2. HubSpot Read-Only

- **Check Point**: `hubspot.createContactIfNotExists()`
  - Queries existing contacts first
  - Returns existing if found (never updates)
  - Only creates if genuinely new
  - All reads bypass update checks

### 3. Supabase as State Source

- **Check Point**: All workflow state operations
  - Writes to Supabase immediately
  - Reads from Supabase for state checks
  - No local state beyond request scope
  - Persistence before returning to caller

### 4. Risk is Advisory

- **Check Point**: `workflow.getAdvisoryRiskAssessment()`
  - Always returns `advisoryOnly: true`
  - Never checked in outreach block logic
  - Presented to user for information only
  - No guard against high-risk NGOs

### 5. Idempotency

- **Check Point**: Email send operations
  - Check idempotency key in Supabase
  - If already completed, return success
  - If not yet completed, proceed with send
  - Record completion after successful send

### 6. Schema Validation

- **Check Point**: `validation.validateAIGeneratedEmail()`
  - Called immediately after AI generation
  - Rejects invalid outputs
  - Reports specific validation errors
  - Prevents bad data downstream

## Error Handling & Recovery

### Transient Errors

- Email API timeout → Retry with exponential backoff
- Supabase connection loss → Retry with circuit breaker
- HubSpot rate limit → Queue and retry later

### Permanent Errors

- Invalid email address → Mark email as failed, log error
- NGO not found → Create empty profile with email only
- Approval not found → Reject send operation, log security event

### Idempotency & Recovery

- Email send fails → Retry allowed (idempotent)
- Approval expires → Requires new approval
- Workflow stage error → Can update stage again

## Testing Strategy

### Unit Tests

- Each service implementation tested in isolation
- Mock services tested for correctness
- Validation functions tested for all edge cases

### Integration Tests

- Workflow with all mocks connected
- Full lifecycle: init → draft → approve → send
- Error scenarios and recovery

### Constraint Tests (Comprehensive)

- All 7 hard constraints validated
- Constraint violations should fail tests
- Coverage: schema validation, approval enforcement, idempotency

## Deployment Architecture (Future)

```
┌──────────────────────────────────────────────────┐
│  Frontend (React/Next.js)                        │
│  - Email review & approval UI                    │
│  - Campaign dashboard                            │
│  - Risk assessment display                       │
└──────────────┬───────────────────────────────────┘
               │
        ┌──────▼──────┐
        │   API GW    │
        │(Auth, Rate) │
        └──────┬──────┘
               │
┌──────────────┴────────────────────────────────────┐
│  Backend Services (Node.js)                       │
│  - Workflow orchestrator                          │
│  - Integration adapters                           │
│  - Request validation                             │
└──────────────┬────────────────────────────────────┘
               │
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
 ┌──┴──┐  ┌───┴──┐  ┌────┴───┐ ┌───┴──┐  ┌───┴──┐
 │Gmail│  │Hub   │  │Supabase│ │Drive │  │OpenAI│
 │API  │  │Spot  │  │DB      │ │API   │  │API   │
 └─────┘  └──────┘  └────────┘ └──────┘  └──────┘
```

## Security & Compliance

- **Approval Trail**: All approvals stored with timestamp, user, and content
- **Data Encryption**: In transit (HTTPS), at rest (Supabase encryption)
- **Access Control**: API auth on all endpoints
- **Audit Logging**: All operations logged with context
- **GDPR**: Email opt-out tracking, data retention policies

---

**Last Updated:** February 2, 2026
