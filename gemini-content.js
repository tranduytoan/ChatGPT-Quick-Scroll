window.addEventListener('load', () => setTimeout(initWithRetry, 1000));

function initWithRetry(retryCount = 0, maxRetries = 10) {
  // Make sure the main element exists
  const mainElement = document.querySelector('#app-root > main > side-navigation-v2 > bard-sidenav-container > bard-sidenav-content');
  if (!mainElement) {
    if (retryCount < maxRetries) {
      const delay = 500 * Math.pow(2, retryCount);
      console.log(`Gemini Quick Scroll: Main element not found, retrying in ${delay}ms (${retryCount + 1}/${maxRetries})`);
      setTimeout(() => initWithRetry(retryCount + 1, maxRetries), delay);
    }
    return;
  }

  // Check if button already exists
  if (document.getElementById('quick-scroll-btn')) {
    console.log('Gemini Quick Scroll: Button already exists');
    if (retryCount < maxRetries) {
      setTimeout(() => initWithRetry(retryCount + 1, maxRetries), 500);
    }
    return;
  }

  console.log('Gemini Quick Scroll: Initializing button');
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
  // Add Gemini-specific font styling
  panel.style.fontFamily = 'ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol';
  panel.style.lineHeight = '1.5';
  panel.style.tabSize = '4';

  // Create panel header
  const header = document.createElement('div');
  const headerText = document.createElement('div');
  const headerNote = document.createElement('div');

  header.id = 'quick-scroll-header';

  headerText.textContent = 'Your Messages';
  headerText.style.fontWeight = 'bold';

  headerNote.id = 'quick-scroll-header-note';
  headerNote.style.fontSize = '0.875rem'; // 14px
  headerNote.style.color = '#6b7280'; // Tailwind gray-500
  // headerNote.classList.add('hidden');
  headerNote.textContent = 'Note: Gemini may not load all old messages.';

  header.appendChild(headerText);
  header.appendChild(headerNote);
  panel.appendChild(header);

  // Create panel content container
  const content = document.createElement('div');
  content.id = 'quick-scroll-content';
  // Add content font styling
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
  content.replaceChildren();
  
  // Find all user messages
  // userMessages: Element[];
  const userMessages = findGeminiUserMessages();
  // updateHeaderNote(userMessages);
  
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
    const messageText = getGeminiMessageText(message);
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

// trả về một Element[], mỗi element là <div> chứa các <p>, mỗi <p> là một dòng của tin nhắn
function findGeminiUserMessages() {
  const userMessages = [];
  
  // Look for user query content elements
  const queryElements = document.querySelectorAll('[id^="user-query-content-"] div.query-text');
  
  queryElements.forEach(element => {
    // Find the closest container that represents the full message
    const text = getGeminiMessageText(element);
    if (text) {
      userMessages.push(element);
    }
  });

  return userMessages;
}

function getGeminiMessageText(element) {
  const textLines = element.querySelectorAll('p');
  let textContent = '';

  if (textLines.length > 0) {
    textLines.forEach(line => {
      textContent += line.textContent.trim() + '\n';
    });
  }
  return textContent.trim();
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
  let articleElement = message.closest('user-query-content');
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

// function updateHeaderNote(userMessages) {
//   const headerNote = document.getElementById('quick-scroll-header-note');
//   if (!headerNote) return;
  
//   const minQueryId = userMessages[0]?.closest('span')?.closest('div')?.getAttribute('id');
//   if (!minQueryId || !minQueryId.startsWith('user-query-content-')) {
//     headerNote.classList.add('hidden');
//     return;
//   }

//   const index = parseInt(minQueryId.replace('user-query-content-', ''), 10);
//   if (isNaN(index)) {
//     headerNote.classList.add('hidden');
//     return;
//   }

//   headerNote.classList.remove('hidden');
//   headerNote.textContent =
//     `There ${index === 1 ? 'is' : 'are'} ${index} more message${index === 1 ? '' : 's'} not loaded`;
// }

function setupObserver(mainElement) {
  const target = mainElement.querySelector('.content-wrapper')
  if (!target) {
    console.error('Gemini Quick Scroll: Target element not found for observer');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    const panel = document.getElementById('quick-scroll-panel');
    if (panel && !panel.classList.contains('hidden')) {
      updateMessagesPanel();
    }
  });
  
  observer.observe(target, { 
    childList: true, 
    subtree: true 
  });
  
  console.log('Gemini Quick Scroll: Observer set up on main element');
}
