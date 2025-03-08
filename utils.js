// RabbitHole utility functions

// Helper function to create a unique ID
function generateNodeId(currentNodeId) {
  return currentNodeId++;
}

// Function to fetch Wikipedia data
async function fetchWikipediaData(term) {
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

// Function to fetch full article content
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
      // Further processing handled by the UI components...
      return data.parse.text['*'];
    } else {
      console.error("Failed to load article:", data);
      return null;
    }
  } catch (error) {
    console.error('Error fetching full article:', error);
    return null;
  }
}

// Export the functions
export { generateNodeId, fetchWikipediaData, fetchFullArticle }; 