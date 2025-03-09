/**
 * RabbitHole Animation Module
 * Adds rabbit animation when tree nodes are clicked
 */
console.log("RabbitHole Animation Module loading");

// Keep track of the current rabbit animation element
let currentRabbitAnimation = null;

// Add initialization function
function initRabbitAnimation() {
  console.log("Initializing rabbit animation module");
  
  // Create test animation to ensure DOM is ready
  const testAnimation = document.createElement('div');
  testAnimation.style.opacity = '0';
  testAnimation.style.position = 'fixed';
  testAnimation.style.top = '-1000px';
  testAnimation.style.pointerEvents = 'none';
  document.body.appendChild(testAnimation);
  
  // Remove test element after a short delay
  setTimeout(() => {
    if (testAnimation && testAnimation.parentNode) {
      testAnimation.parentNode.removeChild(testAnimation);
    }
  }, 200);
  
  // Report that the module is ready
  console.log("Rabbit animation module initialized and ready");
  return true;
}

/**
 * Create rabbit animation elements with SVG
 * @returns {HTMLElement} The rabbit animation container element
 */
function createRabbitAnimation() {
  // Create the container
  const container = document.createElement('div');
  container.className = 'rabbit-animation-container';
  
  // Create the hole element
  const hole = document.createElement('div');
  hole.className = 'rabbit-hole';
  
  // Create the rabbit SVG container
  const rabbitContainer = document.createElement('div');
  rabbitContainer.className = 'rabbit-svg-container';
  
  // Add the rabbit SVG content
  rabbitContainer.innerHTML = `
    <svg id="rabbit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64.95 72.95">
      <path d="M27.62,40.48h9.71c.91-7.94,3.26-16.08,6.29-23.47,1.82-4.44,7.18-15.96,12.23-16.94,2.79-.54,3.42,1.97,4.34,3.99,6.89,15.12,1.68,33.14-8.28,45.52l3.43,8.72c5.83,1.53,15.2,5.87,5.21,10.47-12.12,5.57-43.7,5.55-55.89.13-10.32-4.59-1.18-9,4.93-10.6l3.43-8.72C3.46,37.64-1.51,21.29,3.83,6.38,4.6,4.24,5.95-.29,8.68.07c4.86.64,9.87,10.51,11.72,14.63,3.57,7.98,6.09,17.1,7.22,25.78ZM49.07,46.15c8.5-11.75,13.74-27.25,6.89-41.1-.4-.31-1.31.9-1.61,1.23-5.21,5.71-9.71,19.02-11.48,26.58-.54,2.3-1.49,10.22-2.28,11.48-1.16,1.85-4.05.31-5.9.19-1.14-.08-2.52-.08-3.66-.03-2.38.12-5.9,1.93-6.96-.7-1.86-11.46-4.86-24.64-11.28-34.47-.39-.59-3.19-4.77-3.81-4.29-6.88,13.91-1.61,29.33,6.89,41.1.25.17,2.28-2.5,4.45-1.42,2.78,1.39-2.16,5.47-3.17,6.95-.93,1.36-2,3.22-2.51,4.77-.64,1.94-1.85,8.27-.4,9.75,2,2.03,13.09,2.41,16.21,2.62-.25-1.6-2.92-1.98-2.75-3.78.34-3.61,8.4-4.13,9.47-.28.54,1.96-2.4,2.42-2.67,4.06,2.63.09,15.69-.89,16.52-3.11,1.34-3.61-.62-9.83-2.59-13.05-.93-1.52-4.65-5.22-4.66-6.31-.02-3.04,3.93-1.72,5.3-.2Z"/>
      <path d="M41.26,55.11c3.83-1.08,4.44,7.19.66,7.55-3.03.29-3.36-6.79-.66-7.55Z"/>
      <path d="M22.65,55.12c3.73-.72,3.75,7.73.29,7.62-2.78-.09-3.57-6.99-.29-7.62Z"/>
    </svg>
  `;
  
  // Add elements to the container
  container.appendChild(hole);
  container.appendChild(rabbitContainer);
  
  return container;
}

/**
 * Show rabbit animation at the specified position
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 */
function showRabbitAnimationAt(x, y) {
  try {
    console.log(`showRabbitAnimationAt called with coordinates: x=${x}, y=${y}`);
    
    // Remove any existing rabbit animation
    if (currentRabbitAnimation) {
      if (currentRabbitAnimation.parentNode) {
        currentRabbitAnimation.parentNode.removeChild(currentRabbitAnimation);
      }
      currentRabbitAnimation = null;
    }
    
    // Validate coordinates
    if (isNaN(x) || isNaN(y) || x === undefined || y === undefined) {
      console.error("Invalid coordinates for rabbit animation:", x, y);
      // Use fallback position in the middle of the viewport
      x = window.innerWidth / 2;
      y = window.innerHeight / 3;
    }
    
    // Ensure coordinates are within viewport
    x = Math.max(30, Math.min(x, window.innerWidth - 30));
    y = Math.max(40, Math.min(y, window.innerHeight - 40));
    
    // Create new rabbit animation
    const rabbitAnimation = createRabbitAnimation();
    
    // Position the animation directly
    rabbitAnimation.style.left = `${x}px`;
    rabbitAnimation.style.top = `${y}px`;
    
    // Add to DOM - use fixed position for reliable positioning
    document.body.appendChild(rabbitAnimation);
    currentRabbitAnimation = rabbitAnimation;
    
    // Force a reflow before starting the animation
    void rabbitAnimation.offsetWidth;
    
    // Animation sequence:
    
    // 1. First, make the container active to open the portal
    rabbitAnimation.classList.add('active');
    
    // 2. After the portal is open, make the rabbit emerge
    setTimeout(() => {
      const rabbitSvg = rabbitAnimation.querySelector('.rabbit-svg-container');
      if (rabbitSvg) {
        rabbitSvg.classList.add('emerge');
        
        // 3. After the rabbit has been visible, make it go back into the portal
        setTimeout(() => {
          if (rabbitSvg) {
            rabbitSvg.classList.remove('emerge');
            rabbitSvg.classList.add('hide');
            
            // 4. After the rabbit is hidden, close the portal
            setTimeout(() => {
              if (rabbitAnimation && rabbitAnimation.parentNode) {
                rabbitAnimation.classList.add('disappear');
                
                // 5. Finally remove the element after the portal is closed
                setTimeout(() => {
                  if (rabbitAnimation && rabbitAnimation.parentNode) {
                    document.body.removeChild(rabbitAnimation);
                    if (currentRabbitAnimation === rabbitAnimation) {
                      currentRabbitAnimation = null;
                    }
                  }
                }, 400); // Match portal-close animation duration
              }
            }, 200); // Short delay before closing portal
          }
        }, 1000); // How long rabbit is visible
      }
    }, 350); // Wait for portal to open fully

    // Log that the animation has been triggered
    console.log("Rabbit animation displayed at:", x, y);
    return true;
  } catch (error) {
    console.error("Error displaying rabbit animation:", error);
    return false;
  }
}

/**
 * Extract position from a GoJS Node or DOM element
 * @param {Object|Element} element - GoJS Node or DOM Element
 * @returns {Object} Position with x and y coordinates
 */
function getElementPosition(element) {
  console.log("Getting position for element:", element);
  
  try {
    // If this is a GoJS node
    if (element && typeof go !== 'undefined' && element instanceof go.Node) {
      console.log("Processing GoJS Node element");
      const diagram = element.diagram;
      
      if (diagram) {
        try {
          // Get the center point of the node
          const nodeCenter = element.getDocumentPoint(go.Spot.Center);
          
          // Convert to screen coordinates
          const screenPoint = diagram.transformDocToView(nodeCenter);
          
          // Get diagram container position
          const diagramElement = diagram.div;
          if (diagramElement) {
            const rect = diagramElement.getBoundingClientRect();
            const x = rect.left + screenPoint.x;
            const y = rect.top + screenPoint.y;
            
            console.log("GoJS node position:", { x, y });
            return { x, y };
          }
        } catch (e) {
          console.error("Error getting GoJS node position:", e);
        }
      }
      
      // Fallback if diagram transformation fails
      if (element.location) {
        console.log("Using location fallback for GoJS node");
        // Attempt to get container position
        const container = document.getElementById('tree-diagram');
        if (container) {
          const rect = container.getBoundingClientRect();
          return {
            x: rect.left + element.location.x,
            y: rect.top + element.location.y
          };
        }
        
        return {
          x: element.location.x,
          y: element.location.y
        };
      }
    }
    
    // If this is a DOM element
    if (element && element instanceof Element) {
      console.log("Processing DOM element");
      const rect = element.getBoundingClientRect();
      const x = rect.left + (rect.width / 2);
      const y = rect.top;
      
      console.log("DOM element position:", { x, y });
      return { x, y };
    }
  } catch (err) {
    console.error("Error in getElementPosition:", err);
  }
  
  // Default fallback - center of viewport
  console.warn("Could not determine element position, using default");
  return { 
    x: window.innerWidth / 2, 
    y: window.innerHeight / 3 
  };
}

// Export functions
window.rabbitAnimation = {
  showRabbitEarsAt: showRabbitAnimationAt, // Keep old function name for compatibility
  showRabbitAnimationAt, // Add new function name
  getElementPosition,
  init: initRabbitAnimation
};

// Self-initialize when loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initRabbitAnimation, 100);
} else {
  document.addEventListener('DOMContentLoaded', initRabbitAnimation);
}

// Notify that module has loaded
console.log("RabbitHole Animation Module loaded successfully"); 