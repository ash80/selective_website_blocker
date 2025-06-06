// Default blocking rules
const defaultRules = [
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "data:text/html,<html><head><title>Site Blocked</title></head><body style='font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5'><h1 style='color:#e74c3c'>Site Blocked</h1><p>This site is blocked to help you stay focused.</p><p>If you need to access a specific page, add it to your allowed list.</p></body></html>"
      }
    },
    "condition": {
      "urlFilter": "*youtube.com/*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 2,
    "priority": 2,
    "action": {
      "type": "allow"
    },
    "condition": {
      "urlFilter": "*youtube.com/watch*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "url": "data:text/html,<html><head><title>Site Blocked</title></head><body style='font-family:Arial,sans-serif;text-align:center;padding:50px;background:#f5f5f5'><h1 style='color:#e74c3c'>Site Blocked</h1><p>This site is blocked to help you stay focused.</p><p>If you need to access a specific page, add it to your allowed list.</p></body></html>"
      }
    },
    "condition": {
      "urlFilter": "*reddit.com/*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 4,
    "priority": 2,
    "action": {
      "type": "allow"
    },
    "condition": {
      "urlFilter": "*reddit.com/r/MachineLearning*",
      "resourceTypes": ["main_frame"]
    }
  }
];

// Install default rules on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  // Store default rules
  await chrome.storage.sync.set({ rules: defaultRules });
  
  // Update declarative rules
  await updateDeclarativeRules(defaultRules);
});

// Update declarative net request rules
async function updateDeclarativeRules(rules) {
  try {
    // Remove existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = existingRules.map(rule => rule.id);
    
    if (ruleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
      });
    }
    
    // Add new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules
    });
  } catch (error) {
    console.error('Error updating rules:', error);
  }
}

// Listen for rule updates from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'updateRules') {
    await updateDeclarativeRules(message.rules);
    sendResponse({ success: true });
  }
});