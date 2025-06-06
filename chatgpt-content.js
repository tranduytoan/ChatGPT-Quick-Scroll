// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', () => setTimeout(initWithRetry, 500));
window.addEventListener('load', () => setTimeout(initWithRetry, 1000));

// Also try to init if the document is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initWithRetry, 1500);
}

// Initialize with retry mechanism
function initWithRetry(retryCount = 0, maxRetries = 10) {
  // Make sure the main element exists
  const mainElement = document.querySelector('main');
  if (!mainElement) {
    if (retryCount < maxRetries) {
      const delay = 500 * Math.pow(2, retryCount);
      console.log(`ChatGPT Quick Scroll: Main element not found, retrying in ${delay}ms (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => initWithRetry(retryCount + 1, maxRetries), delay);
    }
    return;
  }

  // Check if button already exists
  if (document.getElementById('quick-scroll-btn')) {
    console.log('ChatGPT Quick Scroll: Button already exists');
    if (retryCount < maxRetries) {
      setTimeout(() => initWithRetry(retryCount + 1, maxRetries), 500);
    }
    return;
  }

  console.log('ChatGPT Quick Scroll: Initializing button');
  createQuickScrollButton(mainElement);
  
  // Set up mutation observer to detect new messages
  setupObserver(mainElement);
}

function createQuickScrollButton(mainElement) {
  // Create the button
  const button = document.createElement('button');
  button.id = 'quick-scroll-btn';
  button.innerHTML = '⚡';
  button.title = 'Quick scroll to messages';
  
  // Set button styles for positioning relative to main element
  button.style.position = 'absolute';
  button.style.bottom = '20px';
  button.style.left = '24px';
  button.style.zIndex = '1000';
  button.style.borderRadius = '50%';
  button.style.width = '40px';
  button.style.height = '40px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // Create the panel (initially hidden)
  const panel = document.createElement('div');
  panel.id = 'quick-scroll-panel';
  panel.classList.add('hidden');
  panel.style.position = 'absolute';
  panel.style.bottom = '70px';
  panel.style.left = '24px';
  panel.style.zIndex = '1001';
  panel.style.width = '413px';
  panel.style.height = '50%';
  panel.style.overflowY = 'auto';
  
  // Create panel header
  const header = document.createElement('div');
  header.id = 'quick-scroll-header';
  header.textContent = 'Your Messages';
  panel.appendChild(header);

  // Create panel content container
  const content = document.createElement('div');
  content.id = 'quick-scroll-content';
  panel.appendChild(content);
  
  // Set main element to position:relative if it's not already
  const mainPosition = window.getComputedStyle(mainElement).position;
  if (mainPosition === 'static') {
    mainElement.style.position = 'relative';
  }
  
  // Append button and panel to mainElement
  mainElement.appendChild(button);
  mainElement.appendChild(panel);
  
  // Button click toggles panel
  button.addEventListener('click', () => {
    if (panel.classList.contains('hidden')) {
      updateMessagesPanel();
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  // Close panel when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('hidden') && 
        e.target !== button && 
        e.target !== panel && 
        !panel.contains(e.target)) {
      panel.classList.add('hidden');
    }
  });
}

function updateMessagesPanel() {
  const content = document.getElementById('quick-scroll-content');
  content.innerHTML = '';
  
  // Find all user messages
  const userMessages = findChatGPTUserMessages();
  
  if (userMessages.length === 0) {
    const noMessages = document.createElement('div');
    noMessages.className = 'quick-scroll-message';
    noMessages.textContent = 'No messages found';
    content.appendChild(noMessages);
    return;
  }
  
  // Add each message to the panel
  userMessages.forEach((message, index) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'quick-scroll-message';
    
    // Get message text and truncate it
    const messageText = getChatGPTMessageText(message);
    const truncatedText = truncateText(messageText);
    
    messageElement.textContent = truncatedText;
    messageElement.title = messageText;
    
    // Add click event to scroll to the message
    messageElement.addEventListener('click', () => {
      scrollToMessage(message);
    });
    
    content.appendChild(messageElement);
  });
}

function findChatGPTUserMessages() {
  // Find all user messages using the data attribute
  const messagesWithRole = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
  
  // Find message containers using conversation turns
  const allArticles = Array.from(document.querySelectorAll('article[data-testid^="conversation-turn-"]'));
  const userArticles = allArticles.filter(article => {
    return article.querySelector('h5.sr-only') && 
           article.querySelector('h5.sr-only').textContent.includes('Bạn đã nói:');
  });
  
  // Create a map to track unique messages by their text content
  const uniqueMessages = new Map();
  
  // Process messages with role attribute
  messagesWithRole.forEach(msg => {
    const text = getChatGPTMessageText(msg);
    if (text && !uniqueMessages.has(text)) {
      uniqueMessages.set(text, msg);
    }
  });
  
  // Process user articles, avoiding duplicates
  userArticles.forEach(article => {
    const text = getChatGPTMessageText(article);
    if (text && !uniqueMessages.has(text)) {
      uniqueMessages.set(text, article);
    }
  });
  
  return Array.from(uniqueMessages.values());
}

function getChatGPTMessageText(message) {
  // Try to get text from whitespace-pre-wrap div
  const textElement = message.querySelector('.whitespace-pre-wrap');
  if (textElement && textElement.textContent) {
    return textElement.textContent.trim();
  }
  
  // Fallback: get all text content
  return message.textContent.trim();
}

function truncateText(text, wordCount = 10, charLimit = 50) {
  if (text.length <= charLimit) return text;
  
  const words = text.split(/\s+/);
  if (words.length <= wordCount) {
    return text.substring(0, charLimit) + '...';
  }
  
  const wordLimited = words.slice(0, wordCount).join(' ');
  const charLimited = text.substring(0, charLimit);
  
  return (wordLimited.length < charLimited.length ? wordLimited : charLimited) + '...';
}

function scrollToMessage(message) {
  let articleElement = message.closest('article');
  if (!articleElement) articleElement = message;
  
  articleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // Add highlight effect
  articleElement.classList.add('quick-scroll-highlight');
  setTimeout(() => {
    articleElement.classList.remove('quick-scroll-highlight');
  }, 2000);
  
  // Close the panel
  const panel = document.getElementById('quick-scroll-panel');
  panel.classList.add('hidden');
}

function setupObserver(mainElement) {
  const presentationDiv = mainElement.querySelector('div[role="presentation"]');
  const targetElement = presentationDiv || mainElement;
  
  const observer = new MutationObserver((mutations) => {
    const panel = document.getElementById('quick-scroll-panel');
    if (panel && !panel.classList.contains('hidden')) {
      updateMessagesPanel();
    }
  });
  
  observer.observe(targetElement, { 
    childList: true, 
    subtree: true 
  });
  
  console.log(`ChatGPT Quick Scroll: Observer set up on ${presentationDiv ? 'presentation div' : 'main element'}`);
}
