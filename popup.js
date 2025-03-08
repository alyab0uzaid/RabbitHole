// This JavaScript file is for the popup UI

document.addEventListener('DOMContentLoaded', function() {
  console.log('RabbitHole popup loaded');
  
  // Initialize the toggle switch
  const toggleSwitch = document.getElementById('extensionToggle');
  const toggleStatus = document.getElementById('toggleStatus');
  
  // Load the saved state from storage
  chrome.storage.sync.get('rabbitHoleEnabled', function(data) {
    // Default to enabled if not set
    const isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    console.log('Extension enabled state loaded from storage:', isEnabled);
    
    // Update the toggle to match the saved state
    toggleSwitch.checked = isEnabled;
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    
    // Update styling based on state
    if (!isEnabled) {
      toggleStatus.style.color = '#777';
    }
  });
  
  // Handle toggle changes
  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    console.log('Toggle changed to:', isEnabled);
    
    // Update the status text
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    toggleStatus.style.color = isEnabled ? '#0550ae' : '#777';
    
    // Save the state to storage
    chrome.storage.sync.set({ 'rabbitHoleEnabled': isEnabled }, function() {
      console.log('Extension state saved to storage:', isEnabled);
    });
    
    // Send message to content script to update its state
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "setEnabled",
          enabled: isEnabled
        }, function(response) {
          // Handle response if needed
          if (chrome.runtime.lastError) {
            console.log('Error sending message:', chrome.runtime.lastError);
          } else if (response) {
            console.log('Content script response:', response);
          }
        });
      }
    });
  });
  
  // Add a status message
  const footer = document.querySelector('.footer');
  if (footer) {
    const statusMsg = document.createElement('p');
    statusMsg.textContent = 'Extension is active and ready to use!';
    statusMsg.style.color = '#4CAF50';
    statusMsg.style.fontWeight = 'bold';
    statusMsg.style.marginTop = '10px';
    footer.appendChild(statusMsg);
  }
});
document.addEventListener('DOMContentLoaded', function() {
  const toggleSwitch = document.getElementById('extensionToggle');
  const toggleStatus = document.getElementById('toggleStatus');
  const sourceToggle = document.getElementById('sourceToggle');
  const currentSource = document.getElementById('currentSource');

  chrome.storage.sync.get(['rabbitHoleEnabled', 'selectedSource'], function(data) {
    const isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    toggleSwitch.checked = isEnabled;
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    toggleStatus.style.color = isEnabled ? '#0550ae' : '#777';
    sourceToggle.checked = data.selectedSource === 'Dictionary';
    currentSource.textContent = data.selectedSource || 'Wikipedia';
  });

  toggleSwitch.addEventListener('change', function() {
    const isEnabled = toggleSwitch.checked;
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    toggleStatus.style.color = isEnabled ? '#0550ae' : '#777';
    chrome.storage.sync.set({ 'rabbitHoleEnabled': isEnabled });
  });

  sourceToggle.addEventListener('change', function() {
    const selectedSource = sourceToggle.checked ? 'Dictionary' : 'Wikipedia';
    chrome.storage.sync.set({ 'selectedSource': selectedSource });
    currentSource.textContent = selectedSource;
  });
});
// No other functionality is needed since the content script 
// operates independently once loaded