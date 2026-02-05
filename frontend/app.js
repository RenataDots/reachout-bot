/**
 * Client-side JavaScript for Reach Out Bot Web Interface
 *
 * Workflow:
 * 1. Enter campaign brief and search for matching NGOs
 * 2. Select NGOs to target
 * 3. Generate email drafts for selected NGOs
 * 4. Review and approve emails one by one
 * 5. View campaign summary
 */

const API_BASE = "http://localhost:3000/api";

// ============================================================================
// Global STATE object for client-side data management
// ============================================================================

const STATE = {
  campaign: null,
  allNGOs: [],
  selectedNGOs: [],
  generatedEmails: [],
  currentEmailIndex: 0,
  sentEmails: [],
  skippedEmails: [],
};

// ============================================================================
// Utility Functions
// ============================================================================

async function apiCall(endpoint, method = "GET", body = null) {
  try {
    console.log(`API Call starting: ${method} ${API_BASE}${endpoint}`);

    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log("Making fetch request...");
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    console.log(`Response received: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log("Response data:", data);

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return data;
  } catch (error) {
    console.error("API call error:", error);
    throw error;
  }
}

function showOutput(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `output ${type}`;

  if (type === "loading") {
    element.textContent = "⏳ " + message;
  } else if (type === "success") {
    element.textContent = "✅ " + message;
  } else if (type === "error") {
    element.textContent = "❌ " + message;
  } else if (type === "info") {
    element.textContent = "ℹ️ " + message;
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function showStep(stepNumber) {
  // Hide all steps
  document.querySelectorAll(".workflow-step").forEach((step) => {
    step.style.display = "none";
  });
  // Show target step
  document.getElementById(`step-${stepNumber}`).style.display = "block";
}

function goBack(stepNumber) {
  showStep(stepNumber);
}

// ============================================================================
// Server Status
// ============================================================================

async function checkStatus() {
  try {
    const data = await apiCall("/status");
    const badge = document.getElementById("status-badge");
    const text = document.getElementById("status-text");

    if (badge && text) {
      badge.className = "status-badge connected";
      text.textContent = `✓ Connected (${data.mode} mode)`;
    }
  } catch (error) {
    console.error("Status check failed:", error);
    const badge = document.getElementById("status-badge");
    const text = document.getElementById("status-text");

    if (badge && text) {
      badge.className = "status-badge error";
      text.textContent = "✗ Connection failed";
    } else {
      console.error("Status elements not found in DOM");
    }
  }
}

// Wait for DOM to be ready before starting status checks
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, starting status check...");
  checkStatus();
  setInterval(checkStatus, 10000);
});

// Also add a simple test to verify JavaScript is working
console.log("JavaScript loaded successfully");
console.log("API_BASE:", API_BASE);

// ============================================================================
// STEP 1: Search NGOs by Brief
// ============================================================================

async function searchNGOs() {
  try {
    const brief = document.getElementById("campaign-brief").value.trim();

    if (!brief) {
      showOutput("brief-output", "Please enter a campaign brief", "error");
      return;
    }

    showOutput("brief-output", "Searching for matching NGOs...", "loading");

    // Create campaign with brief as name
    const campaignData = await apiCall("/campaigns", "POST", {
      name: brief.substring(0, 100), // Use first 100 chars of brief as name
      description: brief,
    });

    STATE.campaign = campaignData.campaign;

    // Search NGOs
    const searchData = await apiCall("/ngos/search", "POST", { brief });

    if (searchData.count === 0) {
      showOutput(
        "brief-output",
        "No matching NGOs found. Try a different brief.",
        "error",
      );
      return;
    }

    // Populate NGO table
    populateNGOTable(searchData.ngos);
    STATE.allNGOs = searchData.ngos;

    showOutput(
      "brief-output",
      `Found ${searchData.count} matching NGOs`,
      "success",
    );
    showStep(2);
  } catch (error) {
    showOutput("brief-output", error.message, "error");
  }
}

// ============================================================================
// STEP 2: Select NGOs
// ============================================================================

function populateNGOTable(ngos) {
  const tbody = document.getElementById("ngos-tbody");
  tbody.innerHTML = "";

  ngos.forEach((ngo, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" class="ngo-checkbox" data-id="${ngo.id}" data-index="${index}"></td>
      <td>${ngo.name}</td>
      <td>${ngo.email}</td>
      <td>${ngo.geography || "-"}</td>
      <td>${(ngo.focusAreas || []).join(", ") || "-"}</td>
      <td>${ngo.fitRationale || "-"}</td>
      <td><span class="badge badge-${ngo.partnerStatus}">${ngo.partnerStatus || "unknown"}</span></td>
      <td><span class="risk-score">${ngo.riskScore || "-"}</span></td>
      <td>${ngo.controversySummary || "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById("select-all");
  const checkboxes = document.querySelectorAll(".ngo-checkbox");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });
}

function generateEmailsForSelected() {
  const checkboxes = document.querySelectorAll(".ngo-checkbox:checked");

  if (checkboxes.length === 0) {
    showOutput("ngos-output", "Please select at least one NGO", "error");
    return;
  }

  // Collect selected NGOs
  STATE.selectedNGOs = [];
  checkboxes.forEach((checkbox) => {
    const id = checkbox.dataset.id;
    const ngo = STATE.allNGOs.find((n) => n.id === id);
    if (ngo) {
      STATE.selectedNGOs.push(ngo);
    }
  });

  // Generate emails for each selected NGO
  generateAllEmails();
}

async function generateAllEmails() {
  try {
    console.log(
      `Starting email generation for ${STATE.selectedNGOs.length} NGOs`,
    );
    console.log(
      "Selected NGOs:",
      STATE.selectedNGOs.map((n) => n.name),
    );

    showOutput(
      "ngos-output",
      `Generating ${STATE.selectedNGOs.length} emails...`,
      "loading",
    );

    STATE.generatedEmails = [];

    for (const ngo of STATE.selectedNGOs) {
      try {
        console.log(`Generating email for ${ngo.name}...`);

        // Initiate workflow for NGO
        const workflowData = await apiCall("/workflows/initiate", "POST", {
          ngoProfile: ngo,
        });
        console.log(
          `Workflow initiated for ${ngo.name}: ${workflowData.workflowId}`,
        );

        // Generate draft email
        const emailData = await apiCall(
          `/workflows/${workflowData.workflowId}/generate-draft`,
          "POST",
          { campaign: STATE.campaign },
        );
        console.log(`Email generated for ${ngo.name}: ${emailData.email.id}`);

        STATE.generatedEmails.push({
          ...emailData.email,
          ngo,
          workflowId: workflowData.workflowId,
        });
        console.log(
          `Email added to array. Total emails: ${STATE.generatedEmails.length}`,
        );
      } catch (err) {
        console.error(`Error generating email for ${ngo.name}:`, err);
        showOutput(
          "ngos-output",
          `Failed to generate email for ${ngo.name}: ${err.message}`,
          "error",
        );
      }
    }

    console.log(
      `Email generation complete. Total emails: ${STATE.generatedEmails.length}`,
    );

    if (STATE.generatedEmails.length === 0) {
      showOutput("ngos-output", "Failed to generate emails", "error");
      return;
    }

    showOutput(
      "ngos-output",
      `Generated ${STATE.generatedEmails.length} email drafts`,
      "success",
    );

    // Move to review step
    STATE.currentEmailIndex = 0;
    showStep(3);
    loadCurrentEmail();
  } catch (error) {
    console.error("Error in generateAllEmails:", error);
    showOutput("ngos-output", error.message, "error");
  }
}

// ============================================================================
// STEP 3: Review & Approve Emails
// ============================================================================

function loadCurrentEmail() {
  console.log(
    `Loading email index: ${STATE.currentEmailIndex} of ${STATE.generatedEmails.length}`,
  );
  console.log(
    "Generated emails:",
    STATE.generatedEmails.map((e) => ({ id: e.id, ngo: e.ngo.name })),
  );

  const email = STATE.generatedEmails[STATE.currentEmailIndex];

  if (!email) {
    showOutput("approval-output", "No email to display", "error");
    return;
  }

  console.log(`Loading email for ${email.ngo.name}`);

  // Update header
  document.getElementById("current-email-index").textContent =
    STATE.currentEmailIndex + 1;
  document.getElementById("total-emails").textContent =
    STATE.generatedEmails.length;
  document.getElementById("current-email-org").textContent =
    `Email for ${email.ngo.name}`;

  // Load email content
  document.getElementById("email-to").textContent = email.recipientEmail;
  document.getElementById("email-subject").value = email.subject;
  document.getElementById("email-body").value = email.body;

  // Clear approval notes
  document.getElementById("approval-notes").value = "";

  // Update button states
  document.getElementById("prev-btn").disabled = STATE.currentEmailIndex === 0;
  document.getElementById("next-btn").disabled =
    STATE.currentEmailIndex === STATE.generatedEmails.length - 1;

  // Clear output
  showOutput("approval-output", "", "info");
}

async function approveAndSendEmail() {
  try {
    const email = STATE.generatedEmails[STATE.currentEmailIndex];

    if (!email) {
      showOutput("approval-output", "No email to approve", "error");
      return;
    }

    const approvalText = document.getElementById("approval-notes").value;

    showOutput("approval-output", "Sending email...", "loading");

    // Record approval
    const approvalData = await apiCall("/approvals", "POST", {
      resourceId: email.id,
      approvalText: approvalText || "Approved via web interface",
    });

    // Send email
    await apiCall(`/emails/${email.id}/send`, "POST", {
      approval: approvalData.approval,
    });

    STATE.sentEmails.push(email);

    showOutput(
      "approval-output",
      `✓ Email sent to ${email.ngo.name}`,
      "success",
    );

    // Move to next email or summary
    if (STATE.currentEmailIndex < STATE.generatedEmails.length - 1) {
      STATE.currentEmailIndex++;
      loadCurrentEmail();
    } else {
      // All done, show summary
      showSummary();
    }
  } catch (error) {
    showOutput("approval-output", error.message, "error");
  }
}

function skipEmail() {
  const email = STATE.generatedEmails[STATE.currentEmailIndex];
  STATE.skippedEmails.push(email);

  showOutput("approval-output", `Skipped email to ${email.ngo.name}`, "info");

  // Move to next email or summary
  if (STATE.currentEmailIndex < STATE.generatedEmails.length - 1) {
    STATE.currentEmailIndex++;
    loadCurrentEmail();
  } else {
    showSummary();
  }
}

// Navigation functions for email review
function previousEmail() {
  if (STATE.currentEmailIndex > 0) {
    STATE.currentEmailIndex--;
    loadCurrentEmail();
  }
}

function nextEmail() {
  if (STATE.currentEmailIndex < STATE.generatedEmails.length - 1) {
    STATE.currentEmailIndex++;
    loadCurrentEmail();
  }
}

// ============================================================================
// STEP 4: Campaign Summary
// ============================================================================

function showSummary() {
  document.getElementById("summary-campaign-name").textContent =
    STATE.campaign.name;
  document.getElementById("summary-total-ngos").textContent =
    STATE.selectedNGOs.length;
  document.getElementById("summary-sent-count").textContent =
    STATE.sentEmails.length;
  document.getElementById("summary-skipped-count").textContent =
    STATE.skippedEmails.length;

  // Show sent emails
  const sentList = document.getElementById("sent-emails-list");
  if (STATE.sentEmails.length > 0) {
    sentList.innerHTML = STATE.sentEmails
      .map(
        (email) => `
      <div class="email-item">
        <div class="email-item-header">✓ ${email.ngo.name}</div>
        <div class="email-item-meta">
          <span><strong>Email:</strong> ${email.recipientEmail}</span>
          <span><strong>Subject:</strong> ${email.subject}</span>
        </div>
      </div>
    `,
      )
      .join("");
  } else {
    sentList.innerHTML =
      '<p class="placeholder">No emails sent in this campaign.</p>';
  }

  showStep(4);
}

function startNewCampaign() {
  // Reset state
  STATE.campaign = null;
  STATE.selectedNGOs = [];
  STATE.generatedEmails = [];
  STATE.currentEmailIndex = 0;
  STATE.sentEmails = [];
  STATE.skippedEmails = [];
  STATE.allNGOs = [];

  // Reset form
  document.getElementById("campaign-brief").value =
    "We're launching a collaborative initiative to protect marine ecosystems and restore coral reefs. We believe organizations focused on ocean conservation, marine protection, and coastal restoration could be powerful partners in this effort. We'd love to explore potential synergies and ways we might work together to safeguard our oceans for future generations.";
  document.getElementById("select-all").checked = false;

  // Show step 1
  showStep(1);
}

// ============================================================================
// Initialization
// ============================================================================

// Show step 1 on load
showStep(1);
