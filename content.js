// Add at the beginning of the file
console.log("RabbitHole: Content script starting to load");

// Global variables to track state
let currentNodeId = 0;
let isInitialized = false;
let isEnabled = true; // Default to enabled

// Add a cache for dictionary definitions
const dictionaryCache = new Map();

// Add this at the top with other global variables (around line 5)
window.selectedSource = 'Wikipedia'; // Default to Wikipedia

// Add these lines near the top, after the global variables
let treeModule = null;

// Initialize tree module
async function initTreeModule() {
  try {
    treeModule = await import(chrome.runtime.getURL('tree.js'));
    console.log("Tree module loaded successfully");
  } catch (error) {
    console.error("Failed to load tree module:", error);
  }
}

// Call this during initialization
initTreeModule();

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "setEnabled") {
    isEnabled = message.enabled;
    console.log("RabbitHole extension " + (isEnabled ? "enabled" : "disabled"));
    sendResponse({status: "success"});
  }
  return true; // Keep the message channel open for async response
});

// Replace the generateNodeId function with this stub that uses the tree module
function generateNodeId() {
  return treeModule ? treeModule.generateNodeId() : currentNodeId++;
}

// Function to fetch Wikipedia data
async function fetchWikipediaData(term) {
  // Don't fetch if disabled
  if (!isEnabled) {
    console.log("RabbitHole is disabled, not fetching data");
    return null;
  }
  
  console.log("Fetching Wikipedia data for:", term);
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&format=json&origin=*`;
  
  try {
    // First, search for the term
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    console.log("Search results:", searchData);
    
    if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
      console.log("No Wikipedia page found for:", term);
      return null; // No Wikipedia page found
    }
    
    // Get the first search result's title
    const pageTitle = searchData.query.search[0].title;
    console.log("Found Wikipedia page:", pageTitle);
    
    // Now fetch the summary and image
    const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&titles=${encodeURIComponent(pageTitle)}&format=json&pithumbsize=300&origin=*`;
    
    const summaryResponse = await fetch(summaryUrl);
    const summaryData = await summaryResponse.json();
    
    // Extract the page ID
    const pageId = Object.keys(summaryData.query.pages)[0];
    const page = summaryData.query.pages[pageId];
    
    console.log("Wikipedia page data:", page);
    
    return {
      title: page.title,
      extract: page.extract || "No extract available",
      thumbnail: page.thumbnail ? page.thumbnail.source : null,
      pageId: pageId
    };
  } catch (error) {
    console.error('Error fetching Wikipedia data:', error);
    return null;
  }
}

// Function to create and show the popup
function createPopup(data, position, isTreeNode = false, nodeId = null, sourceElement = null) {
  // Remove any existing popups
  removePopups();
  
  // Create the popup element
  const popup = document.createElement('div');
  popup.className = 'rabbithole-popup';
  popup.style.position = 'absolute';
  popup.style.left = `${position.x}px`;
  popup.style.top = `${position.y}px`;
  popup.style.zIndex = '10000';
  
  // Store reference to the source element
  if (sourceElement) {
    popup.dataset.sourceElementId = Date.now() + Math.random().toString(36).substring(2, 9);
    sourceElement.dataset.popupId = popup.dataset.sourceElementId;
  }
  
  // Store the source used to fetch this data
  const dataSource = data.source || window.selectedSource || 'Wikipedia';
  popup.dataset.source = dataSource;
  
  console.log('Creating popup for:', data.title, 'with source:', dataSource);
  
  // Different layout for Dictionary vs Wikipedia
  if (dataSource === 'Dictionary') {
    // Dictionary layout (no image)
    let popupContent = `
      <div class="popup-modern popup-dictionary">
        <div class="popup-header-bar">
          <h2 class="popup-title">${data.title}</h2>
          <div class="popup-dropdown">
            <div class="dropdown-button">
              <span class="dropdown-label">Dictionary</span>
            </div>
            <div class="dropdown-content">
              <div class="dropdown-item" data-source="Wikipedia">
                <span>Wikipedia</span>
              </div>
              <div class="dropdown-item active" data-source="Dictionary">
                <span>Dictionary</span>
              </div>
            </div>
          </div>
        </div>
        <div class="popup-layout dictionary-layout">
          <div class="popup-content full-width">
            <div class="popup-definition">
              <p class="popup-summary">${data.extract}</p>
            </div>
            <a href="${data.url}" target="_blank" class="popup-link">View on Dictionary.com</a>
          </div>
        </div>
      </div>
    `;
    popup.innerHTML = popupContent;
  } else {
    // Wikipedia layout (with image)
    let popupContent = `
      <div class="popup-modern">
        <div class="popup-header-bar">
          <h2 class="popup-title">${data.title}</h2>
          <div class="popup-dropdown">
            <div class="dropdown-button">
              <span class="dropdown-label">Wikipedia</span>
            </div>
            <div class="dropdown-content">
              <div class="dropdown-item active" data-source="Wikipedia">
                <span>Wikipedia</span>
              </div>
              <div class="dropdown-item" data-source="Dictionary">
                <span>Dictionary</span>
              </div>
            </div>
          </div>
        </div>
        <div class="popup-layout ${!data.thumbnail ? 'no-image' : ''}">
          ${data.thumbnail ? `
            <div class="popup-image-container">
              <img src="${data.thumbnail}" alt="${data.title}" class="popup-thumbnail">
            </div>
          ` : ''}
          <div class="popup-content">
            <p class="popup-summary">${data.extract.substring(0, 150)}${data.extract.length > 150 ? '...' : ''}</p>
            <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}" target="_blank" class="popup-link">View on Wikipedia</a>
          </div>
        </div>
      </div>
    `;
    popup.innerHTML = popupContent;
  }
  
  // Add event listeners
  
  // Add mouseenter/mouseleave events to the popup itself
  popup.addEventListener('mouseenter', function() {
    // Keep the popup visible when mouse is over it
    this.dataset.isHovered = 'true';
  });
  
  popup.addEventListener('mouseleave', function() {
    // Set flag for cleanup
    this.dataset.isHovered = 'false';
    // Add fadeout class
    this.classList.add('rabbithole-popup-fadeout');
    // Schedule removal
    setTimeout(() => {
      // Only remove if still not hovered
      if (this.dataset.isHovered !== 'true' && document.body.contains(this)) {
        this.remove();
      }
    }, 200); // Match animation duration
  });
  
  // Make the title clickable to expand
  popup.querySelector('.popup-title').addEventListener('click', function() {
    popup.remove();
    createExpandedModal(data, isTreeNode ? nodeId : null);
  });
  
  // Dropdown functionality
  const dropdownButton = popup.querySelector('.dropdown-button');
  const dropdownContent = popup.querySelector('.dropdown-content');
  
  dropdownButton.addEventListener('click', function(e) {
    e.stopPropagation();
    dropdownContent.classList.toggle('show');
  });
  
  // Source selection
  const dropdownItems = popup.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.addEventListener('click', async function(e) {
      e.stopPropagation();
      e.preventDefault();
      
      const newSource = this.dataset.source;
      console.log("Changing source in popup to:", newSource);
      
      // Debug
      console.log("Current source before change:", window.selectedSource);
      
      // Update UI
      dropdownItems.forEach(i => i.classList.remove('active'));
      this.classList.add('active');
      
      // Update dropdown button label
      const buttonLabel = dropdownButton.querySelector('.dropdown-label');
      buttonLabel.textContent = newSource;
      
      // Hide dropdown
      dropdownContent.classList.remove('show');
      
      // Save the setting
      window.selectedSource = newSource;
      chrome.storage.sync.set({ 'selectedSource': newSource }, function() {
        console.log("Source setting saved:", newSource);
      });
      
      console.log("Source changed to:", window.selectedSource);
      
      // Fetch new data for the current term
      console.log("Fetching new data with source:", window.selectedSource);
      const newData = await fetchData(data.title);
      if (newData) {
        console.log("Got new data:", newData);
        // Add source info to the data
        newData.source = newSource;
        
        // Remove current popup
        popup.remove();
        
        // Create new popup with updated data
        createPopup(newData, position, isTreeNode, nodeId, sourceElement);
      } else {
        console.error("Failed to fetch new data for source:", newSource);
      }
    });
  });
  
  // Close popup when clicking outside
  document.addEventListener('click', function closePopup(e) {
    // Only close if the click is outside the popup
    if (!popup.contains(e.target)) {
      // Remove the event listener to avoid memory leaks
      document.removeEventListener('click', closePopup);
      // Remove the popup
      removePopups();
    }
  });
  
  // Add to the DOM
  document.body.appendChild(popup);
  
  return popup;
}

// Function to remove popups with animation
function removePopups() {
  // Get all popups
  const popups = document.querySelectorAll('.rabbithole-popup');
  
  popups.forEach(popup => {
    // Only remove the popup if it's not being hovered
    if (popup.dataset.isHovered !== 'true') {
      // Check if the source element is being hovered
      let sourceId = popup.dataset.sourceElementId;
      let sourceElement = sourceId ? document.querySelector(`[data-popup-id="${sourceId}"]`) : null;
      
      if (sourceElement && sourceElement.matches(':hover')) {
        // Source element is hovered, don't remove popup
        return;
      }
      
      // Add the fadeout animation class
      popup.classList.add('rabbithole-popup-fadeout');
      
      // Remove the popup after animation completes
      setTimeout(() => {
        if (document.body.contains(popup)) {
          popup.remove();
        }
      }, 200); // Match the animation duration
    }
  });
}

// Update the createExpandedModal function to use the tree module
function createExpandedModal(data, nodeId = null) {
  // Make sure tree module is loaded
  if (!treeModule) {
    console.error("Tree module not loaded yet");
    return;
  }
  
  // Check if we're coming from a wiki link inside an existing modal
  const isInternalNavigation = nodeId === null && document.querySelector('.rabbithole-container');
  
  // Only remove modals if it's not internal navigation from within a modal
  if (!isInternalNavigation) {
    removeModals();
  } else {
    // Remove just the content, not the whole modal
    const existingModalContent = document.querySelector('.rabbithole-modal');
    if (existingModalContent) {
      existingModalContent.remove();
    }
  }
  
  // If this is a new topic (not from tree), add it to the tree
  if (nodeId === null) {
    // Check if we already have an active session
    if (treeModule.wikiTree.length === 0) {
      // This is the first node in a new session
      nodeId = treeModule.addTreeNode(data.title, null);
      console.log("Started new rabbithole session with root node:", data.title);
    } else {
      // This is a continuation of the current session
      // Find the currently active node
      const activeNodeId = treeModule.getActiveNodeId() || treeModule.wikiTree[0].id;
      console.log("Active node for new content:", activeNodeId);
      
      // Add as a child of the active node
      nodeId = treeModule.addTreeNode(data.title, activeNodeId);
      console.log("Added node to tree:", data.title, "with parent:", treeModule.getNodeById(activeNodeId)?.title);
    }
    
    // Set this node as the active one for future expansions
    treeModule.setActiveNode(nodeId);
  }
  
  // Get or create the container for both tree and modal
  let container;
  if (isInternalNavigation) {
    container = document.querySelector('.rabbithole-container');
  } else {
    container = document.createElement('div');
    container.className = 'rabbithole-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.zIndex = '10001';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
    container.style.backdropFilter = 'blur(5px)';
  }
  
  // Create or update the tree visualization
  let treeContainer;
  if (isInternalNavigation) {
    // Update existing tree
    treeContainer = container.querySelector('.rabbithole-tree-container');
    const treeVisualization = treeContainer.querySelector('.rabbithole-tree');
    treeVisualization.innerHTML = treeModule.generateTreeHTML();
  } else {
    // Create new tree container
    treeContainer = document.createElement('div');
    treeContainer.className = 'rabbithole-tree-container';
    
    // Add tree title
    const treeTitle = document.createElement('h3');
    treeTitle.textContent = 'Your Rabbit Hole Journey';
    treeContainer.appendChild(treeTitle);
    
    // Add tree visualization
    const treeVisualization = document.createElement('div');
    treeVisualization.className = 'rabbithole-tree';
    
    // Generate tree HTML
    const treeHTML = treeModule.generateTreeHTML();
    treeVisualization.innerHTML = treeHTML;
    
    treeContainer.appendChild(treeVisualization);
    container.appendChild(treeContainer);
  }
  
  // Create the modal element
  const modal = document.createElement('div');
  modal.className = 'rabbithole-modal';
  
  // Create the content
  let modalContent = `
    <div class="rabbithole-modal-header">
      <h2>${data.title}</h2>
      <button class="rabbithole-modal-close-btn">×</button>
    </div>
    <div class="rabbithole-modal-body">
  `;
  
  // Add thumbnail if available
  if (data.thumbnail) {
    modalContent += `<img src="${data.thumbnail}" alt="${data.title}" class="rabbithole-modal-thumbnail">`;
  }
  
  // For the full article, we need to fetch it
  modalContent += `
      <div class="rabbithole-article-content">
        <p class="loading">Loading full article...</p>
      </div>
    </div>
  `;
  
  modal.innerHTML = modalContent;
  
  // Add components to the container
  container.appendChild(modal);
  
  // Add to the DOM if it's a new modal
  if (!isInternalNavigation) {
    document.body.appendChild(container);
  }
  
  // Process the article content
  processArticleContent(data.title, modal.querySelector('.rabbithole-article-content'));
  
  // Add the close button event listener for the modal
  modal.querySelector('.rabbithole-modal-close-btn').addEventListener('click', function() {
    // Clear the tree data before removing the modal
    if (treeModule) {
      treeModule.clearTree();
      console.log("Tree cleared on modal close");
    }
    container.remove();
  });
  
  // Update the node click handler
  setTimeout(() => {
    console.log("Setting up tree node click handlers");
    
    // Use the tree module's handler setup
    treeModule.setupTreeNodeHandlers(container, async (nodeInfo, nodeId) => {
      console.log("Tree node clicked:", nodeInfo.title);
      
      // Load the content for this node, but don't recreate the modal
      const data = await fetchWikipediaData(nodeInfo.title);
      if (data) {
        // Update the modal content without recreating it
        container.querySelector('.rabbithole-modal-header h2').textContent = data.title;
        
        const contentArea = container.querySelector('.rabbithole-article-content');
        contentArea.innerHTML = `
          <div class="rabbithole-loading">
            <div class="loading-spinner"></div>
            <p>Loading article...</p>
          </div>
        `;
        
        // Reuse the existing modal but update its content
        await processArticleContent(data.title, contentArea);
        
        // If there's a thumbnail, update it
        const thumbnailContainer = container.querySelector('.rabbithole-modal-thumbnail');
        if (thumbnailContainer && data.thumbnail) {
          thumbnailContainer.src = data.thumbnail;
        }
        
        // Update the tree visualization to reflect the active node change
        const treeVisualization = container.querySelector('.rabbithole-tree');
        if (treeVisualization) {
          treeVisualization.innerHTML = treeModule.generateTreeHTML();
        }
      }
    });
  }, 100);
  
  return container;
}

// Function to remove all modals
function removeModals() {
  // Clear the tree data
  if (treeModule) {
    treeModule.clearTree();
    console.log("Tree cleared in removeModals");
  }
  
  const containers = document.querySelectorAll('.rabbithole-container');
  containers.forEach(container => container.remove());
}

// Function to fetch the full article
async function fetchFullArticle(title, container) {
  // Don't fetch if disabled
  if (!isEnabled) {
    console.log("RabbitHole is disabled, not fetching article");
    return null;
  }

  console.log("Fetching full article for:", title, "Source:", window.selectedSource);
  
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
    if (window.selectedSource === 'Wikipedia') {
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
    } 
    else if (window.selectedSource === 'Dictionary') {
      // For Dictionary, we'll fetch more comprehensive data if possible
      try {
        const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(title)}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data || !data.length) {
          if (container) {
            container.innerHTML = `
              <div class="rabbithole-error">
                <p>No detailed definition available.</p>
                <a href="https://www.dictionary.com/browse/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
                  View on Dictionary.com instead
                </a>
              </div>
            `;
          }
          return null;
        }
        
        // Format comprehensive dictionary data
        let html = `<div class="dictionary-entry">`;
        
        // Add phonetics if available
        if (data[0].phonetics && data[0].phonetics.length > 0 && data[0].phonetics[0].text) {
          html += `<p class="phonetic">${data[0].phonetics[0].text}</p>`;
        }
        
        // Add audio if available
        if (data[0].phonetics && data[0].phonetics.length > 0 && data[0].phonetics[0].audio) {
          html += `
            <div class="audio-section">
              <audio controls>
                <source src="${data[0].phonetics[0].audio}" type="audio/mpeg">
                Your browser does not support the audio element.
              </audio>
            </div>
          `;
        }
        
        // Process all meanings
        data[0].meanings.forEach(meaning => {
          html += `
            <div class="meaning">
              <h3 class="part-of-speech">${meaning.partOfSpeech}</h3>
              <ol class="definitions">
          `;
          
          meaning.definitions.forEach(def => {
            html += `<li>
              <p class="definition">${def.definition}</p>
            `;
            
            if (def.example) {
              html += `<p class="example">"${def.example}"</p>`;
            }
            
            html += `</li>`;
          });
          
          html += `</ol>`;
          
          // Add synonyms if available
          if (meaning.synonyms && meaning.synonyms.length > 0) {
            html += `
              <div class="synonyms">
                <h4>Synonyms:</h4>
                <p>${meaning.synonyms.join(', ')}</p>
              </div>
            `;
          }
          
          // Add antonyms if available
          if (meaning.antonyms && meaning.antonyms.length > 0) {
            html += `
              <div class="antonyms">
                <h4>Antonyms:</h4>
                <p>${meaning.antonyms.join(', ')}</p>
              </div>
            `;
          }
          
          html += `</div>`;
        });
        
        html += `</div>`;
        return html;
      } catch (error) {
        console.error("Error fetching detailed dictionary data:", error);
        // Fall back to basic definition
        if (container) {
          const modalBody = container.closest('.rabbithole-modal-body');
          if (modalBody) {
            const basicDefinition = modalBody.querySelector('p')?.textContent || "No definition available.";
            return `
              <div class="dictionary-entry">
                <p class="definition">${basicDefinition}</p>
                <a href="https://www.dictionary.com/browse/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
                  View more on Dictionary.com
                </a>
              </div>
            `;
          }
        }
        return null;
      }
    }
  } catch (error) {
    console.error("Error fetching full article:", error);
    if (container) {
      container.innerHTML = `
        <div class="rabbithole-error">
          <p>Error loading article: ${error.message}</p>
          <a href="${window.selectedSource === 'Wikipedia' 
              ? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`
              : `https://www.dictionary.com/browse/${encodeURIComponent(title)}`}" 
            target="_blank" rel="noopener noreferrer">
            View on ${window.selectedSource} instead
          </a>
        </div>
      `;
    }
    return null;
  }
}

// Function to process Wiki links in the fetched content
function processWikiLinks(element) {
  console.log("Processing wiki links in content");
  
  // Process with a slight delay to ensure DOM is ready
  setTimeout(() => {
    try {
      const links = element.querySelectorAll('a');
      console.log(`Found ${links.length} links to process`);
      
      links.forEach((link, index) => {
        try {
          // Store the original href for reference
          const originalHref = link.getAttribute('href');
          
          if (!originalHref) return;
          
          // Check if it's an internal Wikipedia link
          if ((originalHref.startsWith('/wiki/') || originalHref.includes('wikipedia.org/wiki/')) && 
              // Exclude special pages, references, anchors, etc.
              !originalHref.includes('#cite_note') && 
              !originalHref.includes('#cite_ref') &&
              !originalHref.match(/\/wiki\/(File|Special|Help|Category|Talk|Template|Wikipedia):/i)) {
            
            console.log(`Processing wiki article link ${index}: ${originalHref}`);
            
            // Extract the title from the link
            let title = '';
            if (originalHref.startsWith('/wiki/')) {
              title = decodeURIComponent(originalHref.substring(6)); // Remove '/wiki/'
            } else {
              const parts = originalHref.split('/wiki/');
              title = decodeURIComponent(parts[parts.length - 1]);
            }
            
            // Replace spaces with spaces (underscores are in URLs)
            title = title.replace(/_/g, ' ');
            
            // Remove any anchor parts (#section)
            title = title.split('#')[0];
            
            console.log(`Wiki link title: ${title}`);
            
            // Store title as a data attribute
            link.setAttribute('data-wiki-title', title);
            
            // Completely replace the href to prevent default navigation
            const originalURL = link.href;
            link.setAttribute('href', 'javascript:void(0)');
            
            // Store original URL for backup access
            link.setAttribute('data-original-url', originalURL);
            
            // Create a clean version of the link to avoid existing event handlers
            const newLink = link.cloneNode(true);
            if (link.parentNode) {
              link.parentNode.replaceChild(newLink, link);
              link = newLink;
            }
            
            // Now style the link to match highlighted links
            link.className = 'rabbithole-link';
            link.style.color = '#3a5ccc'; // explicit primary color
            link.style.textDecoration = 'underline';
            link.style.cursor = 'pointer';
            link.style.backgroundColor = 'rgba(58, 92, 204, 0.08)';
            link.style.borderRadius = '3px';
            link.style.padding = '0 3px';
            link.style.transition = 'all 0.2s ease';
            
            // Add hover effects
            link.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'rgba(58, 92, 204, 0.15)';
            });
            
            link.addEventListener('mouseleave', function() {
              this.style.backgroundColor = 'rgba(58, 92, 204, 0.08)';
            });
            
            // Add hover tooltip event
            link.addEventListener('mouseenter', function(e) {
              const title = this.getAttribute('data-wiki-title');
              if (!title) return;
              
              // Don't fetch if extension is disabled
              if (!isEnabled) return;
              
              // Clear any existing timeout
              if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
              }
              
              // Skip if there's already a popup
              const existingPopup = document.querySelector('.rabbithole-popup');
              if (existingPopup) return;
              
              // Set timeout to prevent too many requests on quick mouse movements
              this.hoverTimeout = setTimeout(async () => {
                const rect = this.getBoundingClientRect();
                const position = {
                  x: rect.left + window.scrollX,
                  y: rect.bottom + window.scrollY
                };
                
                try {
                  // Fetch data with current source setting
                  const data = await fetchData(title);
                  if (data) {
                    // Create the popup with the data
                    createPopup(data, position, false, null, this);
                  }
                } catch (error) {
                  console.error("Error showing hover preview:", error);
                }
              }, 300);
            });
            
            // Add explicit mouseleave event to remove popup
            link.addEventListener('mouseleave', function() {
              if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
              }
              removePopups();
            });
            
            // Update the link click handler
            link.addEventListener('click', async function(e) {
              console.log("Wiki link clicked:", this.getAttribute('data-wiki-title'));
              e.preventDefault();
              e.stopPropagation();
              
              const title = this.getAttribute('data-wiki-title');
              if (!title) {
                console.error("No title found in data attribute");
                return;
              }
              
              // Show a loading indicator in the link
              const originalText = this.innerHTML;
              this.innerHTML = `<span class="link-loading">Loading...</span>`;
              
              try {
                console.log("Wiki link clicked, fetching data for:", title);
                const data = await fetchData(title);
                // Restore original text
                this.innerHTML = originalText;
                
                if (data) {
                  console.log("Wiki link data retrieved, opening modal");
                  // Create new modal with the data, but don't pass a nodeId
                  // This will cause a new node to be added as a child of the current active node
                  createExpandedModal(data);
                } else {
                  console.error("No data returned for:", title);
                  // Fallback to original URL if fetch fails
                  window.open(this.getAttribute('data-original-url'), '_blank');
                }
              } catch (error) {
                console.error("Error processing wiki link click:", error);
                // Restore original text
                this.innerHTML = originalText;
                // Fallback to original URL if error
                window.open(this.getAttribute('data-original-url'), '_blank');
              }
            });
          } 
          // Handle reference/citation links
          else if (originalHref.includes('#cite_') || 
                   originalHref.match(/\/wiki\/(File|Special|Help|Category|Talk|Template|Wikipedia):/i)) {
            
            console.log(`Processing special wiki link: ${originalHref}`);
            
            // Make it open in Wikipedia directly
            const baseUrl = 'https://en.wikipedia.org';
            let fullUrl;
            
            if (originalHref.startsWith('/')) {
              fullUrl = baseUrl + originalHref;
            } else if (originalHref.includes('wikipedia.org')) {
              fullUrl = originalHref;
            } else {
              // Handle relative URLs that don't start with slash
              fullUrl = baseUrl + '/' + originalHref;
            }
            
            link.setAttribute('href', fullUrl);
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            link.classList.add('rabbithole-special-link');
          }
          // Handle external links (non-Wikipedia)
          else if (link.href && !link.href.startsWith('javascript:')) {
            // Check if this might be an incorrectly formed internal link (like NASA.com/wiki/...)
            if (originalHref.includes('/wiki/') && !originalHref.includes('wikipedia.org')) {
              console.log(`Fixing malformed wiki link: ${originalHref}`);
              
              // This is likely a site-specific wiki link that should go to Wikipedia
              const wikiPart = originalHref.substring(originalHref.indexOf('/wiki/') + 6);
              const title = decodeURIComponent(wikiPart).replace(/_/g, ' ').split('#')[0];
              
              // Store the original link info
              link.setAttribute('data-original-url', link.href);
              link.setAttribute('data-wiki-title', title);
              
              // Replace the href to prevent navigation
              link.setAttribute('href', 'javascript:void(0)');
              
              // Add styling
              link.classList.add('rabbithole-link');
              link.classList.add('rabbithole-fixed-link');
              
              // Add click handler that attempts to find the Wikipedia article
              link.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const title = this.getAttribute('data-wiki-title');
                if (!title) return;
                
                // Show loading state
                const originalText = this.innerHTML;
                this.innerHTML = `<span class="link-loading">Loading...</span>`;
                
                try {
                  const data = await fetchData(title);
                  // Restore original text
                  this.innerHTML = originalText;
                  
                  if (data) {
                    createExpandedModal(data);
                  } else {
                    // If no Wikipedia data, open the original URL
                    window.open(this.getAttribute('data-original-url'), '_blank');
                  }
                } catch (error) {
                  console.error("Error with fixed link:", error);
                  this.innerHTML = originalText;
                  window.open(this.getAttribute('data-original-url'), '_blank');
                }
              });
            } else {
              // Regular external link
              link.setAttribute('target', '_blank');
              link.setAttribute('rel', 'noopener noreferrer');
            }
          }
        } catch (error) {
          console.error("Error processing individual link:", error);
        }
      });
      
      console.log("Finished processing all wiki links");
    } catch (error) {
      console.error("Error in processWikiLinks:", error);
    }
  }, 200);
}

// Main function to initialize the extension
function initRabbitHole() {
  if (isInitialized) {
    console.log("RabbitHole already initialized");
    return;
  }
  
  console.log("Initializing RabbitHole extension...");
  isInitialized = true;
  
  // Load the tree module
  initTreeModule().then(() => {
    console.log("Tree module initialized for extension");
  });
  
  // Check if the extension is enabled in storage
  chrome.storage.sync.get(['rabbitHoleEnabled', 'selectedSource'], function(data) {
    // Default to enabled if setting doesn't exist
    isEnabled = data.rabbitHoleEnabled !== undefined ? data.rabbitHoleEnabled : true;
    
    // Load saved source preference
    window.selectedSource = data.selectedSource || 'Wikipedia';
    console.log("RabbitHole initialized with source:", window.selectedSource);
    
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
          console.log("Fetching data...");
          // Fetch data for the selected text from the active source
          const data = await fetchData(selectedText);
          
          if (data) {
            console.log("Wikipedia data found, creating wrapper");
            // Create a wrapper span to replace the selected text
            const wrapper = document.createElement('span');
            wrapper.className = 'rabbithole-link';
            wrapper.textContent = selectedText;
            
            // Apply explicit styling
            wrapper.style.color = '#3a5ccc'; // explicit primary color
            wrapper.style.textDecoration = 'underline';
            wrapper.style.cursor = 'pointer';
            wrapper.style.backgroundColor = 'rgba(58, 92, 204, 0.08)';
            wrapper.style.borderRadius = '3px';
            wrapper.style.padding = '0 3px';
            wrapper.style.transition = 'all 0.2s ease';
            
            // Add hover effects
            wrapper.addEventListener('mouseenter', function() {
              this.style.backgroundColor = 'rgba(58, 92, 204, 0.15)';
            });
            
            wrapper.addEventListener('mouseleave', function() {
              this.style.backgroundColor = 'rgba(58, 92, 204, 0.08)';
            });
            
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
              
              // Ensure we're using the data with the correct source
              if (data && data.source && data.source !== window.selectedSource) {
                // If data was fetched with a different source than current setting,
                // we need to re-fetch with current source
                fetchData(data.title).then(newData => {
                  if (newData) {
                    // Create popup with the newly fetched data
                    createPopup(newData, position, false, null, this);
                  }
                });
              } else {
                // Create the popup with existing data
                createPopup(data, position, false, null, this);
              }
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

// Add at the end of the file to ensure script is running
// Make sure it's loaded
setTimeout(() => {
  console.log("RabbitHole: Delayed check - content script loaded and running");
  const styles = window.getComputedStyle(document.documentElement);
  const primaryColor = styles.getPropertyValue('--primary-color').trim();
  console.log("RabbitHole: CSS Variable check - primary color is", primaryColor);
}, 2000);


chrome.storage.sync.get(['rabbitHoleEnabled', 'selectedSource'], function(data) {
  if (data.rabbitHoleEnabled === false) return;
  window.selectedSource = data.selectedSource || 'Wikipedia';
  initRabbitHole();
});

chrome.storage.onChanged.addListener(function(changes) {
  if ('rabbitHoleEnabled' in changes) {
    location.reload();
  }
  if ('selectedSource' in changes) {
    window.selectedSource = changes.selectedSource.newValue;
  }
});

async function fetchData(term) {
  console.log('Fetching data for:', term, 'with source:', window.selectedSource);
  let data;
  
  // Make sure we have the latest selected source
  const currentSource = window.selectedSource || 'Wikipedia';
  
  if (currentSource === 'Wikipedia') {
    data = await fetchWikipediaData(term);
    if (data) {
      data.source = 'Wikipedia';
      console.log('Retrieved Wikipedia data for:', term);
    }
  } else {
    data = await fetchDictionaryData(term);
    if (data) {
      data.source = 'Dictionary';
      console.log('Retrieved Dictionary data for:', term);
    }
  }
  
  return data;
}


async function fetchDictionaryData(term) {
  // Check cache first
  const cacheKey = term.toLowerCase();
  if (dictionaryCache.has(cacheKey)) {
    console.log("Using cached dictionary data for:", term);
    return dictionaryCache.get(cacheKey);
  }

  console.log("Fetching dictionary data for:", term);
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data || !data.length) return null;
    
    // Create consistent data object
    const result = {
      title: term,
      extract: data[0].meanings[0].definitions[0].definition || "No definition available",
      thumbnail: null,
      pageId: term,
      url: `https://www.dictionary.com/browse/${encodeURIComponent(term)}`
    };
    
    // Cache the result
    dictionaryCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Error fetching dictionary data:', error);
    return null;
  }
}

// Update the processArticleContent function to properly display the content
async function processArticleContent(title, container) {
  console.log("Processing article content for:", title);
  const html = await fetchFullArticle(title, container);
  
  if (!html) return;
  
  // Create a temporary element to parse the HTML
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  
  if (window.selectedSource === 'Wikipedia') {
    // Wikipedia-specific processing
    
    // Remove unwanted elements
    const unwanted = tempElement.querySelectorAll('.mw-editsection, #coordinates, .error, .mw-empty-elt');
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
    
    // Fix tables
    const tables = tempElement.querySelectorAll('table');
    tables.forEach(table => {
      table.classList.add('rabbithole-table');
      table.setAttribute('border', '1');
      table.setAttribute('cellpadding', '4');
      table.setAttribute('cellspacing', '0');
      
      // Make sure tables aren't too wide
      table.style.maxWidth = '100%';
      table.style.overflowX = 'auto';
      table.style.display = 'block';
    });
  }
  
  // Set the content
  container.innerHTML = '';
  
  // Add a source-specific link at the top
  const sourceLink = document.createElement('div');
  sourceLink.className = 'rabbithole-wiki-link';
  
  if (window.selectedSource === 'Wikipedia') {
    sourceLink.innerHTML = `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4.42-3.58-8-8-8zm0 7.8L5.67 4.83l-.66.67L8 8.2l2.99-2.7-.66-.67L8 7.8z"/>
      </svg>
      View this article on Wikipedia
    </a>`;
  } else {
    sourceLink.innerHTML = `<a href="https://www.dictionary.com/browse/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 4.42 3.58 8 8 8s8-3.58 8-8c0-4.42-3.58-8-8-8zm0 7.8L5.67 4.83l-.66.67L8 8.2l2.99-2.7-.66-.67L8 7.8z"/>
      </svg>
      View full definition on Dictionary.com
    </a>`;
  }
  
  container.appendChild(sourceLink);
  
  // Add the article content
  container.appendChild(tempElement);
  
  // Process links only for Wikipedia content
  if (window.selectedSource === 'Wikipedia') {
    processWikiLinks(tempElement);
  }
  
  // Add source toggle directly in the modal
  // This allows switching without going back to the popup
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'rabbithole-source-toggle';
  toggleContainer.innerHTML = `
    <div class="extension-toggle">
      <label class="toggle-switch">
        <input type="checkbox" id="modalSourceToggle" ${window.selectedSource === 'Dictionary' ? 'checked' : ''}>
        <span class="toggle-slider"></span>
      </label>
      <span class="toggle-label">Source: <span id="modalCurrentSource">${window.selectedSource}</span></span>
    </div>
  `;
  
  // Add the toggle before the content
  container.insertBefore(toggleContainer, sourceLink);
  
  // Add event listener for the toggle
  const modalToggle = container.querySelector('#modalSourceToggle');
  modalToggle.addEventListener('change', async function() {
    const newSource = this.checked ? 'Dictionary' : 'Wikipedia';
    console.log("Changing source in modal to:", newSource);
    
    // Debug
    console.log("Current source before change:", window.selectedSource);
    
    // Update the display
    const sourceLabel = container.querySelector('#modalCurrentSource');
    if (sourceLabel) {
      sourceLabel.textContent = newSource;
    }
    
    // Save the setting
    window.selectedSource = newSource;
    chrome.storage.sync.set({ 'selectedSource': newSource }, function() {
      console.log("Source setting saved:", newSource);
    });
    
    console.log("Source changed to:", window.selectedSource);
    
    // Clear the container first
    const contentArea = container.querySelector('.rabbithole-article-content');
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="rabbithole-loading">
          <div class="loading-spinner"></div>
          <p>Loading content from ${newSource}...</p>
        </div>
      `;
    }
    
    // Reload the content with the new source
    console.log("Reloading content with new source:", window.selectedSource);
    await processArticleContent(title, container.querySelector('.rabbithole-article-content'));
  });
}
