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
  
  // Create the content - remove the expand button
  let popupContent = `
    <div class="rabbithole-header">
      <h3>${data.title}</h3>
      <button class="rabbithole-close-btn">×</button>
    </div>
    <div class="rabbithole-content">
  `;
  
  // Add thumbnail if available
  if (data.thumbnail) {
    popupContent += `<img src="${data.thumbnail}" alt="${data.title}" class="rabbithole-thumbnail">`;
  }
  
  // Add extract
  popupContent += `
      <p>${data.extract.substring(0, 200)}${data.extract.length > 200 ? '...' : ''}</p>
    </div>
  `;
  
  popup.innerHTML = popupContent;
  
  // Add event listeners
  popup.querySelector('.rabbithole-close-btn').addEventListener('click', function(e) {
    e.stopPropagation(); // Prevent event from bubbling to header
    popup.remove();
  });
  
  // Make the header clickable to expand
  popup.querySelector('.rabbithole-header').addEventListener('click', function() {
    // Remove the popup
    popup.remove();
    
    // Create the expanded modal
    createExpandedModal(data, isTreeNode ? nodeId : null);
  });
  
  // Make the entire popup clickable to expand (optional - uncomment if you want the whole popup to be clickable)
  /*
  popup.addEventListener('click', function() {
    // Remove the popup
    popup.remove();
    
    // Create the expanded modal
    createExpandedModal(data, isTreeNode ? nodeId : null);
  });
  */
  
  // Add mouseenter/mouseleave events to the popup itself
  popup.addEventListener('mouseenter', function() {
    // Keep the popup visible when mouse is over it
    this.dataset.isHovered = 'true';
  });
  
  popup.addEventListener('mouseleave', function() {
    // Remove popup when mouse leaves
    this.dataset.isHovered = 'false';
    removePopups();
  });
  
  // Add to the DOM
  document.body.appendChild(popup);
  
  return popup;
}

// Function to remove all popups
function removePopups() {
  // Get all popups
  const popups = document.querySelectorAll('.rabbithole-popup');
  
  popups.forEach(popup => {
    // Only remove the popup if it's not being hovered
    if (popup.dataset.isHovered !== 'true') {
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
      
      // Fix image URLs and handling
      const images = tempElement.querySelectorAll('img');
      const processedSrcs = new Set(); // Track processed image sources to avoid duplicates
      
      images.forEach(img => {
        // Fix the src attribute for images
        if (img.src) {
          // Convert relative URLs to absolute
          if (img.src.startsWith('/')) {
            img.src = 'https://en.wikipedia.org' + img.src;
          } else if (img.src.startsWith('//')) {
            img.src = 'https:' + img.src;
          }
          
          // Check if this is a duplicate image (same source)
          if (processedSrcs.has(img.src)) {
            // Remove duplicate image
            if (img.parentNode) {
              img.parentNode.removeChild(img);
            }
            return;
          }
          
          // Add to processed sources
          processedSrcs.add(img.src);
          
          // Add loading="lazy" attribute
          img.setAttribute('loading', 'lazy');
          
          // Add a nice transition effect
          img.style.transition = 'opacity 0.3s ease';
          img.style.opacity = '0';
          img.onload = function() {
            this.style.opacity = '1';
          };
          
          // Make the image open in a new tab when clicked
          img.style.cursor = 'pointer';
          img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Open the image in a new tab
            if (this.src) {
              window.open(this.src, '_blank');
            }
          });
        }
        
        // Handle srcset attribute as well
        if (img.hasAttribute('srcset')) {
          const srcset = img.getAttribute('srcset');
          const newSrcset = srcset.split(',').map(src => {
            const parts = src.trim().split(' ');
            if (parts[0].startsWith('/')) {
              return 'https://en.wikipedia.org' + parts[0] + ' ' + parts[1];
            } else if (parts[0].startsWith('//')) {
              return 'https:' + parts[0] + ' ' + parts[1];
            }
            return src;
          }).join(', ');
          
          img.setAttribute('srcset', newSrcset);
        }
      });
      
      // Remove redundant image containers
      const thumbs = tempElement.querySelectorAll('.thumb');
      thumbs.forEach(thumb => {
        // Check if this thumb contains multiple identical images
        const thumbImages = thumb.querySelectorAll('img');
        if (thumbImages.length > 1) {
          // Keep only the first image
          for (let i = 1; i < thumbImages.length; i++) {
            if (thumbImages[i].parentNode) {
              thumbImages[i].parentNode.removeChild(thumbImages[i]);
            }
          }
        }
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
      const originalInfoboxes = tempElement.querySelectorAll('.infobox');
      originalInfoboxes.forEach(infobox => {
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
      
      // Add modern styling to the overall article
      tempElement.style.fontSize = '15px';
      tempElement.style.lineHeight = '1.8';
      tempElement.style.color = '#2d3748';
      
      // Fix overall article layout
      const articleElements = tempElement.querySelectorAll('div, section, article');
      articleElements.forEach(element => {
        if (element.id === 'bodyContent' || element.className.includes('mw-parser-output')) {
          element.style.maxWidth = '100%';
          element.style.width = '100%';
        }
      });
      
      // Enhance all images for a more modern look
      const allImages = container.querySelectorAll('img');
      allImages.forEach(img => {
        img.style.borderRadius = '8px';
        img.style.maxWidth = '100%';
        
        // Only if it's not in a figure/thumb already
        if (!img.closest('.thumb') && !img.closest('figure')) {
          img.style.display = 'block';
          img.style.margin = '1.5em auto';
          img.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
        }
      });
      
      // Style infoboxes (usually on the right in Wikipedia)
      const infoboxes = container.querySelectorAll('.infobox, .infotable');
      infoboxes.forEach(box => {
        box.style.border = '1px solid #e2e8f0';
        box.style.borderRadius = '12px';
        box.style.overflow = 'hidden';
        box.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        box.style.margin = '0 0 20px 20px';
        box.style.float = 'right';
        box.style.maxWidth = '320px';
        box.style.fontSize = '14px';
        box.style.lineHeight = '1.6';
        
        // Style infobox headers
        const headers = box.querySelectorAll('th');
        headers.forEach(header => {
          header.style.backgroundColor = '#3a5ccc';
          header.style.color = 'white';
          header.style.padding = '10px';
        });
        
        // Style infobox data cells
        const cells = box.querySelectorAll('td');
        cells.forEach(cell => {
          cell.style.padding = '8px 10px';
        });
        
        // Style infobox rows
        const rows = box.querySelectorAll('tr');
        rows.forEach((row, index) => {
          if (index % 2 === 0) {
            row.style.backgroundColor = '#f7fafc';
          }
        });
      });
      
      // Enhance blockquotes
      const blockquotes = container.querySelectorAll('blockquote');
      blockquotes.forEach(quote => {
        quote.style.borderLeft = '4px solid #3a5ccc';
        quote.style.padding = '12px 20px';
        quote.style.margin = '20px 0';
        quote.style.backgroundColor = '#eef1fc';
        quote.style.borderRadius = '0 8px 8px 0';
        quote.style.fontStyle = 'italic';
      });
      
      // Style definition lists
      const definitionLists = container.querySelectorAll('dl');
      definitionLists.forEach(list => {
        list.style.margin = '20px 0';
        list.style.padding = '15px';
        list.style.backgroundColor = '#f7fafc';
        list.style.borderRadius = '8px';
        list.style.border = '1px solid #e2e8f0';
        
        const terms = list.querySelectorAll('dt');
        terms.forEach(term => {
          term.style.fontWeight = 'bold';
          term.style.color = '#3a5ccc';
          term.style.marginBottom = '6px';
        });
        
        const definitions = list.querySelectorAll('dd');
        definitions.forEach(def => {
          def.style.marginBottom = '12px';
          def.style.marginLeft = '20px';
        });
      });
      
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
      
      // Fix image containers (figures and thumbnails) with modern styling
      const figures = tempElement.querySelectorAll('.thumb, figure');
      figures.forEach(figure => {
        figure.style.maxWidth = '400px';
        figure.style.margin = '1.5em auto';
        figure.style.textAlign = 'center';
        figure.style.backgroundColor = '#f9fafb';
        figure.style.padding = '12px';
        figure.style.borderRadius = '12px';
        figure.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        figure.style.transition = 'box-shadow 0.3s ease';
        
        // Add hover effect
        figure.addEventListener('mouseenter', function() {
          this.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.12)';
        });
        
        figure.addEventListener('mouseleave', function() {
          this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        });
        
        // Fix captions
        const captions = figure.querySelectorAll('.thumbcaption, figcaption');
        captions.forEach(caption => {
          caption.style.fontSize = '13px';
          caption.style.color = '#4a5568';
          caption.style.padding = '8px 5px 0';
          caption.style.marginTop = '8px';
          caption.style.borderTop = '1px solid #edf2f7';
          caption.style.fontStyle = 'italic';
        });
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
        try {
          // Store the original href for reference
          const originalHref = link.getAttribute('href');
          
          if (!originalHref) return;
          
          // Handle different types of links
          
          // 1. Regular Wikipedia article links
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
            
            // Add styling
            link.classList.add('rabbithole-wiki-internal-link');
            
            // Remove any existing click handlers
            const newLink = link.cloneNode(true);
            if (link.parentNode) {
              link.parentNode.replaceChild(newLink, link);
              link = newLink;
            }
            
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
                console.log("Wiki link clicked, fetching data for:", title);
                const data = await fetchWikipediaData(title);
                // Restore original text
                this.innerHTML = originalText;
                
                if (data) {
                  console.log("Wiki link data retrieved, opening modal");
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
                    createPopup(data, position, false, null, this);
                  }
                } catch (error) {
                  console.error("Error showing hover preview:", error);
                }
              }, 300);
            });
            
            // Add explicit mouseleave event to remove popup and clear timeout
            link.addEventListener('mouseleave', function() {
              if (this.hoverTimeout) {
                clearTimeout(this.hoverTimeout);
                this.hoverTimeout = null;
              }
              removePopups();
            });
          } 
          // 2. Handle reference/citation links
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
          // 3. Handle external links (non-Wikipedia)
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
              link.classList.add('rabbithole-wiki-internal-link');
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
                  const data = await fetchWikipediaData(title);
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
            wrapper.style.color = 'blue';
            wrapper.style.textDecoration = 'underline';
            wrapper.style.cursor = 'pointer';
            
            // Replace the selected text with the wrapper span
            range.deleteContents();
            range.insertNode(wrapper);
            
            // Add hover event to show popup
            wrapper.addEventListener('mouseenter', function(e) {
              const rect = wrapper.getBoundingClientRect();
              const position = {
                x: rect.left + window.scrollX,
                y: rect.bottom + window.scrollY
              };
              
              createPopup(data, position, false, null, this); // Pass the wrapper element as the fifth parameter
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
