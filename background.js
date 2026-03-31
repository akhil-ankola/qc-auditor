// QC Auditor – Background Service Worker (MV3)

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    console.log('[QC Auditor] Installed successfully.');
  } else if (reason === 'update') {
    console.log('[QC Auditor] Updated to', chrome.runtime.getManifest().version);
  }
});

// Keep service worker alive during audit messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'alive' });
  }
  return true;
});
