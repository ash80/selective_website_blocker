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
      "urlFilter": "*youtube.com*",
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
      "urlFilter": "*reddit.com*",
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
      "urlFilter": "*reddit.com/r/*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 5,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "extensionPath": "/blocked.html"
      }
    },
    "condition": {
      "urlFilter": "*twitter.com*",
      "resourceTypes": ["main_frame"]
    }
  },
  {
    "id": 6,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "extensionPath": "/blocked.html"
      }
    },
    "condition": {
      "urlFilter": "*x.com*",
      "resourceTypes": ["main_frame"]
    }
  },
];

// Install default rules on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  // Store default rules
  await chrome.storage.sync.set({ rules: defaultRules });
  
  // Update declarative rules
  await updateDeclarativeRules(defaultRules);
  
  // Check if we should be in a disabled state from a previous session
  const result = await chrome.storage.sync.get(['disableUntil']);
  const disableUntil = result.disableUntil || 0;
  const now = Date.now();
  
  if (disableUntil > now) {
    // If we're still in the disable period, set up the timeout to re-enable
    const delay = disableUntil - now;
    setTimeout(() => {
      enableBlocker();
    }, delay);
    
    // Disable the blocker
    await disableBlocker(disableUntil);
  }
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
  } else if (message.action === 'disableBlocker') {
    await disableBlocker(message.disableUntil);
    sendResponse({ success: true });
  } else if (message.action === 'enableBlocker') {
    await enableBlocker();
    sendResponse({ success: true });
  }
});

// Add a variable to track if blocking is disabled
let isBlockerDisabled = false;

// Function to disable the blocker
async function disableBlocker(disableUntil) {
  try {
    // Store the current rules
    const result = await chrome.storage.sync.get(['rules']);
    const currentRules = result.rules || [];
    
    // Remove all blocking rules
    await updateDeclarativeRules([]);
    
    // Set the disabled flag
    isBlockerDisabled = true;
    
    // Store the disable until time
    await chrome.storage.sync.set({ disableUntil: disableUntil });
    
    console.log('Blocker disabled until:', new Date(disableUntil));
    
    // Set a timeout to re-enable the blocker
    const now = Date.now();
    const delay = disableUntil - now;
    
    if (delay > 0) {
      setTimeout(() => {
        enableBlocker();
      }, delay);
    }
  } catch (error) {
    console.error('Error disabling blocker:', error);
  }
}

// Function to enable the blocker
async function enableBlocker() {
  try {
    // Load the stored rules
    const result = await chrome.storage.sync.get(['rules']);
    const currentRules = result.rules || [];
    
    // Re-enable all rules
    await updateDeclarativeRules(currentRules);
    
    // Clear the disabled flag
    isBlockerDisabled = false;
    
    // Clear the disable until time
    await chrome.storage.sync.set({ disableUntil: 0 });
    
    console.log('Blocker enabled');
  } catch (error) {
    console.error('Error enabling blocker:', error);
  }
}

// Check if blocker should be re-enabled on extension startup
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.sync.get(['disableUntil']);
  const disableUntil = result.disableUntil || 0;
  const now = Date.now();
  
  if (disableUntil > now) {
    // If we're still in the disable period, set up the timeout to re-enable
    const delay = disableUntil - now;
    setTimeout(() => {
      enableBlocker();
    }, delay);
    
    // Also disable the blocker if it's not already disabled
    if (!isBlockerDisabled) {
      await disableBlocker(disableUntil);
    }
  } else if (isBlockerDisabled) {
    // If disable time has passed, re-enable the blocker
    await enableBlocker();
  }
});