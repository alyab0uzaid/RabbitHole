// Standalone Tree Saver/Loader Module
console.log("Tree Saver module loading");

// Create a global object to hold our functions
window.treeSaver = {};

// Function to save a named tree
treeSaver.saveTree = function(name) {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    alert('Please enter a valid name for your tree');
    return false;
  }
  
  try {
    console.log("Trying to save tree with name:", name);

    // Debug the available global objects
    console.log("Available globals:");
    console.log("window.treeModule exists:", typeof window.treeModule !== 'undefined');
    console.log("window.wikiTree exists:", typeof window.wikiTree !== 'undefined');
    
    // Get the current tree data using multiple methods
    let treeData = null;
    let activeNodeId = null;
    let treeDataSource = "none";
    
    // Method 1: Try to get data from window.treeModule
    if (window.treeModule) {
      console.log("Found treeModule, contents:", window.treeModule);
      
      if (window.treeModule.wikiTree && Array.isArray(window.treeModule.wikiTree)) {
        treeData = window.treeModule.wikiTree;
        treeDataSource = "treeModule.wikiTree";
        console.log("Got tree data from treeModule.wikiTree:", treeData.length, "nodes");
      }
      
      if (window.treeModule.getActiveNodeId && typeof window.treeModule.getActiveNodeId === 'function') {
        activeNodeId = window.treeModule.getActiveNodeId();
        console.log("Got active node ID from treeModule.getActiveNodeId:", activeNodeId);
      }
    }
    
    // Method 2: Try to get data from global wikiTree
    if (!treeData && window.wikiTree && Array.isArray(window.wikiTree)) {
      treeData = window.wikiTree;
      treeDataSource = "window.wikiTree";
      console.log("Got tree data from global wikiTree:", treeData.length, "nodes");
      
      if (window.activeNodeId !== undefined) {
        activeNodeId = window.activeNodeId;
        console.log("Got active node ID from global activeNodeId:", activeNodeId);
      }
    }
    
    // Method 3: Try to get data from treeModule direct properties
    if (!treeData && window.treeModule) {
      for (const key in window.treeModule) {
        const value = window.treeModule[key];
        if (Array.isArray(value) && value.length > 0 && value[0] && value[0].title && value[0].id) {
          console.log("Found potential tree data in treeModule." + key);
          treeData = value;
          treeDataSource = "treeModule." + key;
          break;
        }
      }
    }
    
    // Method 4: Look for any global array that might contain tree nodes
    if (!treeData) {
      console.log("Searching through all global variables for tree data...");
      for (const key in window) {
        try {
          const value = window[key];
          if (Array.isArray(value) && value.length > 0 && value[0] && 
              typeof value[0] === 'object' && value[0].title && value[0].id) {
            console.log("Found potential tree data in global variable:", key);
            treeData = value;
            treeDataSource = "window." + key;
            break;
          }
        } catch (e) {
          // Skip if can't access the property
        }
      }
    }

    // Debug output
    console.log("Tree data found:", treeData ? treeData.length + " nodes" : "none");
    console.log("Tree data source:", treeDataSource);
    console.log("Active node ID:", activeNodeId);
    
    // Create a fallback tree if no tree found and we're in a RabbitHole modal
    if (!treeData || treeData.length === 0) {
      if (document.querySelector('.rabbithole-container')) {
        console.log("No tree data found but we're in a RabbitHole modal. Creating a basic tree.");
        
        // Try to get the current article title from the modal
        const titleElement = document.querySelector('.rabbithole-modal-header h2');
        if (titleElement) {
          const title = titleElement.textContent;
          console.log("Found current article title:", title);
          
          treeData = [{
            id: 1,
            title: title,
            parentId: null
          }];
          activeNodeId = 1;
          treeDataSource = "fallback-creation";
        }
      }
    }
    
    if (!treeData || treeData.length === 0) {
      console.error("No tree data found to save");
      alert('No tree data found to save. Please make sure you have at least one node in your tree.');
      return false;
    }
    
    // Create the save object
    const saveObject = {
      name: name.trim(),
      savedAt: new Date().toISOString(),
      nodes: treeData,
      activeNodeId: activeNodeId,
      source: treeDataSource
    };
    
    // Debug output before saving
    console.log("Saving tree object:", saveObject);
    
    // Get existing saved trees
    let savedTrees = [];
    try {
      const savedData = localStorage.getItem('rabbitHoleSavedTrees');
      if (savedData) {
        savedTrees = JSON.parse(savedData);
      }
    } catch (e) {
      console.error('Error parsing saved trees', e);
    }
    
    if (!Array.isArray(savedTrees)) {
      savedTrees = [];
    }
    
    // Filter out any existing tree with the same name
    savedTrees = savedTrees.filter(tree => tree.name !== name.trim());
    
    // Add the new tree
    savedTrees.push(saveObject);
    
    // Save back to localStorage
    localStorage.setItem('rabbitHoleSavedTrees', JSON.stringify(savedTrees));
    
    alert(`Tree "${name}" saved successfully with ${treeData.length} nodes!`);
    return true;
  } catch (e) {
    console.error('Error saving tree:', e);
    alert('Error saving tree: ' + e.message);
    return false;
  }
};

// Function to get all saved trees
treeSaver.getSavedTrees = function() {
  try {
    const savedData = localStorage.getItem('rabbitHoleSavedTrees');
    if (savedData) {
      const trees = JSON.parse(savedData);
      if (Array.isArray(trees)) {
        // Sort by most recent first
        return trees.sort((a, b) => {
          const dateA = new Date(a.savedAt);
          const dateB = new Date(b.savedAt);
          return dateB - dateA;
        });
      }
    }
  } catch (e) {
    console.error('Error getting saved trees:', e);
  }
  return [];
};

// Function to load a saved tree
treeSaver.loadTree = function(name) {
  try {
    const trees = treeSaver.getSavedTrees();
    const tree = trees.find(t => t.name === name);
    
    if (!tree) {
      alert(`No tree found with name "${name}"`);
      return false;
    }
    
    // Load the tree data into the page
    if (window.treeModule) {
      // Use tree module functions if available
      window.treeModule.wikiTree = tree.nodes;
      if (window.treeModule.setActiveNode && tree.activeNodeId) {
        window.treeModule.setActiveNode(tree.activeNodeId);
      }
      
      // Save tree state to session storage
      if (window.treeModule.saveTreeState) {
        window.treeModule.saveTreeState();
      }
    } else {
      // Direct assignment as fallback
      window.wikiTree = tree.nodes;
      window.activeNodeId = tree.activeNodeId;
    }
    
    // Try to find the active node
    const activeNode = tree.nodes.find(node => node.id === tree.activeNodeId);
    
    alert(`Tree "${name}" loaded successfully!`);
    return activeNode;
  } catch (e) {
    console.error('Error loading tree:', e);
    alert('Error loading tree: ' + e.message);
    return false;
  }
};

// Function to delete a saved tree
treeSaver.deleteTree = function(name) {
  try {
    let trees = treeSaver.getSavedTrees();
    const initialCount = trees.length;
    
    trees = trees.filter(tree => tree.name !== name);
    
    if (trees.length === initialCount) {
      alert(`No tree found with name "${name}"`);
      return false;
    }
    
    localStorage.setItem('rabbitHoleSavedTrees', JSON.stringify(trees));
    alert(`Tree "${name}" deleted successfully!`);
    return true;
  } catch (e) {
    console.error('Error deleting tree:', e);
    alert('Error deleting tree: ' + e.message);
    return false;
  }
};

// Function to show the tree manager dialog
treeSaver.showDialog = function() {
  console.log('Opening tree manager dialog');
  
  // Remove any existing dialog
  const existing = document.getElementById('rabbithole-tree-manager');
  if (existing) {
    existing.remove();
  }
  
  // Create dialog container
  const dialog = document.createElement('div');
  dialog.id = 'rabbithole-tree-manager';
  dialog.style.position = 'fixed';
  dialog.style.top = '50%';
  dialog.style.left = '50%';
  dialog.style.transform = 'translate(-50%, -50%)';
  dialog.style.width = '400px';
  dialog.style.maxWidth = '95vw';
  dialog.style.backgroundColor = 'white';
  dialog.style.borderRadius = '8px';
  dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  dialog.style.padding = '20px';
  dialog.style.zIndex = '100000';
  dialog.style.fontFamily = 'Arial, sans-serif';
  
  // Add header
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '20px';
  header.style.borderBottom = '1px solid #eee';
  header.style.paddingBottom = '10px';
  
  const title = document.createElement('h2');
  title.textContent = 'Manage Saved Trees';
  title.style.margin = '0';
  title.style.fontSize = '20px';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '24px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.color = '#666';
  closeBtn.onclick = () => dialog.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  dialog.appendChild(header);
  
  // Add save section
  const saveSection = document.createElement('div');
  saveSection.style.backgroundColor = '#f8f9fa';
  saveSection.style.padding = '15px';
  saveSection.style.borderRadius = '8px';
  saveSection.style.marginBottom = '20px';
  
  const saveLabel = document.createElement('h3');
  saveLabel.textContent = 'Save Current Tree';
  saveLabel.style.margin = '0 0 10px 0';
  saveLabel.style.fontSize = '16px';
  
  const saveForm = document.createElement('div');
  saveForm.style.display = 'flex';
  saveForm.style.gap = '10px';
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Enter a name for this tree';
  nameInput.style.flex = '1';
  nameInput.style.padding = '8px';
  nameInput.style.borderRadius = '4px';
  nameInput.style.border = '1px solid #ddd';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.backgroundColor = '#4285f4';
  saveBtn.style.color = 'white';
  saveBtn.style.border = 'none';
  saveBtn.style.borderRadius = '4px';
  saveBtn.style.padding = '8px 15px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (name) {
      const success = treeSaver.saveTree(name);
      if (success) {
        nameInput.value = '';
        refreshTreeList();
      }
    } else {
      alert('Please enter a name for your tree');
    }
  };
  
  saveForm.appendChild(nameInput);
  saveForm.appendChild(saveBtn);
  
  saveSection.appendChild(saveLabel);
  saveSection.appendChild(saveForm);
  dialog.appendChild(saveSection);
  
  // Add saved trees section
  const listSection = document.createElement('div');
  
  const listTitle = document.createElement('h3');
  listTitle.textContent = 'Your Saved Trees';
  listTitle.style.margin = '0 0 10px 0';
  listTitle.style.fontSize = '16px';
  
  const treeList = document.createElement('div');
  treeList.id = 'tree-saver-list';
  treeList.style.maxHeight = '300px';
  treeList.style.overflowY = 'auto';
  treeList.style.border = '1px solid #eee';
  treeList.style.borderRadius = '4px';
  
  listSection.appendChild(listTitle);
  listSection.appendChild(treeList);
  dialog.appendChild(listSection);
  
  // Function to refresh the tree list
  function refreshTreeList() {
    treeList.innerHTML = '';
    
    const trees = treeSaver.getSavedTrees();
    
    if (trees.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No saved trees found';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.color = '#666';
      emptyMsg.style.padding = '20px';
      treeList.appendChild(emptyMsg);
      return;
    }
    
    trees.forEach(tree => {
      const item = document.createElement('div');
      item.style.padding = '10px';
      item.style.borderBottom = '1px solid #eee';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      
      // Tree info
      const info = document.createElement('div');
      
      const name = document.createElement('div');
      name.textContent = tree.name;
      name.style.fontWeight = 'bold';
      
      const date = document.createElement('div');
      date.textContent = new Date(tree.savedAt).toLocaleString();
      date.style.fontSize = '12px';
      date.style.color = '#666';
      
      const nodeCount = document.createElement('div');
      nodeCount.textContent = `${tree.nodes.length} nodes`;
      nodeCount.style.fontSize = '12px';
      nodeCount.style.color = '#666';
      
      info.appendChild(name);
      info.appendChild(date);
      info.appendChild(nodeCount);
      
      // Action buttons
      const buttons = document.createElement('div');
      buttons.style.display = 'flex';
      buttons.style.gap = '5px';
      
      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.style.backgroundColor = '#4285f4';
      loadBtn.style.color = 'white';
      loadBtn.style.border = 'none';
      loadBtn.style.borderRadius = '4px';
      loadBtn.style.padding = '5px 10px';
      loadBtn.style.cursor = 'pointer';
      loadBtn.onclick = () => {
        const activeNode = treeSaver.loadTree(tree.name);
        if (activeNode) {
          dialog.remove();
          
          // Try to show the tree
          if (typeof removeModals === 'function') {
            removeModals(false); // Don't clear tree data
          }
          
          // Find and fetch data for active node
          if (typeof fetchWikipediaData === 'function' && typeof createExpandedModal === 'function') {
            fetchWikipediaData(activeNode.title).then(data => {
              if (data) {
                createExpandedModal(data, activeNode.id);
              }
            });
          }
        }
      };
      
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.backgroundColor = '#f44336';
      deleteBtn.style.color = 'white';
      deleteBtn.style.border = 'none';
      deleteBtn.style.borderRadius = '4px';
      deleteBtn.style.padding = '5px 10px';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.onclick = () => {
        if (confirm(`Are you sure you want to delete "${tree.name}"?`)) {
          const success = treeSaver.deleteTree(tree.name);
          if (success) {
            refreshTreeList();
          }
        }
      };
      
      buttons.appendChild(loadBtn);
      buttons.appendChild(deleteBtn);
      
      item.appendChild(info);
      item.appendChild(buttons);
      
      treeList.appendChild(item);
    });
  }
  
  // Initial load of the tree list
  refreshTreeList();
  
  // Add to page
  document.body.appendChild(dialog);
};

// Debug message to confirm loading
console.log("Tree Saver module loaded successfully");

// Add a global function for easy access
window.showTreeManager = treeSaver.showDialog;

// Add a global test function that can be called from console
window.testTreeManager = function() {
  console.log("Test function called");
  alert("Tree manager test function called!");
  treeSaver.showDialog();
};

// Add a keyboard shortcut for testing (Ctrl+Shift+S)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    console.log("Keyboard shortcut triggered tree manager");
    treeSaver.showDialog();
  }
});

// Add a direct initialization code that runs immediately
(function() {
  console.log("Tree Saver initializing...");
  
  // Add a test button at the top-right of the page for easy access
  setTimeout(() => {
    // Container for buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = '10px';
    buttonContainer.style.right = '10px';
    buttonContainer.style.zIndex = '999999';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';
    
    // Save Tree button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Tree';
    saveButton.style.padding = '5px 10px';
    saveButton.style.backgroundColor = '#4285f4';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    
    saveButton.addEventListener('click', function(e) {
      console.log("Save tree button clicked");
      e.stopPropagation();
      e.preventDefault();
      treeSaver.showDialog();
    });
    
    // Create Test Tree button
    const testTreeButton = document.createElement('button');
    testTreeButton.textContent = 'Create Test Tree';
    testTreeButton.style.padding = '5px 10px';
    testTreeButton.style.backgroundColor = '#0f9d58';
    testTreeButton.style.color = 'white';
    testTreeButton.style.border = 'none';
    testTreeButton.style.borderRadius = '4px';
    testTreeButton.style.cursor = 'pointer';
    
    testTreeButton.addEventListener('click', function(e) {
      console.log("Test tree button clicked");
      e.stopPropagation();
      e.preventDefault();
      treeSaver.createTestTree();
    });
    
    // Add buttons to container
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(testTreeButton);
    
    // Add container to page
    document.body.appendChild(buttonContainer);
    console.log("Tree saver buttons added to page");
  }, 2000);
})();

// Add a function to create a test tree for development
treeSaver.createTestTree = function() {
  console.log("Creating test tree for development purposes");
  
  // Create a sample tree
  const testTree = [
    { id: 1, title: "Quantum Physics", parentId: null },
    { id: 2, title: "String Theory", parentId: 1 },
    { id: 3, title: "Quantum Entanglement", parentId: 1 },
    { id: 4, title: "Wave-Particle Duality", parentId: 1 },
    { id: 5, title: "M-Theory", parentId: 2 },
    { id: 6, title: "Einstein-Podolsky-Rosen Paradox", parentId: 3 }
  ];
  
  // Set it as the current tree
  try {
    // Try to update the tree data in all possible places
    if (window.treeModule) {
      if (window.treeModule.wikiTree) {
        window.treeModule.wikiTree = testTree;
      }
      
      if (window.treeModule.setActiveNode && typeof window.treeModule.setActiveNode === 'function') {
        window.treeModule.setActiveNode(1);
      }
      
      if (window.treeModule.saveTreeState && typeof window.treeModule.saveTreeState === 'function') {
        window.treeModule.saveTreeState();
      }
    }
    
    // Also set as global variables
    window.wikiTree = testTree;
    window.activeNodeId = 1;
    
    alert("Test tree created with 6 nodes. Try saving it now!");
    return testTree;
  } catch (e) {
    console.error("Error creating test tree:", e);
    alert("Error creating test tree: " + e.message);
    return false;
  }
};

// Make this function globally available
window.createTestTree = treeSaver.createTestTree; 