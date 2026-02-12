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
    // Disable the blocker
    await disableBlocker(disableUntil);
  }
});

// Convert a urlFilter pattern to a regexFilter pattern
function urlFilterToRegex(urlFilter) {
  // Escape regex special chars except *
  let regex = urlFilter.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with .*
  regex = regex.replace(/\*/g, '.*');
  return regex;
}

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

    // Transform redirect rules to pass the original URL as a query parameter
    const extensionId = chrome.runtime.id;
    const transformedRules = rules.map(rule => {
      if (rule.action.type === 'redirect' && rule.action.redirect.extensionPath) {
        const { urlFilter, ...restCondition } = rule.condition;
        return {
          ...rule,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: `chrome-extension://${extensionId}${rule.action.redirect.extensionPath}?url=\\0`
            }
          },
          condition: {
            ...restCondition,
            regexFilter: urlFilterToRegex(urlFilter)
          }
        };
      }
      return rule;
    });

    // Add new rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: transformedRules
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


// Function to disable the blocker
async function disableBlocker(disableUntil) {
  try {
    // Store the current rules
    const result = await chrome.storage.sync.get(['rules']);
    const currentRules = result.rules || [];
    
    // Remove all blocking rules
    await updateDeclarativeRules([]);
    
    // Store the disable until time
    await chrome.storage.sync.set({ disableUntil: disableUntil });
    
    console.log('Blocker disabled until:', new Date(disableUntil));
    
    // Create an alarm for re-enablement (more reliable than setTimeout in service workers)
    const now = Date.now();
    const delayInMinutes = Math.ceil((disableUntil - now) / (60 * 1000));
    
    if (delayInMinutes > 0) {
      // Clear any existing alarm first
      await chrome.alarms.clear('reenableBlocker');
      
      // Create new alarm
      await chrome.alarms.create('reenableBlocker', {
        when: disableUntil
      });
      
      console.log('Alarm set to re-enable blocker in', delayInMinutes, 'minutes');
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
    
    // Clear the disable until time
    await chrome.storage.sync.set({ disableUntil: 0 });
    
    // Clear any existing alarm
    await chrome.alarms.clear('reenableBlocker');
    
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
    await disableBlocker(disableUntil);
  } else {
    // If disable time has passed, re-enable the blocker
    await enableBlocker();
  }
});

// Listen for alarm events to re-enable the blocker
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'reenableBlocker') {
    console.log('Alarm triggered - re-enabling blocker');
    await enableBlocker();
  }
});