// This JavaScript file is for the popup UI

document.addEventListener('DOMContentLoaded', function() {
  console.log('RabbitHole popup loaded');
  
  // Add a status message to let the user know the extension is working
  const footer = document.querySelector('.footer');
  if (footer) {
    const statusMsg = document.createElement('p');
    statusMsg.textContent = 'Extension is active and ready to use!';
    statusMsg.style.color = '#4CAF50';
    statusMsg.style.fontWeight = 'bold';
    statusMsg.style.marginTop = '10px';
    footer.appendChild(statusMsg);
  }
});

// No other functionality is needed since the content script 
// operates independently once loaded