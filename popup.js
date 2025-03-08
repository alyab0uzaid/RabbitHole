// This JavaScript file is for the popup UI

// Function to show a temporary status indicator
function showStatusIndicator(message) {
  // Check if an indicator already exists and remove it
  const existingIndicator = document.querySelector('.status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create the indicator
  const indicator = document.createElement('div');
  indicator.className = 'status-indicator';
  indicator.textContent = message;
  
  // Set the style
  indicator.style.position = 'fixed';
  indicator.style.bottom = '10px';
  indicator.style.left = '50%';
  indicator.style.transform = 'translateX(-50%)';
  indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  indicator.style.color = 'white';
  indicator.style.padding = '8px 16px';
  indicator.style.borderRadius = '20px';
  indicator.style.fontSize = '12px';
  indicator.style.fontWeight = 'bold';
  indicator.style.zIndex = '1000';
  indicator.style.opacity = '0';
  indicator.style.transition = 'opacity 0.3s ease';
  
  // Add to the DOM
  document.body.appendChild(indicator);
  
  // Fade in
  setTimeout(() => {
    indicator.style.opacity = '1';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => {
      indicator.remove();
    }, 300);
  }, 2000);
}

// Get the necessary elements (assuming these exist in your popup.html)
document.addEventListener('DOMContentLoaded', function() {
  console.log('RabbitHole popup loaded');
  
  const toggleSwitch = document.getElementById('extensionToggle');
  const toggleStatus = document.getElementById('toggleStatus');
  const sourceToggle = document.getElementById('sourceToggle');
  const currentSource = document.getElementById('currentSource');
  
  // Load saved settings
  chrome.storage.sync.get(['rabbitHoleEnabled', 'selectedSource'], function(data) {
    const isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    console.log('Extension enabled state loaded from storage:', isEnabled);
    
    toggleSwitch.checked = isEnabled;
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    toggleStatus.style.color = isEnabled ? '#0550ae' : '#777';
    sourceToggle.checked = data.selectedSource === 'Dictionary';
    currentSource.textContent = data.selectedSource || 'Wikipedia';
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
    
    // Show status indicator
    showStatusIndicator(`RabbitHole ${isEnabled ? 'enabled' : 'disabled'}`);
    
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
  
  sourceToggle.addEventListener('change', function() {
    const selectedSource = sourceToggle.checked ? 'Dictionary' : 'Wikipedia';
    chrome.storage.sync.set({ 'selectedSource': selectedSource });
    currentSource.textContent = selectedSource;
    
    // Show status indicator
    showStatusIndicator(`Source changed to ${selectedSource}`);
  });
  
  // Add hover effects to feature cards
  const features = document.querySelectorAll('.feature');
  features.forEach(feature => {
    feature.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    });
    
    feature.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = 'none';
    });
  });
});