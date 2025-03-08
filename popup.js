document.getElementById('activateBtn').addEventListener('click', function() {
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // Send a simple message to the content script
      chrome.tabs.sendMessage(tabs[0].id, {action: "activate"}, function(response) {
        // Handle any response if needed
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          alert("There was an error communicating with the page. Please refresh the page and try again.");
        } else {
          // Close the popup when successful
          window.close();
        }
      });
    });
  });