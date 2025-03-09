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
 * Renders the tree visualization in the provided container
 * @param {Element} container - The container element for the tree visualization
 */
function renderTree(container) {
  console.log("Rendering tree visualization");
  
  if (!container) {
    console.error("No container provided for tree visualization");
    return;
  }
  
  // Clear the container
  container.innerHTML = '';
  
  // Create the tree diagram container
  const treeContainer = document.createElement('div');
  treeContainer.className = 'tree-diagram-container';
  
  // Add node count and active node info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'tree-status-info';
  const activeNodeTitle = activeNodeId ? (getNodeById(activeNodeId)?.title || activeNodeId) : 'None';
  infoDiv.textContent = `Tree nodes: ${wikiTree.length} | Active: ${activeNodeTitle}`;
  
  // Create a unique ID for the tree diagram
  const uniqueId = 'tree-diagram-' + Date.now();
  const diagramContainer = document.createElement('div');
  diagramContainer.id = uniqueId;
  diagramContainer.className = 'tree-diagram';
  
  // Add the elements to the container
  treeContainer.appendChild(infoDiv);
  treeContainer.appendChild(diagramContainer);
  container.appendChild(treeContainer);
  
  // Initialize the tree diagram
  setTimeout(() => {
    initTreeDiagram(uniqueId);
  }, 100);
}

/**
 * Generates HTML for the tree visualization
 * @returns {string} HTML representation of the tree
 */
function generateTreeHTML() {
  console.log("Generating tree HTML with GoJS");
  
  const nodeCount = wikiTree.length;
  // Create a unique ID for the tree diagram container
  const uniqueId = 'tree-diagram-' + Date.now();
  
  // Create a container for the tree diagram with debug info
  const html = `
    <div class="tree-diagram-container">
      <div class="tree-status-info">
        Tree nodes: ${nodeCount} | Active: ${activeNodeId ? getNodeById(activeNodeId)?.title || activeNodeId : 'None'}
      </div>
      <div id="${uniqueId}" class="tree-diagram"></div>
    </div>
  `;
  
  console.log(`Tree HTML generated with ${nodeCount} nodes and active node ${activeNodeId || 'None'}`);
  
  // We need to call initTreeDiagram with the unique ID after the HTML is inserted into the DOM
  // Use setTimeout to ensure this happens after the HTML is in the DOM
  setTimeout(() => {
    initTreeDiagram(uniqueId);
  }, 200);
  
  return html;
}

/**
 * Sets up click handlers for tree nodes
 * @param {Element} container - The container element with tree nodes
 * @param {Function} onNodeClick - Callback function when a node is clicked
 */
function setupTreeNodeHandlers(container, onNodeClick) {
  console.log("Setting up tree node click handlers");
  
  // Store the callback for handling node clicks globally
  window.treeNodeClickCallback = onNodeClick;
  
  // For GoJS diagrams, the click handler is set directly in initTreeDiagram
  // This is just a safety measure in case the diagram wasn't initialized yet
  if (myDiagram) {
    console.log("GoJS diagram already initialized, click handlers should be working");
    return;
  }
  
  // For fallback tree, we need to add click handlers to all node elements
  const nodeElements = container.querySelectorAll('.tree-node');
  nodeElements.forEach(element => {
    element.addEventListener('click', function() {
      const nodeId = this.dataset.nodeId;
      const node = getNodeById(parseInt(nodeId));
      
      if (node) {
        console.log("Fallback tree node clicked:", node.title);
        
        // Set as active node
        setActiveNode(nodeId);
        
        // Update active node styling
        document.querySelectorAll('.tree-node').forEach(el => {
          el.classList.remove('active-node');
        });
        this.classList.add('active-node');
        
        // Call the click callback
        if (typeof window.treeNodeClickCallback === 'function') {
          window.treeNodeClickCallback(node, nodeId);
        } else {
          console.error("Tree node click callback not found");
        }
      }
    });
  });
}

/**
 * Initialize the tree diagram with GoJS
 * @param {string} containerId - ID of the HTML container
 */
function initTreeDiagram(containerId) {
  console.log("Initializing GoJS tree diagram in container:", containerId);
  
  try {
    // Check if GoJS is available
    if (typeof go === 'undefined') {
      console.warn("GoJS not available, using fallback tree");
      renderFallbackTree(containerId);
      return;
    }
    
    isGoAvailable = true;
    
    // Get the container element
    const container = document.getElementById(containerId);
    if (!container) {
      console.error("Container not found:", containerId);
      return;
    }
    
    // Create the diagram
    myDiagram = new go.Diagram(containerId, {
      "undoManager.isEnabled": true,
      layout: new go.TreeLayout({
        angle: 90,
        nodeSpacing: 20,
        layerSpacing: 40
      })
    });
    
    // Define the node template
    myDiagram.nodeTemplate =
      new go.Node("Auto")
        .add(
          new go.Shape("RoundedRectangle", {
            fill: "white",
            stroke: "#CCCCCC",
            strokeWidth: 1,
            className: "go-diagram-shape"
          })
            .bind("fill", "isActive", function(isActive) {
              return isActive ? "#e6f7ff" : "white";
            })
        )
        .add(
          new go.TextBlock({
            margin: 8,
            font: "12px sans-serif",
            wrap: go.TextBlock.WrapFit,
            editable: false,
            className: "go-diagram-text"
          })
            .bind("text", "title")
        );
    
    // Define the link template
    myDiagram.linkTemplate =
      new go.Link({
        routing: go.Link.Orthogonal,
        corner: 5,
        className: "go-diagram-link"
      })
        .add(
          new go.Shape({ stroke: "#CCCCCC", strokeWidth: 1.5 })
        );
    
    // Convert tree data to GoJS format
    const nodeDataArray = [];
    const linkDataArray = [];
    
    wikiTree.forEach(node => {
      nodeDataArray.push({
        key: node.id,
        title: node.title,
        isActive: node.id === activeNodeId
      });
      
      if (node.parentId !== null) {
        linkDataArray.push({
          from: node.parentId,
          to: node.id
        });
      }
    });
    
    // Set the model data
    myDiagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    
    // Add click handler for nodes
    myDiagram.addDiagramListener("ObjectSingleClicked", function(e) {
      const part = e.subject.part;
      if (part instanceof go.Node) {
        const nodeId = part.data.key;
        const node = getNodeById(nodeId);
        if (node) {
          console.log("GoJS node clicked:", node.title);
          
          // Set as active node
          setActiveNode(nodeId);
          
          // Update the diagram to show the active node
          myDiagram.startTransaction("update active");
          myDiagram.model.nodeDataArray.forEach(nodeData => {
            myDiagram.model.setDataProperty(nodeData, "isActive", nodeData.key === nodeId);
          });
          myDiagram.commitTransaction("update active");
          
          // Call the click handler if available
          if (typeof window.treeNodeClickCallback === 'function') {
            // Add a small delay to ensure the UI updates before loading content
            setTimeout(() => {
              window.treeNodeClickCallback(node, nodeId);
            }, 10);
          } else {
            console.error("Tree node click callback not found");
          }
        }
      }
    });
    
    // Hide the GoJS evaluation notice if present
    setTimeout(() => {
      const container = document.getElementById(containerId);
      if (container) {
        const parent = container.parentElement;
        if (parent) {
          const evaluationNotice = parent.querySelector('div:not([id])');
          if (evaluationNotice && evaluationNotice.textContent.includes('evaluation')) {
            evaluationNotice.style.display = 'none';
          }
        }
      }
    }, 500);
    
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
  treeContainer.className = 'fallback-tree-container';
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
    rootLevel.className = 'tree-level';
    rootLevel.style.display = 'flex';
    rootLevel.style.flexDirection = 'column';
    rootLevel.style.gap = '10px';
    
    rootNodes.forEach(node => {
      const nodeElement = createNodeElement(node);
      rootLevel.appendChild(nodeElement);
      
      // Add children recursively
      appendChildren(node.id, nodeElement, nodesByParent);
    });
    
    treeContainer.appendChild(rootLevel);
  }
  
  container.appendChild(treeContainer);
  
  // Add click handlers to all node elements
  const nodeElements = container.querySelectorAll('.tree-node');
  nodeElements.forEach(element => {
    element.addEventListener('click', function() {
      const nodeId = this.dataset.nodeId;
      const node = getNodeById(parseInt(nodeId));
      
      if (node) {
        // Set as active node
        setActiveNode(nodeId);
        
        // Update active node styling
        document.querySelectorAll('.tree-node').forEach(el => {
          el.classList.remove('active-node');
        });
        this.classList.add('active-node');
        
        // Call the click callback if defined
        if (typeof window.treeNodeClickCallback === 'function') {
          window.treeNodeClickCallback(node, nodeId);
        }
      }
    });
  });
}

/**
 * Creates a node element for the tree
 * @param {Object} node - The node data
 * @returns {Element} The created node element
 */
function createNodeElement(node) {
  const element = document.createElement('div');
  element.className = 'tree-node';
  element.dataset.nodeId = node.id;
  
  // Add active class if this is the active node
  if (node.id === activeNodeId) {
    element.classList.add('active-node');
  }
  
  const title = document.createElement('span');
  title.textContent = node.title;
  title.className = 'node-title';
  element.appendChild(title);
  
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
  childrenContainer.className = 'children-container';
  
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
  initTreeDiagram,
  renderTree
};