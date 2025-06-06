// Default blocking rules
const defaultRules = [
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "extensionPath": "/blocked.html"
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
        "extensionPath": "/blocked.html"
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