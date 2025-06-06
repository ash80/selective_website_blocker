let currentRules = [];
let nextRuleId = 1;

// Load rules when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadRules();
  
  // Add event listeners
  document.getElementById('addBlockBtn').addEventListener('click', addBlockRule);
  document.getElementById('addAllowBtn').addEventListener('click', addAllowRule);
  
  // Handle Enter key in input fields
  document.getElementById('blockUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBlockRule();
  });

  document.getElementById('allowUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAllowRule();
  });
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
        url: "data:text/html,<html><head><title>Site Blocked</title></head><body style='font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5'><h1 style='color:#e74c3c'>Site Blocked</h1><p>This site is blocked to help you stay focused.</p></body></html>"
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
  status.innerHTML = `<div class="status ${type}">${message}</div>`;
  
  // Clear status after 3 seconds
  setTimeout(() => {
    status.innerHTML = '';
  }, 3000);
}