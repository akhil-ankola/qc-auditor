// PagePulse v2.5.3 — Background Service Worker (MV3)

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // Set default storage values on first install
  if (reason === 'install') {
    chrome.storage.local.set({ darkMode: null });
  }
});

// Respond to keepalive pings from popup during long audits
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'alive' });
  }
  return true;
});
