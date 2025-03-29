document.getElementById("renderButton").addEventListener("click", () => {
  // Send a message to content.js to trigger LaTeX rendering
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "renderLatex" });
  });
});
