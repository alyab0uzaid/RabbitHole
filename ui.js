// RabbitHole UI Components

import { fetchWikipediaData, fetchFullArticle } from './utils.js';

// Global variables shared between UI components
let wikiTree = [];

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
  
  // Create the content - no expand button
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

// Function to remove popups with animation
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
  
  // Fetch the full article and process it
  processArticleContent(data.title, container.querySelector('.rabbithole-article-content'));
  
  return container;
}

// Function to process the article content
async function processArticleContent(title, container) {
  const html = await fetchFullArticle(title, container);
  
  if (!html) return;
  
  // Create a temporary element to parse the HTML
  const tempElement = document.createElement('div');
  tempElement.innerHTML = html;
  
  // Process images, links, styling, etc.
  // ... (implementation details)
  
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

// Function to remove modals
function removeModals() {
  const containers = document.querySelectorAll('.rabbithole-container');
  containers.forEach(container => container.remove());
}

// Function to generate the tree HTML
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

// Process links in the article content
function processWikiLinks(element) {
  // Implementation for processing Wiki links
  // ...
}

// Helper function to generate a node ID 
function generateNodeId() {
  window.currentNodeId = window.currentNodeId || 0;
  return window.currentNodeId++;
}

// Export the UI functions
export { 
  createPopup, 
  removePopups, 
  createExpandedModal, 
  removeModals, 
  processWikiLinks, 
  processArticleContent,
  wikiTree
}; 