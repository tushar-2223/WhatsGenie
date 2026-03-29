export const WA_SELECTORS = {
  chatListItem: '[aria-label="Chat list"] [role="row"]', 
  chatTitle: 'span[title]',                                   
  messageWithMeta: '[data-pre-plain-text]',                   
  messageText: 'span.selectable-text span[dir]',              
  unreadBadge: '[aria-label*="unread message"]',              
};

export interface ChatListItem {
  name: string;
  unreadCount: number;
}

export interface ScrapedMessage {
  sender: string;
  text: string;
  time: string;
  isOutgoing?: boolean;
}

// Returns array of { name, unreadCount }
export function getChatList(): ChatListItem[] {
  const items = document.querySelectorAll(WA_SELECTORS.chatListItem);
  return Array.from(items)
    .map((item) => {
      const titleEl = item.querySelector(WA_SELECTORS.chatTitle);
      const badgeEl = item.querySelector(WA_SELECTORS.unreadBadge);
      return {
        name:
          titleEl?.getAttribute('title') || titleEl?.textContent || 'Unknown',
        unreadCount: badgeEl ? parseInt(badgeEl.textContent || '0') || 0 : 0,
      };
    })
    .filter((c) => c.name !== 'Unknown');
}

// Click a chat by name to open it in the main window
export function openChatByName(name: string): boolean {
  const items = document.querySelectorAll(WA_SELECTORS.chatListItem);
  for (const item of Array.from(items)) {
    const titleEl = item.querySelector(WA_SELECTORS.chatTitle);
    const chatName = titleEl?.getAttribute('title') || titleEl?.textContent || '';
    if (chatName === name) {
      item.dispatchEvent(new MouseEvent('mousedown', { view: window, bubbles: true, cancelable: true }));
      item.dispatchEvent(new MouseEvent('mouseup', { view: window, bubbles: true, cancelable: true }));
      item.dispatchEvent(new MouseEvent('click', { view: window, bubbles: true, cancelable: true }));
      return true;
    }
  }
  return false;
}

export function injectSelectionButtons(): void {
  const items = document.querySelectorAll(WA_SELECTORS.chatListItem);
  items.forEach((item) => {
    if (item.querySelector('.wg-selector-btn')) return;

    const btn = document.createElement('div');
    btn.className = 'wg-selector-btn';
    btn.style.width = '20px';
    btn.style.height = '20px';
    btn.style.borderRadius = '50%';
    btn.style.backgroundColor = 'white';
    btn.style.border = '2px solid #ccc';
    btn.style.cursor = 'pointer';
    btn.style.marginRight = '8px';
    btn.style.marginLeft = '12px';
    btn.style.flexShrink = '0';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.zIndex = '9999';

    const titleEl = item.querySelector(WA_SELECTORS.chatTitle);
    const name = titleEl?.getAttribute('title') || titleEl?.textContent || 'Unknown';
    const imgEl = item.querySelector('img');
    const avatarUrl = imgEl?.src || '';

    btn.addEventListener('click', (e) => {
      // Intentionally DO NOT stopPropagation so the chat automatically opens in the background!
      document.querySelectorAll('.wg-selector-btn').forEach(b => {
        (b as HTMLElement).style.backgroundColor = 'white';
        b.innerHTML = '';
      });

      btn.style.backgroundColor = '#4f46e5'; 
      btn.style.border = '2px solid #4f46e5';
      btn.innerHTML = '<span style="color:white; font-size: 14px;">✔</span>';

      chrome.runtime.sendMessage({
        type: 'CHAT_SELECTED',
        data: { name, avatarUrl }
      });
    });

    item.prepend(btn);
    (item as HTMLElement).style.display = 'flex';
    (item as HTMLElement).style.alignItems = 'center';
  });
}

export function removeSelectionButtons(): void {
  document.querySelectorAll('.wg-selector-btn').forEach(btn => btn.remove());
}

export function parseMetaAttr(
  attr: string
): { time: string; dateStr: string; sender: string } | null {
  const match = attr.match(/\[(.+?),\s*(.+?)\]\s*(.+?):/);
  if (!match) return null;
  const [, time, dateStr, sender] = match;
  return { time: time.trim(), dateStr: dateStr.trim(), sender: sender.trim() };
}

export function scrapeMessages(): ScrapedMessage[] {
  // Confirmed selectors from live WhatsApp Web DOM inspection:
  // - .message-in / .message-out are the top-level message containers
  // - .copyable-text[data-pre-plain-text] holds sender/time metadata
  // - span.selectable-text holds the actual message text

  const rows = document.querySelectorAll('.message-in, .message-out');
  console.log('WhatsGenie scraper: found', rows.length, 'message rows');
  const messages: ScrapedMessage[] = [];

  rows.forEach((row) => {
    const isOutgoing = row.classList.contains('message-out');
    
    // Find the copyable-text element which carries metadata
    const copyable = row.querySelector('.copyable-text[data-pre-plain-text]');
    
    let sender = isOutgoing ? 'Me' : 'Unknown';
    let time = '';

    if (copyable) {
      const meta = copyable.getAttribute('data-pre-plain-text');
      if (meta) {
        const parsed = parseMetaAttr(meta);
        if (parsed) {
          sender = isOutgoing ? 'Me' : parsed.sender;
          time = `${parsed.time} ${parsed.dateStr}`;
        }
      }
    }

    // Get message text from selectable-text span
    const textEl = row.querySelector('span.selectable-text');
    let text = textEl ? (textEl as HTMLElement).innerText.trim() : '';

    // Fallback: try any copyable-text content
    if (!text && copyable) {
      const spans = copyable.querySelectorAll('span');
      for (const span of Array.from(spans)) {
        const t = (span as HTMLElement).innerText?.trim();
        if (t && t.length > 0) {
          text = t;
          break;
        }
      }
    }

    if (text) {
      messages.push({ sender, text, time, isOutgoing });
    }
  });

  console.log('WhatsGenie scraper: extracted', messages.length, 'messages with text');
  return messages;
}

export async function scrollToLoadMore(
  containerSelector: string,
  maxScrolls = 10
): Promise<void> {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.log('WhatsGenie: scroll container not found for selector:', containerSelector);
    return;
  }
  for (let i = 0; i < maxScrolls; i++) {
    container.scrollTop = 0;
    await new Promise((r) => setTimeout(r, 600));
  }
}


