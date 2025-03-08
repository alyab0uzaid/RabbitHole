// Global variables
let isActive = false;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "activate") {
    isActive = true;
    alert("Selection mode activated! Select any text to see its Wikipedia summary.");
    sendResponse({status: "activated"});
  }
  return true; // Keeps the message channel open for async response
});

// Listen for text selection
document.addEventListener('mouseup', function(event) {
  if (!isActive) return;
  
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    // Get the selection range
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    
    // Create a highlighted span
    const span = document.createElement('span');
    span.className = 'wiki-highlight';
    span.textContent = selectedText;
    
    // Replace the selected text with our highlighted span
    range.deleteContents();
    range.insertNode(span);
    
    // Clear the selection
    selection.removeAllRanges();
    
    // Fetch Wikipedia summary
    fetchWikipediaSummary(selectedText, span);
    
    // Reset the active flag after use
    isActive = false;
  }
});

// Function to fetch Wikipedia summary
function fetchWikipediaSummary(text, element) {
  // Clean up the text for the API query
  const query = encodeURIComponent(text);
  
  // Create the Wikipedia API URL
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro&explaintext&redirects=1&titles=${query}&origin=*`;
  
  // Add loading indicator
  element.classList.add('loading');
  
  // Fetch the data
  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      // Process the Wikipedia response
      const pages = data.query.pages;
      const pageId = Object.keys(pages)[0];
      
      // Remove loading indicator
      element.classList.remove('loading');
      
      if (pageId === '-1') {
        // No results found
        showTooltip(element, `No Wikipedia entry found for "${text}"`);
      } else {
        // Extract the summary
        const title = pages[pageId].title;
        const extract = pages[pageId].extract || 'No summary available';
        
        // Truncate if too long
        const summary = extract.length > 200 ? 
          extract.substring(0, 200) + '...' : 
          extract;
        
        // Show the tooltip
        showTooltip(element, `<strong>${title}</strong><br>${summary}`);
      }
    })
    .catch(error => {
      // Handle any errors
      console.error('Error fetching from Wikipedia:', error);
      element.classList.remove('loading');
      showTooltip(element, 'Error fetching Wikipedia information');
    });
}

// Function to show tooltip
function showTooltip(element, content) {
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'wiki-tooltip';
  tooltip.innerHTML = content;
  
  // Add tooltip to the page
  document.body.appendChild(tooltip);
  
  // Position the tooltip near the element
  const rect = element.getBoundingClientRect();
  tooltip.style.position = 'absolute';
  tooltip.style.top = (window.scrollY + rect.bottom + 5) + 'px';
  tooltip.style.left = (window.scrollX + rect.left) + 'px';
  
  // Handle hover events on the highlighted text
  element.addEventListener('mouseenter', function() {
    tooltip.style.display = 'block';
  });
  
  element.addEventListener('mouseleave', function() {
    tooltip.style.display = 'none';
  });
  
  // Initially show the tooltip
  tooltip.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    tooltip.style.display = 'none';
  }, 3000);
}

// Initialize - let popup know content script is ready
chrome.runtime.sendMessage({action: "ready"}, function(response) {
  // This just confirms the content script is loaded and ready
});

console.log("Wiki Summary content script loaded");