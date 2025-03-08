// RabbitHole Tree Visualization Module

// Global tree structure data
let wikiTree = [];

/**
 * Adds a node to the tree
 * @param {string} title - Title of the node
 * @param {number|null} parentId - ID of the parent node, or null for root
 * @returns {number} The ID of the newly created node
 */
function addTreeNode(title, parentId = null) {
  const nodeId = generateNodeId();
  
  // We're creating a flat tree, so just add nodes in order
  wikiTree.push({
    id: nodeId,
    title: title,
    parentId: parentId
  });
  
  console.log(`Added tree node: ${title} (ID: ${nodeId}, Parent: ${parentId})`);
  return nodeId;
}

/**
 * Generates a unique ID for a new tree node
 * @returns {number} A unique node ID
 */
function generateNodeId() {
  // Find the max ID and increment by 1
  const maxId = wikiTree.length > 0 
    ? Math.max(...wikiTree.map(node => node.id)) 
    : 0;
  return maxId + 1;
}

/**
 * Sets the active node in the tree
 * @param {number} nodeId - ID of the node to set as active
 */
function setActiveNode(nodeId) {
  sessionStorage.setItem('rabbitHoleActiveNode', nodeId);
  console.log("Set active node to:", nodeId);
}

/**
 * Gets the active node ID from session storage
 * @returns {number|null} The active node ID or null if not set
 */
function getActiveNodeId() {
  const activeNodeId = sessionStorage.getItem('rabbitHoleActiveNode');
  return activeNodeId ? parseInt(activeNodeId) : null;
}

/**
 * Gets a node by its ID
 * @param {number} nodeId - The ID of the node to find
 * @returns {Object|null} The node object or null if not found
 */
function getNodeById(nodeId) {
  return wikiTree.find(node => node.id === nodeId);
}

/**
 * Generates HTML for the tree visualization
 * @returns {string} HTML representation of the tree
 */
function generateTreeHTML() {
  if (wikiTree.length === 0) {
    return '<p class="empty-tree-message">Your journey starts here. Explore related topics to build your tree!</p>';
  }
  
  console.log("Generating tree with", wikiTree.length, "nodes");
  
  // Get the active node ID for highlighting
  const activeNodeId = getActiveNodeId();
  
  // Start the horizontal tree
  let html = '<div class="horizontal-tree">';
  
  // Add all nodes in a simple horizontal layout
  wikiTree.forEach((node, index) => {
    const isActiveNode = node.id === activeNodeId;
    
    // Add arrow between nodes
    if (index > 0) {
      html += '<div class="tree-arrow">→</div>';
    }
    
    // Add the node
    html += `
      <div class="tree-node ${isActiveNode ? 'active-node' : ''}" data-node-id="${node.id}">
        <div class="node-content">
          <span class="node-title">${node.title}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

/**
 * Sets up click handlers for tree nodes
 * @param {Element} container - The container element with tree nodes
 * @param {Function} onNodeClick - Callback function when a node is clicked
 */
function setupTreeNodeHandlers(container, onNodeClick) {
  console.log("Setting up tree node click handlers");
  const treeNodes = container.querySelectorAll('.tree-node');
  console.log("Found tree nodes:", treeNodes.length);
  
  treeNodes.forEach(node => {
    node.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const nodeId = parseInt(this.dataset.nodeId);
      const nodeInfo = getNodeById(nodeId);
      
      console.log("Tree node clicked:", nodeInfo?.title);
      
      if (nodeInfo) {
        // Set this as the active node when clicked
        setActiveNode(nodeId);
        
        // Update active node in the UI
        container.querySelectorAll('.tree-node').forEach(n => {
          n.classList.remove('active-node');
        });
        this.classList.add('active-node');
        
        // Call the provided callback with the node info
        if (typeof onNodeClick === 'function') {
          onNodeClick(nodeInfo, nodeId);
        }
      }
    });
  });
}

/**
 * Clears the tree data
 */
function clearTree() {
  wikiTree = [];
  sessionStorage.removeItem('rabbitHoleActiveNode');
  console.log("Tree data cleared");
}

// Export the tree functions
export {
  wikiTree,
  addTreeNode,
  generateNodeId,
  setActiveNode,
  getActiveNodeId,
  getNodeById,
  generateTreeHTML,
  setupTreeNodeHandlers,
  clearTree
}; 