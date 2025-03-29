chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === "inject-script" && sender.tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ["injected.js"]
      });
    }
  });
  