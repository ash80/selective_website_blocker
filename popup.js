let currentRules = [];
let nextRuleId = 1;

// Load rules when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadRules();
  
  // Add event listeners
  document.getElementById('addBlockBtn').addEventListener('click', addBlockRule);
  document.getElementById('addAllowBtn').addEventListener('click', addAllowRule);
  document.getElementById('toggleDisableBtn').addEventListener('click', toggleDisableBlocker);
  
  // Handle Enter key in input fields
  document.getElementById('blockUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockRule();
  });

  document.getElementById('allowUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAllowRule();
  });
  
  // Load disable status
  loadDisableStatus();
});

async function loadRules() {
  try {
    const result = await chrome.storage.sync.get(['rules']);
    currentRules = result.rules || [];
    
    // Find the highest ID to continue numbering
    if (currentRules.length > 0) {
      nextRuleId = Math.max(...currentRules.map(rule => rule.id)) + 1;
    }
    
    displayRules();
  } catch (error) {
    showStatus('Error loading rules', 'error');
  }
}

function displayRules() {
  const rulesList = document.getElementById('rulesList');
  
  if (currentRules.length === 0) {
    rulesList.innerHTML = '<div style="color: #666; font-style: italic;">No rules configured</div>';
    return;
  }
  
  // Sort rules by priority (higher first) then by type
  const sortedRules = [...currentRules].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.action.type === 'allow' ? 1 : -1;
  });
  
  rulesList.innerHTML = sortedRules.map(rule => {
    const isAllow = rule.action.type === 'allow';
    const urlPattern = rule.condition.urlFilter;
    
    return `
      <div class="rule-item">
        <div>
          <span class="rule-type ${isAllow ? 'allow' : ''}">${isAllow ? 'ALLOW' : 'BLOCK'}</span>
          <span>${urlPattern}</span>
        </div>
        <button class="delete" data-rule-id="${rule.id}">×</button>
      </div>
    `;
  }).join('');
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ruleId = parseInt(e.target.getAttribute('data-rule-id'));
      deleteRule(ruleId);
    });
  });
}

async function addBlockRule() {
  const urlInput = document.getElementById('blockUrl');
  const url = urlInput.value.trim();
  
  if (!url) {
    showStatus('Please enter a URL pattern', 'error');
    return;
  }
  
  const newRule = {
    id: nextRuleId++,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        extensionPath: "/blocked.html"
      }
    },
    condition: {
      urlFilter: url,
      resourceTypes: ["main_frame"]
    }
  };
  
  currentRules.push(newRule);
  await saveAndUpdateRules();
  urlInput.value = '';
  displayRules();
}

async function addAllowRule() {
  const urlInput = document.getElementById('allowUrl');
  const url = urlInput.value.trim();
  
  if (!url) {
    showStatus('Please enter a URL pattern', 'error');
    return;
  }
  
  const newRule = {
    id: nextRuleId++,
    priority: 2, // Higher priority than block rules
    action: {
      type: "allow"
    },
    condition: {
      urlFilter: url,
      resourceTypes: ["main_frame"]
    }
  };
  
  currentRules.push(newRule);
  await saveAndUpdateRules();
  urlInput.value = '';
  displayRules();
}

async function deleteRule(ruleId) {
  currentRules = currentRules.filter(rule => rule.id !== ruleId);
  await saveAndUpdateRules();
  displayRules();
}

async function saveAndUpdateRules() {
  try {
    // Save to storage
    await chrome.storage.sync.set({ rules: currentRules });
    
    // Update background script
    await chrome.runtime.sendMessage({
      action: 'updateRules',
      rules: currentRules
    });
    
    showStatus('Rules updated successfully!', 'success');
  } catch (error) {
    showStatus('Error updating rules', 'error');
    console.error('Error:', error);
  }
}

function showStatus(message, type) {
  const status = document.getElementById('status');
  
  // Clear previous status
  status.innerHTML = '';
  
  // Create element safely
  const statusDiv = document.createElement('div');
  statusDiv.className = `status ${type}`;
  statusDiv.textContent = message;
  
  status.appendChild(statusDiv);
  
  // Clear status after 3 seconds
  setTimeout(() => {
    status.innerHTML = '';
  }, 3000);
}

async function loadDisableStatus() {
  try {
    const result = await chrome.storage.sync.get(['disableUntil']);
    const disableUntil = result.disableUntil || 0;
    const now = Date.now();
    
    const toggleBtn = document.getElementById('toggleDisableBtn');
    
    if (disableUntil > now) {
      // Currently disabled
      toggleBtn.textContent = 'Enable Blocker';
      toggleBtn.style.background = '#4CAF50';
      
      // Calculate remaining time
      const remainingMinutes = Math.ceil((disableUntil - now) / (60 * 1000));
      const statusMessage = `Blocker disabled for ${remainingMinutes} more minutes`;
      
      // Show status using textContent instead of innerHTML
      const statusDiv = document.createElement('div');
      statusDiv.className = 'status success';
      statusDiv.textContent = statusMessage;
      
      const statusContainer = document.getElementById('status');
      statusContainer.innerHTML = '';
      statusContainer.appendChild(statusDiv);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        statusContainer.innerHTML = '';
      }, 3000);
    } else {
      // Currently enabled
      toggleBtn.textContent = 'Disable Blocker';
      toggleBtn.style.background = '#f44336';
    }
  } catch (error) {
    console.error('Error loading disable status:', error);
    
    // Show error status safely
    const statusContainer = document.getElementById('status');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'status error';
    errorDiv.textContent = 'Error loading disable status';
    statusContainer.innerHTML = '';
    statusContainer.appendChild(errorDiv);
    
    setTimeout(() => {
      statusContainer.innerHTML = '';
    }, 3000);
  }
}

async function toggleDisableBlocker() {
  try {
    const result = await chrome.storage.sync.get(['disableUntil']);
    const disableUntil = result.disableUntil || 0;
    const now = Date.now();
    
    if (disableUntil > now) {
      // Currently disabled, enable it
      await chrome.storage.sync.set({ disableUntil: 0 });
      await chrome.runtime.sendMessage({ action: 'enableBlocker' });
      
      document.getElementById('toggleDisableBtn').textContent = 'Disable Blocker';
      document.getElementById('toggleDisableBtn').style.background = '#f44336';
      showStatus('Blocker enabled!', 'success');
    } else {
      // Currently enabled, disable it for 30 minutes
      const disableUntilTime = now + (30 * 60 * 1000); // 30 minutes from now
      await chrome.storage.sync.set({ disableUntil: disableUntilTime });
      await chrome.runtime.sendMessage({ action: 'disableBlocker', disableUntil: disableUntilTime });
      
      document.getElementById('toggleDisableBtn').textContent = 'Enable Blocker';
      document.getElementById('toggleDisableBtn').style.background = '#4CAF50';
      showStatus('Blocker disabled for 30 minutes', 'success');
    }
  } catch (error) {
    showStatus('Error toggling blocker status', 'error');
    console.error('Error:', error);
  }
}