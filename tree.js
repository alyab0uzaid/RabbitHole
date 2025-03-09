// RabbitHole Tree Module with GoJS Integration
console.log("RabbitHole Tree Module loading");

// Tree data storage
let wikiTree = [];
let activeNodeId = null;

// Check if GoJS is available without causing errors
let isGoAvailable = false;
try {
  isGoAvailable = typeof go !== 'undefined';
} catch (e) {
  console.log("GoJS not accessible yet, will check again when needed");
}
console.log("GoJS available on initial check:", isGoAvailable);

// Initialize the diagram
let myDiagram = null;

/**
 * Adds a node to the tree
 * @param {string} title - Title of the node
 * @param {number|null} parentId - ID of the parent node, or null for root
 * @returns {number} The ID of the newly created node
 */
function addTreeNode(title, parentId = null) {
  const nodeId = generateNodeId();
  
  // Create the node object
  const node = {
    id: nodeId,
    title: title,
    parentId: parentId
  };
  
  // Add to the tree array
  wikiTree.push(node);
  
  console.log(`Added tree node: ${title} (ID: ${nodeId}, Parent: ${parentId})`);
  return nodeId;
}

/**
 * Generates a unique ID for a new tree node
 * @returns {number} A unique node ID
 */
function generateNodeId() {
  // Use timestamp + random number for unique ID
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Sets the active node in the tree
 * @param {number} nodeId - ID of the node to set as active
 */
function setActiveNode(nodeId) {
  activeNodeId = nodeId;
  sessionStorage.setItem('rabbitHoleActiveNode', nodeId);
  console.log("Set active node to:", nodeId);
  
  // Update diagram if it exists
  if (myDiagram) {
    try {
      const node = myDiagram.findNodeForKey(nodeId);
      if (node) {
        myDiagram.model.commit(m => {
          m.set(node.data, "id", nodeId);
        });
      }
    } catch (e) {
      console.error("Error updating diagram for active node:", e);
    }
  }
}

/**
 * Gets the active node ID from session storage
 * @returns {number|null} The active node ID or null if not set
 */
function getActiveNodeId() {
  if (activeNodeId !== null) return activeNodeId;
  
  const storedId = sessionStorage.getItem('rabbitHoleActiveNode');
  return storedId ? parseInt(storedId) : null;
}

/**
 * Gets a node by its ID
 * @param {number} nodeId - The ID of the node to find
 * @returns {Object|null} The node object or null if not found
 */
function getNodeById(nodeId) {
  return wikiTree.find(node => node.id === parseInt(nodeId)) || null;
}

/**
 * Clears the tree data
 */
function clearTree() {
  wikiTree = [];
  activeNodeId = null;
  sessionStorage.removeItem('rabbitHoleActiveNode');
  console.log("Tree data cleared");
}

/**
 * Gets all tree data
 * @returns {Array} The entire tree data array
 */
function getTreeData() {
  return wikiTree;
}

/**
 * Generates HTML for the tree visualization
 * @returns {string} HTML representation of the tree
 */
function generateTreeHTML() {
  console.log("Generating tree HTML with GoJS");
  
  // Create a container for the tree diagram
  const html = `
    <div style="width: 100%; height: 300px; border: 1px solid #ddd; background: white;">
      <div id="tree-diagram" style="width: 100%; height: 100%;"></div>
    </div>
  `;
  
  return html;
}

/**
 * Sets up click handlers for tree nodes
 * @param {Element} container - The container element with tree nodes
 * @param {Function} onNodeClick - Callback function when a node is clicked
 */
function setupTreeNodeHandlers(container, onNodeClick) {
  console.log("Setting up tree node click handlers");
  
  // Store the callback for handling node clicks
  window.treeNodeClickCallback = onNodeClick;
  
  // Initialize the tree diagram right away
  setTimeout(() => {
    initTreeDiagram('tree-diagram');
  }, 100);
}

/**
 * Initialize the GoJS tree diagram
 * @param {string} containerId - ID of the HTML container
 */
function initTreeDiagram(containerId) {
  // Check if go is available (double check to be safe)
  let goAvailable = false;
  try {
    goAvailable = typeof go !== 'undefined';
  } catch (e) {
    console.log("GoJS not available for diagram");
  }
  
  if (!goAvailable) {
    console.log("GoJS library not available for tree diagram, using fallback");
    renderFallbackTree(containerId);
    return;
  }
  
  // Get the container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Tree diagram container not found:", containerId);
    return;
  }
  
  console.log("Initializing GoJS tree diagram");
  
  try {
    // Initialize the diagram
    myDiagram = new go.Diagram(containerId, {
      "undoManager.isEnabled": false,
      layout: new go.TreeLayout({
        angle: 90,
        layerSpacing: 30,
        nodeSpacing: 20
      })
    });
    
    // Define the node template
    myDiagram.nodeTemplate =
      new go.Node("Auto")
        .bind(new go.Binding("layerName", "isSelected", function(sel) { return sel ? "Foreground" : ""; }).ofObject())
        .add(
          new go.Shape("RoundedRectangle", {
            fill: "white",
            stroke: "#CCCCCC",
            strokeWidth: 1,
            spot1: new go.Spot(0, 0, 5, 5),
            spot2: new go.Spot(1, 1, -5, -5)
          })
          .bind("fill", "id", function(id) { return id === getActiveNodeId() ? "#e8f0fe" : "white" })
          .bind("stroke", "id", function(id) { return id === getActiveNodeId() ? "#4285f4" : "#CCCCCC" })
        )
        .add(
          new go.TextBlock({
            margin: 8,
            font: "12px sans-serif",
            wrap: go.TextBlock.WrapFit,
            editable: false
          })
          .bind("text", "title")
        );
    
    // Define the link template
    myDiagram.linkTemplate =
      new go.Link({
        routing: go.Link.Orthogonal,
        corner: 5
      })
      .add(new go.Shape({ strokeWidth: 1, stroke: "#CCCCCC" }))
      .add(new go.Shape({ toArrow: "Standard", stroke: null, fill: "#CCCCCC" }));
    
    // Create the model data
    const nodeDataArray = [];
    const linkDataArray = [];
    
    wikiTree.forEach(node => {
      // Add node data
      nodeDataArray.push({
        key: node.id,
        title: node.title,
        id: node.id
      });
      
      // Add link data if there's a parent
      if (node.parentId !== null) {
        linkDataArray.push({
          from: node.parentId,
          to: node.id
        });
      }
    });
    
    // Create the model
    myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    
    // Handle node clicks
    myDiagram.addDiagramListener("ObjectSingleClicked", function(e) {
      const part = e.subject.part;
      if (part instanceof go.Node) {
        const nodeId = part.data.key;
        console.log("Node clicked:", nodeId);
        
        // Set as active node
        setActiveNode(nodeId);
        
        // Call the click callback if defined
        const node = getNodeById(nodeId);
        if (node && typeof window.treeNodeClickCallback === 'function') {
          window.treeNodeClickCallback(node, nodeId);
        }
      }
    });
    
    console.log("GoJS diagram initialized successfully");
    
  } catch (error) {
    console.error("Error initializing GoJS diagram:", error);
    renderFallbackTree(containerId);
  }
}

/**
 * Render a fallback tree when GoJS is not available
 * @param {string} containerId - ID of the HTML container
 */
function renderFallbackTree(containerId) {
  console.log("Rendering fallback tree visualization");
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (wikiTree.length === 0) {
    container.innerHTML = '<p style="padding: 20px; text-align: center;">Your journey starts here. Explore related topics to build your tree!</p>';
    return;
  }
  
  // Create a simple tree using HTML
  const treeContainer = document.createElement('div');
  treeContainer.style.padding = '10px';
  treeContainer.style.overflowY = 'auto';
  treeContainer.style.height = '100%';
  
  // Group nodes by parent
  const nodesByParent = {};
  wikiTree.forEach(node => {
    const parentId = node.parentId === null ? 'root' : node.parentId;
    if (!nodesByParent[parentId]) {
      nodesByParent[parentId] = [];
    }
    nodesByParent[parentId].push(node);
  });
  
  // Render the root level
  const rootNodes = nodesByParent['root'] || [];
  if (rootNodes.length > 0) {
    const rootLevel = document.createElement('div');
    rootLevel.style.display = 'flex';
    rootLevel.style.flexDirection = 'column';
    rootLevel.style.gap = '10px';
    
    rootNodes.forEach(node => {
      const nodeElement = createNodeElement(node);
      rootLevel.appendChild(nodeElement);
      
      // Recursively add children
      appendChildren(node.id, nodeElement, nodesByParent);
    });
    
    treeContainer.appendChild(rootLevel);
  }
  
  container.appendChild(treeContainer);
}

/**
 * Create a node element for the fallback tree
 * @param {Object} node - The node data
 * @returns {Element} The created DOM element
 */
function createNodeElement(node) {
  const element = document.createElement('div');
  element.textContent = node.title;
  element.dataset.nodeId = node.id;
  element.style.padding = '8px 12px';
  element.style.border = '1px solid #ddd';
  element.style.borderRadius = '4px';
  element.style.backgroundColor = node.id === getActiveNodeId() ? '#e8f0fe' : '#f8f9fa';
  element.style.borderColor = node.id === getActiveNodeId() ? '#4285f4' : '#ddd';
  element.style.cursor = 'pointer';
  element.style.marginBottom = '5px';
  
  // Add click handler
  element.addEventListener('click', function(e) {
    e.stopPropagation();
    
    // Set as active node
    setActiveNode(node.id);
    
    // Update all node styles
    document.querySelectorAll('[data-node-id]').forEach(el => {
      el.style.backgroundColor = '#f8f9fa';
      el.style.borderColor = '#ddd';
    });
    
    // Update this node style
    element.style.backgroundColor = '#e8f0fe';
    element.style.borderColor = '#4285f4';
    
    // Call the click callback if defined
    if (typeof window.treeNodeClickCallback === 'function') {
      window.treeNodeClickCallback(node, node.id);
    }
  });
  
  return element;
}

/**
 * Append children to a parent node element
 * @param {number} parentId - ID of the parent node
 * @param {Element} parentElement - Parent DOM element
 * @param {Object} nodesByParent - Nodes grouped by parent ID
 */
function appendChildren(parentId, parentElement, nodesByParent) {
  const children = nodesByParent[parentId] || [];
  if (children.length === 0) return;
  
  const childrenContainer = document.createElement('div');
  childrenContainer.style.paddingLeft = '20px';
  childrenContainer.style.marginTop = '5px';
  
  children.forEach(child => {
    const childElement = createNodeElement(child);
    childrenContainer.appendChild(childElement);
    
    // Recursively add children
    appendChildren(child.id, childElement, nodesByParent);
  });
  
  parentElement.appendChild(childrenContainer);
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
  clearTree,
  getTreeData,
  initTreeDiagram
}; 