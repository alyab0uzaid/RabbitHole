// RabbitHole Main Entry Point

import { fetchWikipediaData } from './utils.js';
import { 
  createPopup, 
  removePopups, 
  createExpandedModal,
  wikiTree
} from './ui.js';

// Global state
let isInitialized = false;
let isEnabled = true; // Default to enabled

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "setEnabled") {
    isEnabled = message.enabled;
    console.log("RabbitHole extension " + (isEnabled ? "enabled" : "disabled"));
    sendResponse({status: "success"});
  }
  return true; // Keep the message channel open for async response
});

// Main function to initialize the extension
function initRabbitHole() {
  if (isInitialized) {
    console.log("RabbitHole already initialized");
    return;
  }
  
  console.log("Initializing RabbitHole extension...");
  isInitialized = true;
  
  // Check if the extension is enabled in storage
  chrome.storage.sync.get('rabbitHoleEnabled', function(data) {
    // Default to enabled if setting doesn't exist
    isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    console.log("RabbitHole extension is " + (isEnabled ? "enabled" : "disabled") + " on initialization");
  });
  
  // Listen for text selection
  document.addEventListener('mouseup', async function(e) {
    // Don't process if extension is disabled
    if (!isEnabled) return;
    
    // Wait a small delay to ensure the selection is complete
    setTimeout(async () => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      console.log("Selected text:", selectedText);
      
      // Check if there is selected text and it's not too long
      if (selectedText && selectedText.length > 0 && selectedText.length < 100) {
        try {
          console.log("Valid selection, proceeding to Wikipedia lookup");
          // Get the selection range and position
          if (selection.rangeCount === 0) {
            console.log("No range found in selection");
            return;
          }
          
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Calculate position for popup
          const position = {
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 10
          };
          
          console.log("Fetching Wikipedia data...");
          // Fetch Wikipedia data for the selected text
          const data = await fetchWikipediaData(selectedText);
          
          if (data) {
            console.log("Wikipedia data found, creating wrapper");
            // Create a wrapper span to replace the selected text
            const wrapper = document.createElement('span');
            wrapper.className = 'rabbithole-link';
            wrapper.textContent = selectedText;
            wrapper.style.color = 'var(--primary-color)';
            wrapper.style.textDecoration = 'underline';
            wrapper.style.cursor = 'pointer';
            wrapper.style.backgroundColor = 'rgba(58, 92, 204, 0.08)';
            wrapper.style.borderRadius = '3px';
            wrapper.style.padding = '0 3px';
            wrapper.style.transition = 'all 0.2s ease';
            
            // Replace the selected text with the wrapper span
            range.deleteContents();
            range.insertNode(wrapper);
            
            // Add hover event to show popup
            wrapper.addEventListener('mouseenter', function(e) {
              // Don't show popup if disabled
              if (!isEnabled) return;
              
              const rect = wrapper.getBoundingClientRect();
              const position = {
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY
              };
              
              createPopup(data, position, false, null, this);
            });
            
            // Add mouseleave event to remove popup
            wrapper.addEventListener('mouseleave', function(e) {
              removePopups();
            });
            
            // Make sure the click event is properly set up
            wrapper.addEventListener('click', function(e) {
              // Don't show modal if disabled
              if (!isEnabled) return;
              
              e.preventDefault();
              e.stopPropagation();
              
              console.log("Link clicked, creating modal");
              createExpandedModal(data);
            });
          } else {
            console.log("No Wikipedia data found for:", selectedText);
          }
        } catch (error) {
          console.error("Error processing selection:", error);
        }
      }
    }, 100); // Small delay to ensure selection is complete
  });
  
  console.log("RabbitHole initialization complete");
}

// Run initialization in multiple ways to ensure it gets executed
// Immediate initialization for most cases
initRabbitHole();

// Backup initialization on page load events
window.addEventListener('load', initRabbitHole);
document.addEventListener('DOMContentLoaded', initRabbitHole);

// Final backup in case other methods fail, with a slight delay
setTimeout(initRabbitHole, 1000);

console.log("RabbitHole content script loaded"); 