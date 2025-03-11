# RabbitHole Chrome Extension

RabbitHole is a Chrome extension that transforms your web browsing experience by seamlessly integrating Wikipedia information directly into web pages. It allows you to explore topics in depth without leaving the page you're on.

![rabbitholedemov3](https://github.com/user-attachments/assets/11dbc744-c8c6-4332-b2c6-fa16e14cbe3e)

![rabbitholedemov4](https://github.com/user-attachments/assets/82dcf534-9679-43dc-9b84-a35aa2306b34)

## Features


- **Text Highlighting**: Highlight any text on a webpage that you want to learn more about.
- **Wikipedia Integration**: If the highlighted text has a corresponding Wikipedia entry, it will be converted to a clickable link.
- **Preview Popups**: Hover over the linked text to see a preview with a summary and image from Wikipedia.
- **Full Article Modal**: Click any link to open a full-page modal with the complete Wikipedia article.
- **Rabbit Hole Tracking**: As you explore related topics, a tree visualization keeps track of your journey, allowing you to easily navigate back to previous topics.

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
   Open your terminal (or Git Bash) and run the following command to clone the repository:
  ```bash
  git clone https://github.com/alyab0uzaid/rabbithole
  ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" at the top right
4. Click "Load unpacked" and select the directory containing this extension
5. The RabbitHole extension icon should now appear in your browser toolbar

## How to Use

1. Browse to any webpage
2. Highlight text that you think might have a Wikipedia page
3. If a Wikipedia page exists, the text will turn blue and become underlined
4. Hover over the blue text to see a popup with a summary and image
5. Click on the blue text to open the full Wikipedia article in a modal
6. Within the modal, you can click on any internal link to explore related topics
7. Use the tree visualization on the left side to track your journey and navigate between topics

## Technical Implementation

RabbitHole uses the public Wikipedia API to fetch article data, including:
- Search results for terms
- Article summaries and images
- Full article content

The extension injects content dynamically into web pages without affecting their core functionality. All Wikipedia content is rendered within the context of the current page for a seamless browsing experience.

## Privacy

RabbitHole only sends requests to Wikipedia when you interact with the extension. It does not track your browsing history or send any data to third parties other than Wikipedia.

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help improve RabbitHole.
