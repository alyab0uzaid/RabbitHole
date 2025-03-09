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

// Load and display saved trees
async function loadSavedTrees() {
  const savedTreesList = document.getElementById('savedTreesList');
  if (!savedTreesList) return;
  
  // Show loading
  savedTreesList.innerHTML = '<div class="loading-trees">Loading your saved RabbitHoles...</div>';
  
  try {
    // Get saved trees from storage
    const savedTrees = await new Promise(resolve => {
      chrome.storage.sync.get(['savedTrees'], result => {
        resolve(result.savedTrees || {});
      });
    });
    
    // Check if we have saved trees
    const treeIds = Object.keys(savedTrees);
    if (treeIds.length === 0) {
      // No saved trees message
      savedTreesList.innerHTML = `
        <div class="no-saved-trees">
          <p>You don't have any saved RabbitHoles yet.</p>
          <p class="hint">Explore topics and save your RabbitHole when closing!</p>
        </div>
      `;
      return;
    }
    
    // Sort trees by lastModified date (most recent first)
    treeIds.sort((a, b) => {
      const dateA = new Date(savedTrees[a].lastModified || savedTrees[a].dateCreated);
      const dateB = new Date(savedTrees[b].lastModified || savedTrees[b].dateCreated);
      return dateB - dateA;
    });
    
    // Create HTML for saved trees
    let treesHTML = '';
    treeIds.forEach(treeId => {
      const tree = savedTrees[treeId];
      const date = new Date(tree.lastModified || tree.dateCreated);
      const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      
      treesHTML += `
        <div class="saved-tree-item" data-tree-id="${treeId}">
          <div class="saved-tree-info">
            <h4 class="saved-tree-name">${tree.name}</h4>
            <div class="saved-tree-meta">
              <span class="saved-tree-root">${tree.rootTitle}</span>
              <span class="saved-tree-nodes">${tree.nodeCount} nodes</span>
              <span class="saved-tree-date">${formattedDate}</span>
            </div>
          </div>
          <div class="saved-tree-actions">
            <button class="load-tree-btn" data-tree-id="${treeId}" title="Load this journey">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor"/>
              </svg>
            </button>
            <button class="delete-tree-btn" data-tree-id="${treeId}" title="Delete this journey">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    });
    
    // Update the content
    savedTreesList.innerHTML = treesHTML;
    
    // Add event listeners to the buttons
    document.querySelectorAll('.load-tree-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const treeId = e.currentTarget.getAttribute('data-tree-id');
        console.log(`Loading tree: ${treeId}`);
        await loadSavedTree(treeId);
      });
    });
    
    document.querySelectorAll('.delete-tree-btn').forEach(button => {
      button.addEventListener('click', async (e) => {
        const treeId = e.currentTarget.getAttribute('data-tree-id');
        await deleteSavedTree(treeId);
        // Reload the list
        loadSavedTrees();
      });
    });
    
  } catch (error) {
    console.error('Error loading saved trees:', error);
    savedTreesList.innerHTML = `
      <div class="error-loading-trees">
        <p>Error loading saved RabbitHoles: ${error.message}</p>
      </div>
    `;
  }
}

// Function to load a saved tree
async function loadSavedTree(treeId) {
  try {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.textContent = 'Loading RabbitHole...';
    document.body.appendChild(loadingIndicator);
    
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to load the tree
    chrome.tabs.sendMessage(tab.id, {
      action: 'loadSavedTree',
      treeId: treeId
    }, (response) => {
      document.body.removeChild(loadingIndicator);
      
      // Close the popup window
      window.close();
    });
  } catch (error) {
    console.error('Error loading saved tree:', error);
    showStatusIndicator('Error loading RabbitHole');
  }
}

// Function to delete a saved tree
async function deleteSavedTree(treeId) {
  try {
    // Get saved trees
    const savedTreesData = await new Promise(resolve => {
      chrome.storage.sync.get(['savedTrees'], result => {
        resolve(result.savedTrees || {});
      });
    });
    
    // Check if the tree exists
    if (!savedTreesData[treeId]) {
      console.warn(`Tree with ID ${treeId} not found`);
      return false;
    }
    
    // Ask for confirmation
    if (!confirm(`Are you sure you want to delete "${savedTreesData[treeId].name}"?`)) {
      return false;
    }
    
    // Delete the tree
    delete savedTreesData[treeId];
    
    // Save updated list back to storage
    await new Promise(resolve => {
      chrome.storage.sync.set({ 'savedTrees': savedTreesData }, resolve);
    });
    
    console.log(`Tree with ID ${treeId} deleted successfully`);
    showStatusIndicator('RabbitHole deleted');
    return true;
  } catch (error) {
    console.error("Error deleting tree:", error);
    showStatusIndicator('Error deleting RabbitHole');
    return false;
  }
}

// Get the necessary elements from popup.html
document.addEventListener('DOMContentLoaded', function() {
  console.log('RabbitHole popup loaded');
  
  const toggleSwitch = document.getElementById('extensionToggle');
  const toggleStatus = document.getElementById('toggleStatus');
  
  // Load saved settings
  chrome.storage.sync.get(['rabbitHoleEnabled'], function(data) {
    const isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    console.log('Extension enabled state loaded from storage:', isEnabled);
    
    toggleSwitch.checked = isEnabled;
    toggleStatus.textContent = isEnabled ? 'enabled' : 'disabled';
    toggleStatus.style.color = isEnabled ? '#0550ae' : '#777';
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
  
  // Load saved trees
  loadSavedTrees();
});

// Function to handle fetching and displaying full article content
async function fetchFullArticle(title, container) {
  // Don't fetch if disabled
  if (!isEnabled) {
    console.log("RabbitHole is disabled, not fetching article");
    return null;
  }

  // Only fetch full articles for Wikipedia source
  if (window.selectedSource !== 'Wikipedia') {
    console.log("Not fetching full article for non-Wikipedia source");
    
    // For Dictionary source, we've already got all we need
    if (container) {
      container.innerHTML = '';
      container.innerHTML = `
        <div class="rabbithole-dictionary-content">
          <p>${container.closest('.rabbithole-modal').querySelector('.rabbithole-modal-body p').textContent}</p>
          <div class="rabbithole-footer">
            <a href="https://www.dictionary.com/browse/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
              View full definition on Dictionary.com
            </a>
          </div>
        </div>
      `;
    }
    return null;
  }

  console.log("Fetching full Wikipedia article for:", title);
  
  // Add loading indicator
  if (container) {
    container.innerHTML = `
      <div class="rabbithole-loading">
        <div class="loading-spinner"></div>
        <p>Loading article...</p>
      </div>
    `;
  }
  
  try {
    // Fetch from Wikipedia's API to get the HTML content
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data || !data.parse || !data.parse.text || !data.parse.text['*']) {
      if (container) {
        container.innerHTML = `
          <div class="rabbithole-error">
            <p>Couldn't load the full article.</p>
            <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
              View on Wikipedia instead
            </a>
          </div>
        `;
      }
      return null;
    }
    
    console.log("Full article data received for:", title);
    return data.parse.text['*'];
  } catch (error) {
    console.error("Error fetching full article:", error);
    if (container) {
      container.innerHTML = `
        <div class="rabbithole-error">
          <p>Error loading article: ${error.message}</p>
          <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
            View on Wikipedia instead
          </a>
        </div>
      `;
    }
    return null;
  }
}

// Function to process article content
async function processArticleContent(title, container) {
  // Only process if we're using Wikipedia
  if (window.selectedSource !== 'Wikipedia') {
    console.log("Skipping article processing for Dictionary source");
    return;
  }

  console.log("Processing article content for:", title);
  const html = await fetchFullArticle(title, container);
  
  if (!html) return;
  
  // Create a temporary element to parse the HTML
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  
  // Remove unwanted elements
  const unwanted = tempElement.querySelectorAll('.mw-editsection, .reference, #coordinates, .mw-empty-elt');
  unwanted.forEach(el => el.remove());
  
  // Fix image URLs
  const images = tempElement.querySelectorAll('img');
  const processedImages = new Set(); // Track processed images to avoid duplicates
  
  images.forEach(img => {
    if (img.src) {
      // Skip if we've already processed an image with this src
      if (processedImages.has(img.src)) {
        img.remove();
        return;
      }
      
      // Add to processed set
      processedImages.add(img.src);
      
      // Fix relative URLs
      if (img.src.startsWith('//')) {
        img.src = 'https:' + img.src;
      }
      
      // Make images open in a new tab when clicked
      img.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(this.src, '_blank');
      });
      
      // Add pointer cursor
      img.style.cursor = 'pointer';
    }
  });
  
  // Set the content
  container.innerHTML = '';
  
  // Add a "View on Wikipedia" link at the top
  const wikiLink = document.createElement('div');
  wikiLink.className = 'rabbithole-wiki-link';
  wikiLink.innerHTML = `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4.42-3.58-8-8-8zm0 7.8L5.67 4.83l-.66.67L8 8.2l2.99-2.7-.66-.67L8 7.8z"/>
    </svg>
    View this article on Wikipedia
  </a>`;
  container.appendChild(wikiLink);
  
  // Add the article content
  container.appendChild(tempElement);
  
  // Process links in the content
  processWikiLinks(tempElement);
}

// Update createExpandedModal to use processArticleContent
function createExpandedModal(data, nodeId = null) {
  // Your existing code... 
  
  // Then add this where the modal content is loaded:
  if (window.selectedSource === 'Wikipedia') {
    // For the full article, we need to fetch it
    modalContent += `
      <div class="rabbithole-article-content">
        <p class="loading">Loading full article...</p>
      </div>
    `;
    
    // After modal is added to DOM
    // Add this after document.body.appendChild(container);
    // Process the article content for Wikipedia
    processArticleContent(data.title, container.querySelector('.rabbithole-article-content'));
  } else {
    // For Dictionary, just show the definition we already have
    modalContent += `
      <div class="rabbithole-article-content">
        <p>${data.extract}</p>
        <div class="rabbithole-footer">
          <a href="${data.url}" target="_blank" rel="noopener noreferrer">
            View on Dictionary.com
          </a>
        </div>
      </div>
    `;
  }
  
  // Rest of your code...
}