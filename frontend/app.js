/**
 * Client-side JavaScript for Reach Out Bot Web Interface
 */

const API_BASE = 'http://localhost:3000/api';

// ============================================================================
// Utility Functions
// ============================================================================

async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    throw error;
  }
}

function showOutput(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.className = `output ${type}`;

  if (type === 'loading') {
    element.textContent = '⏳ ' + message;
  } else if (type === 'success') {
    element.textContent = '✅ ' + message;
  } else if (type === 'error') {
    element.textContent = '❌ ' + message;
  } else if (type === 'info') {
    element.textContent = 'ℹ️ ' + message;
  }
}

function showJSON(elementId, data, type = 'info') {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = JSON.stringify(data, null, 2);
  element.className = `output ${type}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

// ============================================================================
// Tab Navigation
// ============================================================================

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach((tab) => {
      tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    btn.classList.add('active');

    // Refresh data if Data tab selected
    if (tabName === 'data') {
      refreshData();
    }
  });
});

// ============================================================================
// Server Status
// ============================================================================

async function checkStatus() {
  try {
    const data = await apiCall('/status');
    const badge = document.getElementById('status-badge');
    const text = document.getElementById('status-text');

    badge.className = 'status-badge connected';
    text.textContent = `✓ Connected (${data.mode} mode)`;
  } catch (error) {
    const badge = document.getElementById('status-badge');
    const text = document.getElementById('status-text');

    badge.className = 'status-badge error';
    text.textContent = '✗ Connection failed';
  }
}

// Check status on load and every 10 seconds
checkStatus();
setInterval(checkStatus, 10000);

// ============================================================================
// CREATE TAB - Step 1: Campaign
// ============================================================================

async function createCampaign() {
  try {
    const name = document.getElementById('campaign-name').value;
    const description = document.getElementById('campaign-desc').value;

    showOutput('campaign-output', 'Creating campaign...', 'loading');

    const data = await apiCall('/campaigns', 'POST', { name, description });

    STATE.campaign = data.campaign;

    showOutput('campaign-output', `Campaign created: ${data.campaign.id}`, 'success');
    document.getElementById('generate-btn').disabled = false;

    console.log('Campaign:', data.campaign);
  } catch (error) {
    showOutput('campaign-output', error.message, 'error');
  }
}

// ============================================================================
// CREATE TAB - Step 2: NGO
// ============================================================================

async function createNGO() {
  try {
    const name = document.getElementById('ngo-name').value;
    const email = document.getElementById('ngo-email').value;
    const website = document.getElementById('ngo-website').value;

    showOutput('ngo-output', 'Creating NGO...', 'loading');

    const data = await apiCall('/ngos', 'POST', { name, email, website });

    STATE.ngo = data.ngo;

    showOutput('ngo-output', `NGO created: ${data.ngo.id}`, 'success');
    document.getElementById('generate-btn').disabled = false;

    console.log('NGO:', data.ngo);
  } catch (error) {
    showOutput('ngo-output', error.message, 'error');
  }
}

// ============================================================================
// CREATE TAB - Step 3: Workflow
// ============================================================================

async function initiateWorkflow() {
  try {
    if (!STATE.ngo) {
      showOutput('workflow-output', 'Please create an NGO profile first', 'error');
      return;
    }

    showOutput('workflow-output', 'Initiating workflow...', 'loading');

    const data = await apiCall('/workflows/initiate', 'POST', {
      ngoProfile: STATE.ngo,
    });

    STATE.workflow = data;

    showOutput(
      'workflow-output',
      `Workflow initiated: ${data.workflowId}\nStage: ${data.stage}`,
      'success'
    );

    document.getElementById('generate-btn').disabled = false;

    console.log('Workflow:', data);
  } catch (error) {
    showOutput('workflow-output', error.message, 'error');
  }
}

// ============================================================================
// CREATE TAB - Step 4: Draft
// ============================================================================

async function generateDraft() {
  try {
    if (!STATE.workflow) {
      showOutput('draft-output', 'Please initiate a workflow first', 'error');
      return;
    }

    if (!STATE.campaign) {
      showOutput('draft-output', 'Please create a campaign first', 'error');
      return;
    }

    showOutput('draft-output', 'Generating email draft...', 'loading');

    const data = await apiCall(
      `/workflows/${STATE.workflow.workflowId}/generate-draft`,
      'POST',
      { campaign: STATE.campaign }
    );

    STATE.draftEmail = data.email;

    showOutput('draft-output', `Email draft created: ${data.email.id}`, 'success');

    // Load email into review tab
    loadEmailPreview(data.email);
    document.getElementById('approve-btn').disabled = false;

    console.log('Draft Email:', data.email);
  } catch (error) {
    showOutput('draft-output', error.message, 'error');
  }
}

// ============================================================================
// REVIEW TAB - Email Preview
// ============================================================================

function loadEmailPreview(email) {
  const preview = document.getElementById('email-preview');

  preview.innerHTML = `
    <div class="email-field">
      <div class="email-label">To</div>
      <div class="email-value">${email.recipientEmail}</div>
    </div>
    <div class="email-field">
      <div class="email-label">Subject</div>
      <div class="email-value subject">${email.subject}</div>
    </div>
    <div class="email-field">
      <div class="email-label">Body</div>
      <div class="email-value body">${email.body}</div>
    </div>
    <div class="email-field">
      <div class="email-label">Status</div>
      <div class="email-value">${email.status}</div>
    </div>
    <div class="email-field">
      <div class="email-label">Email ID</div>
      <div class="email-value" style="font-size: 12px; color: #9ca3af;">${email.id}</div>
    </div>
  `;

  preview.classList.add('loaded');
}

// ============================================================================
// REVIEW TAB - Approval
// ============================================================================

async function approveEmail() {
  try {
    if (!STATE.draftEmail) {
      showOutput('approval-output', 'No email to approve', 'error');
      return;
    }

    const approvalText = document.getElementById('approval-notes').value;

    showOutput('approval-output', 'Recording approval...', 'loading');

    // Record approval
    const approvalData = await apiCall('/approvals', 'POST', {
      resourceId: STATE.draftEmail.id,
      approvalText,
    });

    STATE.approval = approvalData.approval;

    showOutput('approval-output', 'Approval recorded. Sending email...', 'info');

    // Send email
    const sendData = await apiCall(`/emails/${STATE.draftEmail.id}/send`, 'POST', {
      approval: STATE.approval,
    });

    showOutput(
      'approval-output',
      `Email sent successfully!\nMessage ID: ${sendData.messageId}\nSent at: ${formatDate(sendData.sentAt)}`,
      'success'
    );

    // Disable buttons
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('reject-btn').disabled = true;

    // Add to sent list
    addSentEmail(STATE.draftEmail);

    // Reset state for next email
    STATE.draftEmail = null;
    document.getElementById('email-preview').innerHTML =
      '<p class="placeholder">Email sent! Create another workflow to continue.</p>';
    document.getElementById('email-preview').classList.remove('loaded');

    console.log('Approval:', STATE.approval);
    console.log('Sent:', sendData);
  } catch (error) {
    showOutput('approval-output', error.message, 'error');
  }
}

function rejectEmail() {
  showOutput(
    'approval-output',
    'Email rejected. You can create a new workflow to try again.',
    'info'
  );

  // Reset
  STATE.draftEmail = null;
  document.getElementById('email-preview').innerHTML =
    '<p class="placeholder">Email rejected. Ready for next workflow.</p>';
  document.getElementById('email-preview').classList.remove('loaded');
  document.getElementById('approve-btn').disabled = true;
  document.getElementById('reject-btn').disabled = true;
}

function addSentEmail(email) {
  const list = document.getElementById('sent-emails-list');

  if (list.querySelector('.placeholder')) {
    list.innerHTML = '';
  }

  const item = document.createElement('div');
  item.className = 'email-item';
  item.innerHTML = `
    <div class="email-item-header">📧 ${email.subject}</div>
    <div class="email-item-meta">
      <span><strong>To:</strong> ${email.recipientEmail}</span>
      <span><strong>Sent:</strong> ${formatDate(email.createdAt)}</span>
      <span><strong>ID:</strong> ${email.id.substring(0, 8)}...</span>
    </div>
  `;

  list.appendChild(item);
}

// ============================================================================
// DATA TAB
// ============================================================================

async function refreshData() {
  try {
    const data = await apiCall('/data/mock');

    // Format and display each data type
    if (data.data.workflows && data.data.workflows.length > 0) {
      document.getElementById('workflows-data').textContent = JSON.stringify(
        data.data.workflows,
        null,
        2
      );
    } else {
      document.getElementById('workflows-data').textContent = '(No workflows yet)';
    }

    if (data.data.draftEmails && data.data.draftEmails.length > 0) {
      document.getElementById('emails-data').textContent = JSON.stringify(
        data.data.draftEmails,
        null,
        2
      );
    } else {
      document.getElementById('emails-data').textContent = '(No draft emails yet)';
    }

    if (data.data.approvals && data.data.approvals.length > 0) {
      document.getElementById('approvals-data').textContent = JSON.stringify(
        data.data.approvals,
        null,
        2
      );
    } else {
      document.getElementById('approvals-data').textContent = '(No approvals yet)';
    }

    if (data.data.ngoProfiles && data.data.ngoProfiles.length > 0) {
      document.getElementById('ngos-data').textContent = JSON.stringify(
        data.data.ngoProfiles,
        null,
        2
      );
    } else {
      document.getElementById('ngos-data').textContent = '(No NGOs yet)';
    }
  } catch (error) {
    console.error('Error refreshing data:', error);
    document.getElementById('workflows-data').textContent = 'Error loading data';
  }
}

async function resetDatabase() {
  if (!confirm('Are you sure you want to reset the mock database? This cannot be undone.')) {
    return;
  }

  try {
    await apiCall('/data/reset', 'POST');

    // Clear state
    STATE.campaign = null;
    STATE.ngo = null;
    STATE.workflow = null;
    STATE.draftEmail = null;
    STATE.approval = null;

    // Reset UI
    document.getElementById('email-preview').innerHTML =
      '<p class="placeholder">Database reset. Ready to start over.</p>';
    document.getElementById('email-preview').classList.remove('loaded');
    document.getElementById('sent-emails-list').innerHTML =
      '<p class="placeholder">No emails sent yet.</p>';
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('reject-btn').disabled = true;
    document.getElementById('generate-btn').disabled = false;

    // Refresh data view
    refreshData();

    alert('Database reset successfully!');
  } catch (error) {
    alert('Error resetting database: ' + error.message);
  }
}

// ============================================================================
// Initialization
// ============================================================================

// Initial data load
refreshData();
