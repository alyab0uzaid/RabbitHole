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
 * Saves the current tree with a given name
 * @param {string} treeName - Name to save the tree under
 * @returns {Promise<boolean>} Success status
 */
async function saveTree(treeName) {
  if (!wikiTree || wikiTree.length === 0) {
    console.warn("No tree data to save");
    return false;
  }
  
  try {
    // Generate a unique ID for this saved tree
    const treeId = 'tree_' + Date.now();
    
    // Get the root node title for metadata
    const rootNode = wikiTree.find(node => node.parentId === null) || wikiTree[0];
    const rootTitle = rootNode ? rootNode.title : 'Unnamed Root';
    
    // Create tree data object with metadata
    const treeData = {
      id: treeId,
      name: treeName || rootTitle,
      rootTitle: rootTitle,
      nodeCount: wikiTree.length,
      dateCreated: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      nodes: JSON.parse(JSON.stringify(wikiTree)) // Deep copy to avoid reference issues
    };
    
    // First get existing saved trees
    const savedTreesData = await new Promise(resolve => {
      chrome.storage.sync.get(['savedTrees'], result => {
        resolve(result.savedTrees || {});
      });
    });
    
    // Add this tree to the saved trees
    savedTreesData[treeId] = treeData;
    
    // Save updated list back to storage
    await new Promise(resolve => {
      chrome.storage.sync.set({ 'savedTrees': savedTreesData }, resolve);
    });
    
    console.log(`Tree saved successfully as "${treeName}"`);
    return true;
  } catch (error) {
    console.error("Error saving tree:", error);
    return false;
  }
}

/**
 * Loads a saved tree
 * @param {string} treeId - ID of the tree to load
 * @returns {Promise<boolean>} Success status
 */
async function loadTree(treeId) {
  try {
    // Get saved trees
    const savedTreesData = await new Promise(resolve => {
      chrome.storage.sync.get(['savedTrees'], result => {
        resolve(result.savedTrees || {});
      });
    });
    
    // Check if the requested tree exists
    if (!savedTreesData[treeId]) {
      console.warn(`Tree with ID ${treeId} not found`);
      return false;
    }
    
    // Replace current tree with saved tree
    wikiTree = JSON.parse(JSON.stringify(savedTreesData[treeId].nodes));
    
    // Set active node to root
    const rootNode = wikiTree.find(node => node.parentId === null) || wikiTree[0];
    if (rootNode) {
      activeNodeId = rootNode.id;
    }
    
    console.log(`Tree "${savedTreesData[treeId].name}" loaded successfully`);
    
    // Update last accessed time
    savedTreesData[treeId].lastAccessed = new Date().toISOString();
    await new Promise(resolve => {
      chrome.storage.sync.set({ 'savedTrees': savedTreesData }, resolve);
    });
    
    return true;
  } catch (error) {
    console.error("Error loading tree:", error);
    return false;
  }
}

/**
 * Gets all saved trees
 * @returns {Promise<Object>} Object containing all saved trees
 */
async function getSavedTrees() {
  return new Promise(resolve => {
    chrome.storage.sync.get(['savedTrees'], result => {
      resolve(result.savedTrees || {});
    });
  });
}

/**
 * Deletes a saved tree
 * @param {string} treeId - ID of the tree to delete
 * @returns {Promise<boolean>} Success status
 */
async function deleteSavedTree(treeId) {
  try {
    // Get saved trees
    const savedTreesData = await getSavedTrees();
    
    // Check if the tree exists
    if (!savedTreesData[treeId]) {
      console.warn(`Tree with ID ${treeId} not found`);
      return false;
    }
    
    // Delete the tree
    delete savedTreesData[treeId];
    
    // Save updated list back to storage
    await new Promise(resolve => {
      chrome.storage.sync.set({ 'savedTrees': savedTreesData }, resolve);
    });
    
    console.log(`Tree with ID ${treeId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting tree:", error);
    return false;
  }
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
 * @param {number|string} nodeId - The ID of the node to find
 * @returns {Object|null} The node object or null if not found
 */
function getNodeById(nodeId) {
  if (!nodeId) return null;
  
  try {
    // Convert to number if it's a string
    const id = typeof nodeId === 'string' ? parseInt(nodeId, 10) : nodeId;
    
    // Handle NaN
    if (isNaN(id)) {
      console.warn("Invalid node ID:", nodeId);
      return null;
    }
    
    return wikiTree.find(node => node.id === id) || null;
  } catch (e) {
    console.error("Error in getNodeById:", e);
    return null;
  }
}

/**
 * Clears the tree data
 */
function clearTree() {
  wikiTree = [];
  activeNodeId = null;
  
  // Clear data from sessionStorage
  sessionStorage.removeItem('rabbitHoleActiveNode');
  
  // Clear data from localStorage if used
  try {
    localStorage.removeItem('rabbitHoleTreeData');
    localStorage.removeItem('rabbitHoleActiveNode');
    localStorage.removeItem('rabbitHoleSavedTrees');
  } catch (e) {
    console.error("Error clearing localStorage:", e);
  }
  
  // Reset the diagram if it exists
  if (myDiagram) {
    myDiagram.model = new go.GraphLinksModel([], []);
  }
  
  console.log("Tree data cleared completely");
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
  try {
    console.log("Setting up tree node click handlers");
    
    // Check if container exists
    if (!container) {
      console.error("Cannot set up tree node handlers: container is null");
      return;
    }
    
    // Store the callback for handling node clicks globally
    if (typeof onNodeClick === 'function') {
      window.treeNodeClickCallback = onNodeClick;
    } else {
      console.error("Invalid click handler provided");
      return;
    }
    
    // For GoJS diagrams, the click handler is set directly in initTreeDiagram
    if (myDiagram) {
      console.log("GoJS diagram already initialized, click handlers should be working");
      return;
    }
    
    // For fallback tree, we need to add click handlers to all node elements
    try {
      const nodeElements = container.querySelectorAll('.tree-node');
      if (!nodeElements || nodeElements.length === 0) {
        console.log("No tree nodes found to attach handlers to");
        return;
      }
      
      nodeElements.forEach(element => {
        try {
          if (element) {
            element.addEventListener('click', function(e) {
              try {
                e.preventDefault();
                e.stopPropagation();
                
                const nodeId = this.dataset.nodeId;
                if (!nodeId) {
                  console.error("Node element missing nodeId data attribute");
                  return;
                }
                
                const node = getNodeById(nodeId);
                if (!node) {
                  console.error("Could not find node with ID:", nodeId);
                  return;
                }
                
                console.log("Fallback tree node clicked:", node.title);
                
                // Set as active node
                setActiveNode(nodeId);
                
                // Update active node styling
                try {
                  document.querySelectorAll('.tree-node').forEach(el => {
                    if (el) el.classList.remove('active-node');
                  });
                  this.classList.add('active-node');
                } catch (styleError) {
                  console.error("Error updating node styles:", styleError);
                }
                
                // Call the click callback
                if (typeof window.treeNodeClickCallback === 'function') {
                  window.treeNodeClickCallback(node, nodeId);
                } else {
                  console.error("Tree node click callback not found");
                }
              } catch (clickError) {
                console.error("Error in node click handler:", clickError);
              }
            });
          }
        } catch (elementError) {
          console.error("Error adding click handler to node element:", elementError);
        }
      });
    } catch (queryError) {
      console.error("Error querying for tree nodes:", queryError);
    }
  } catch (setupError) {
    console.error("Error in setupTreeNodeHandlers:", setupError);
  }
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
      try {
        if (!e || !e.subject || !e.subject.part) return;
        
        const part = e.subject.part;
        if (!(part instanceof go.Node)) return;
        
        const nodeId = part.data ? part.data.key : null;
        if (!nodeId) {
          console.error("Node missing key/id in GoJS diagram");
          return;
        }
        
        const node = getNodeById(nodeId);
        if (!node) {
          console.error("Could not find node with ID:", nodeId, "in tree data");
          return;
        }
        
        console.log("GoJS node clicked:", node.title, "ID:", nodeId);
        
        // Set as active node
        setActiveNode(nodeId);
        
        // Update the diagram to show the active node
        try {
          myDiagram.startTransaction("update active");
          myDiagram.model.nodeDataArray.forEach(nodeData => {
            if (nodeData) {
              myDiagram.model.setDataProperty(nodeData, "isActive", nodeData.key === nodeId);
            }
          });
          myDiagram.commitTransaction("update active");
        } catch (diagramError) {
          console.error("Error updating diagram:", diagramError);
        }
        
        // Make sure we have the title property
        if (!node.title) {
          console.warn("Node missing title property:", node);
          // Try to get title from diagram model
          try {
            const modelNode = myDiagram.model.findNodeDataForKey(nodeId);
            if (modelNode && modelNode.title) {
              node.title = modelNode.title;
            }
          } catch (modelError) {
            console.error("Error accessing model data:", modelError);
          }
        }
        
        // Call the click handler if available
        if (typeof window.treeNodeClickCallback === 'function') {
          try {
            // Add a small delay to ensure the UI updates before loading content
            setTimeout(() => {
              window.treeNodeClickCallback(node, nodeId);
            }, 10);
          } catch (callbackError) {
            console.error("Error calling tree node click callback:", callbackError);
          }
        } else {
          console.error("Tree node click callback not found");
        }
      } catch (error) {
        console.error("Error in GoJS click handler:", error);
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
  renderTree,
  saveTree,
  loadTree,
  getSavedTrees,
  deleteSavedTree
};