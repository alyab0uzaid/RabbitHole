// Global variables to track state
let wikiTree = [];
let currentNodeId = 0;
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

// Helper function to create a unique ID for each node in the tree
function generateNodeId() {
  return currentNodeId++;
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
function createPopup(data, position) {
  removePopups();

  const popup = document.createElement('div');
  popup.className = 'rabbithole-popup';
  popup.style.position = 'absolute';
  popup.style.left = `${position.x}px`;
  popup.style.top = `${position.y}px`;
  popup.style.zIndex = '10000';

  let popupContent = `
    <div class="rabbithole-header">
      <h3>${data.title}</h3>
      <button class="rabbithole-close-btn">×</button>
    </div>
    <div class="rabbithole-content">
      <p>${data.extract}</p>
  `;

  if (window.selectedSource === 'Dictionary') {
    popupContent += `<p><a href="${data.url}" target="_blank">View on Dictionary.com</a></p>`;
  } else {
    popupContent += `<p><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}" target="_blank">View on Wikipedia</a></p>`;
  }

  popupContent += `</div>`;

  popup.innerHTML = popupContent;

  popup.querySelector('.rabbithole-close-btn').addEventListener('click', function () {
    popup.remove();
  });

  document.body.appendChild(popup);
}


// Function to remove all popups
function removePopups() {
  const popups = document.querySelectorAll('.rabbithole-popup');
  popups.forEach(popup => popup.remove());
}

// Function to create and show the expanded modal
function createExpandedModal(data, nodeId = null) {
  // Remove any existing modals
  removeModals();
  
  // If this is a new topic (not from tree), add it to the tree
  if (nodeId === null) {
    nodeId = generateNodeId();
    wikiTree.push({
      id: nodeId,
      title: data.title,
      parentId: wikiTree.length > 0 ? wikiTree[wikiTree.length - 1].id : null
    });
    console.log("Added to tree:", data.title, "with parent:", wikiTree.length > 1 ? wikiTree[wikiTree.length - 2].title : "none");
  }
  
  // Create the container for both tree and modal
  const container = document.createElement('div');
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
  
  // Create the tree visualization
  const treeContainer = document.createElement('div');
  treeContainer.className = 'rabbithole-tree-container';
  
  // Add tree title
  const treeTitle = document.createElement('h3');
  treeTitle.textContent = 'Your Rabbit Hole Journey';
  treeContainer.appendChild(treeTitle);
  
  // Add tree visualization
  const treeVisualization = document.createElement('div');
  treeVisualization.className = 'rabbithole-tree';
  
  // Generate GitHub-style tree HTML
  const treeHTML = generateTreeHTML();
  console.log("Tree HTML generated:", treeHTML.substring(0, 100) + "...");
  treeVisualization.innerHTML = treeHTML;
  
  treeContainer.appendChild(treeVisualization);
  
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
  container.appendChild(treeContainer);
  container.appendChild(modal);
  
  // Add to the DOM
  document.body.appendChild(container);
  
  // Add event listeners
  container.querySelector('.rabbithole-modal-close-btn').addEventListener('click', function() {
    container.remove();
  });
  
  // Process the tree visualization links with a delay to ensure DOM is ready
  setTimeout(() => {
    console.log("Setting up tree node click handlers");
    const treeNodes = container.querySelectorAll('.branch-node');
    console.log("Found tree nodes:", treeNodes.length);
    
    treeNodes.forEach(node => {
      node.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const nodeId = parseInt(node.dataset.nodeId);
        const nodeInfo = wikiTree.find(item => item.id === nodeId);
        
        console.log("Tree node clicked:", nodeInfo?.title);
        
        if (nodeInfo) {
          const data = await fetchWikipediaData(nodeInfo.title);
          if (data) {
            // Remove the current container
            container.remove();
            // Create a new modal with the selected node
            createExpandedModal(data, nodeId);
          }
        }
      });
    });
  }, 200);
  
  // Fetch the full article
  fetchFullArticle(data.title, container.querySelector('.rabbithole-article-content'));
  
  return container;
}

// Function to remove all modals
function removeModals() {
  const containers = document.querySelectorAll('.rabbithole-container');
  containers.forEach(container => container.remove());
}

// Function to generate the HTML for the tree
function generateTreeHTML() {
  if (wikiTree.length === 0) {
    return '<p class="empty-tree-message">Your journey starts here. Explore related topics to build your tree!</p>';
  }
  
  console.log("Generating tree with", wikiTree.length, "nodes");
  
  // Create a map for quick lookup of children
  const childrenMap = {};
  wikiTree.forEach(node => {
    if (node.parentId !== null) {
      if (!childrenMap[node.parentId]) {
        childrenMap[node.parentId] = [];
      }
      childrenMap[node.parentId].push(node);
    }
  });
  
  // Find root nodes (no parent)
  const rootNodes = wikiTree.filter(node => node.parentId === null);
  
  // Start the tree HTML
  let html = '<div class="github-tree">';
  
  // Recursive function to build the tree
  function buildTreeHTML(node, depth = 0, isLastChild = false) {
    const children = childrenMap[node.id] || [];
    const hasChildren = children.length > 0;
    
    // Sort children by their ID to maintain chronological order
    const sortedChildren = children.sort((a, b) => a.id - b.id);
    
    let nodeHtml = `
      <div class="tree-branch" style="--depth: ${depth};">
        <div class="branch-graphics">
    `;
    
    // Add the connecting lines
    if (depth > 0) {
      nodeHtml += `<div class="branch-line-horizontal"></div>`;
    }
    
    // Add the node
    nodeHtml += `
          <div class="branch-node ${hasChildren ? 'has-children' : ''}" data-node-id="${node.id}">
            <span class="branch-label">${node.title}</span>
          </div>
        </div>
    `;
    
    // Add children if any
    if (hasChildren) {
      nodeHtml += '<div class="branch-children">';
      
      sortedChildren.forEach((child, index) => {
        const isLast = index === sortedChildren.length - 1;
        nodeHtml += buildTreeHTML(child, depth + 1, isLast);
      });
      
      nodeHtml += '</div>';
    }
    
    nodeHtml += '</div>';
    
    return nodeHtml;
  }
  
  // Build the tree starting from root nodes
  rootNodes.forEach((rootNode, index) => {
    const isLast = index === rootNodes.length - 1;
    html += buildTreeHTML(rootNode, 0, isLast);
  });
  
  html += '</div>';
  return html;
}

// Function to fetch the full article
async function fetchFullArticle(title, container) {
  console.log("Fetching full article for:", title);
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
  
  try {
    // Show loading animation
    container.innerHTML = `
      <div class="rabbithole-loading">
        <div class="loading-spinner"></div>
        <p>Loading Wikipedia article...</p>
      </div>
    `;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.parse && data.parse.text) {
      console.log("Article content received");
      // Create a temporary element to parse the HTML
      const tempElement = document.createElement('div');
      tempElement.innerHTML = data.parse.text['*'];
      
      // Remove unwanted elements
      const unwantedSelectors = [
        '.mw-editsection',
        '.reference',
        '.error',
        '.noprint',
        'script',
        'style',
        '.mw-empty-elt',
        '.mw-jump-link',
        '.mw-references-wrap',
        '#References',
        '#External_links',
        '.hatnote',
        '.navbar'
      ];
      
      unwantedSelectors.forEach(selector => {
        const elements = tempElement.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
      
      // Fix image URLs
      const images = tempElement.querySelectorAll('img');
      images.forEach(img => {
        if (img.src && img.src.startsWith('//')) {
          img.src = 'https:' + img.src;
        }
        // Add loading="lazy" attribute
        img.setAttribute('loading', 'lazy');
        // Add a nice transition effect
        img.style.transition = 'opacity 0.3s ease';
        img.style.opacity = '0';
        img.onload = function() {
          this.style.opacity = '1';
        };
      });
      
      // Enhance tables
      const tables = tempElement.querySelectorAll('table');
      tables.forEach(table => {
        table.classList.add('rabbithole-table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.margin = '20px 0';
        table.style.border = '1px solid #e5e7eb';
      });
      
      // Enhance links with colors
      const internalLinks = tempElement.querySelectorAll('a[href^="/wiki/"]');
      internalLinks.forEach(link => {
        link.style.color = '#0550ae';
      });
      
      // Fix infobox styling
      const infoboxes = tempElement.querySelectorAll('.infobox');
      infoboxes.forEach(infobox => {
        infobox.style.float = 'right';
        infobox.style.margin = '0 0 20px 20px';
        infobox.style.maxWidth = '300px';
        infobox.style.border = '1px solid #eee';
        infobox.style.borderRadius = '8px';
        infobox.style.overflow = 'hidden';
        infobox.style.backgroundColor = '#f8f9fa';
      });
      
      // Process the content to make internal links work with our system
      processWikiLinks(tempElement);
      
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
      
      // Add smooth scroll behavior
      container.style.scrollBehavior = 'smooth';
      
      // Improve paragraph spacing
      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach(p => {
        p.style.marginBottom = '16px';
        p.style.lineHeight = '1.7';
      });
      
      // Enhance headings
      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        heading.style.color = '#0550ae';
        heading.style.fontWeight = '600';
        heading.style.marginTop = '24px';
        heading.style.marginBottom = '16px';
      });
    } else {
      console.error("Failed to load article:", data);
      container.innerHTML = `
        <div class="rabbithole-error">
          <p>Failed to load the article.</p>
          <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
            Try viewing directly on Wikipedia
          </a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching full article:', error);
    container.innerHTML = `
      <div class="rabbithole-error">
        <p>Error loading the article: ${error.message}</p>
        <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(title)}" target="_blank" rel="noopener noreferrer">
          Try viewing directly on Wikipedia
        </a>
      </div>
    `;
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
        // Store the original href for reference
        const originalHref = link.getAttribute('href');
        
        if (!originalHref) return;
        
        // Check if it's an internal Wikipedia link
        if (originalHref.startsWith('/wiki/') || originalHref.includes('wikipedia.org/wiki/')) {
          console.log(`Processing wiki link ${index}: ${originalHref}`);
          
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
          
          // Skip certain special pages
          if (title.startsWith('File:') || 
              title.startsWith('Special:') || 
              title.startsWith('Help:') || 
              title.startsWith('Category:') ||
              title.startsWith('Talk:') ||
              title.startsWith('Wikipedia:')) {
            console.log(`Skipping special wiki page: ${title}`);
            // Open in new tab for special pages
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
            return;
          }
          
          console.log(`Wiki link title: ${title}`);
          
          // Store title as a data attribute
          link.setAttribute('data-wiki-title', title);
          
          // Completely replace the href to prevent default navigation
          const originalURL = link.href;
          link.setAttribute('href', 'javascript:void(0)');
          
          // Store original URL for backup access
          link.setAttribute('data-original-url', originalURL);
          
          // Add styling
          link.classList.add('rabbithole-wiki-internal-link');
          
          // Remove any existing click handlers
          const newLink = link.cloneNode(true);
          link.parentNode.replaceChild(newLink, link);
          link = newLink;
          
          // Add click event handler
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
              const data = await fetchWikipediaData(title);
              // Restore original text
              this.innerHTML = originalText;
              
              if (data) {
                // Create new modal with the data
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
          
          // Add hover tooltip event
          link.addEventListener('mouseenter', function(e) {
            const title = this.getAttribute('data-wiki-title');
            if (!title) return;
            
            // Don't fetch if we're already showing a popup
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
                const data = await fetchWikipediaData(title);
                if (data) {
                  createPopup(data, position);
                }
              } catch (error) {
                console.error("Error showing hover preview:", error);
              }
            }, 300);
          });
          
          // Clear timeout if mouse leaves before the delay
          link.addEventListener('mouseleave', function() {
            if (this.hoverTimeout) {
              clearTimeout(this.hoverTimeout);
              this.hoverTimeout = null;
            }
          });
          
        } else if (link.href && !link.href.startsWith('javascript:')) {
          // For external links, open in a new tab
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
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
          console.log("Fetching data...");
          // Fetch data for the selected text
          const data = await fetchData(selectedText);
          
          if (data) {
            console.log("Wikipedia data found, creating wrapper");
            // Create a wrapper span to replace the selected text
            const wrapper = document.createElement('span');
            wrapper.className = 'rabbithole-link';
            wrapper.textContent = selectedText;
            wrapper.style.color = 'blue';
            wrapper.style.textDecoration = 'underline';
            wrapper.style.cursor = 'pointer';
            
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
              
              createPopup(data, position);
            });
            
            // Add click event to show expanded modal
            wrapper.addEventListener('click', function(e) {
              // Don't show modal if disabled
              if (!isEnabled) return;
              
              e.preventDefault();
              e.stopPropagation();
              
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
  console.log('Selected Source: ' + window.selectedSource);
  if (window.selectedSource === 'Wikipedia') {
    return fetchWikipediaData(term);
  } else {
      /*title: term,
      extract: "Click to view the definition on the dictionary website.",
      thumbnail: null,
      url: `https://www.dictionary.com/browse/${encodeURIComponent(term)}`
      */
      return fetchDictionaryData(term);
  }
}


async function fetchDictionaryData(term) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data || !data.length) return null;
    return {
      title: term,
      extract: data[0].meanings[0].definitions[0].definition || "No definition available",
      thumbnail: null,
      pageId: term,
      url: `https://www.dictionary.com/browse/${encodeURIComponent(term)}`
    };
  } catch (error) {
    console.error('Error fetching dictionary data:', error);
    return null;
  }
}
function createPopup(data, position, isTreeNode = false, nodeId = null) {
  removePopups();
  
  const popup = document.createElement('div');
  popup.className = 'rabbithole-popup';
  popup.style.position = 'absolute';
  popup.style.left = `${position.x}px`;
  popup.style.top = `${position.y}px`;
  popup.style.zIndex = '10000';

  let popupContent = `
    <div class="rabbithole-header">
      <h3>${data.title}</h3>
      <button class="rabbithole-expand-btn">Expand</button>
      <button class="rabbithole-close-btn">×</button>
    </div>
    <div class="rabbithole-content">
  `;

  if (data.thumbnail) {
    popupContent += `<img src="${data.thumbnail}" alt="${data.title}" class="rabbithole-thumbnail">`;
  }

  popupContent += `
      <p>${data.extract.substring(0, 200)}${data.extract.length > 200 ? '...' : ''}</p>
    </div>
  `;

  if (window.selectedSource === 'Dictionary') {
    popupContent += `<div class="rabbithole-footer"><a href="${data.url}" target="_blank">View on Dictionary.com</a></div>`;
  } else {
    popupContent += `<div class="rabbithole-footer"><a href="https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}" target="_blank">View on Wikipedia</a></div>`;
  }

  popup.innerHTML = popupContent;

  popup.querySelector('.rabbithole-close-btn').addEventListener('click', function() {
    popup.remove();
  });

  popup.querySelector('.rabbithole-expand-btn').addEventListener('click', function() {
    popup.remove();
    createExpandedModal(data, isTreeNode ? nodeId : null);
  });

  document.body.appendChild(popup);
}

function createExpandedModal(data, nodeId = null) {
  removeModals();
  if (nodeId === null) {
    nodeId = generateNodeId();
    wikiTree.push({
      id: nodeId,
      title: data.title,
      parentId: wikiTree.length > 0 ? wikiTree[wikiTree.length - 1].id : null
    });
  }

  const container = document.createElement('div');
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

  const treeContainer = document.createElement('div');
  treeContainer.className = 'rabbithole-tree-container';
  const treeTitle = document.createElement('h3');
  treeTitle.textContent = 'Your Rabbit Hole Journey';
  treeContainer.appendChild(treeTitle);

  const treeVisualization = document.createElement('div');
  treeVisualization.className = 'rabbithole-tree';
  treeVisualization.innerHTML = generateTreeHTML();
  treeContainer.appendChild(treeVisualization);

  const modal = document.createElement('div');
  modal.className = 'rabbithole-modal';
  let modalContent = `
    <div class="rabbithole-modal-header">
      <h2>${data.title}</h2>
      <button class="rabbithole-modal-close-btn">×</button>
    </div>
    <div class="rabbithole-modal-body">
  `;

  if (data.thumbnail) {
    modalContent += `<img src="${data.thumbnail}" alt="${data.title}" class="rabbithole-modal-thumbnail">`;
  }

  modalContent += `<p>${data.extract}</p>`;
  modalContent += `<div class="rabbithole-footer"><a href="${window.selectedSource === 'Dictionary' ? data.url : `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`}" target="_blank">View on ${window.selectedSource === 'Dictionary' ? 'Dictionary.com' : 'Wikipedia'}</a></div>`;
  modal.innerHTML = modalContent;

  container.appendChild(treeContainer);
  container.appendChild(modal);

  container.querySelector('.rabbithole-modal-close-btn').addEventListener('click', function() {
    container.remove();
  });

  document.body.appendChild(container);
}
