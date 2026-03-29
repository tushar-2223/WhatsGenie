export const WA_SELECTORS = {
  chatListRoots: ['#pane-side', '[aria-label="Chat list"]'],
  chatListItem: '[role="listitem"], [role="row"]',
  chatTitle:
    '[data-testid="conversation-title"] span[title], [data-testid="cell-frame-title"] span[title], span[title]',
  openChatTitle:
    '#main header [data-testid="conversation-info-header-chat-title"], #main header [role="button"] span[dir="auto"], #main header span[dir="auto"], #main header span[title], #main header h1 span[dir="auto"]',
  messageRow: '.message-in, .message-out',
  unreadBadge: '[aria-label*="unread"], [data-testid="icon-unread-count"]',
};

const SELECTOR_BUTTON_CLASS = 'wg-selector-btn';
const SELECTED_CHAT_KEY = '__wg_selected_chat';
const selectionHandlers = new WeakMap<HTMLElement, EventListener>();

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeChatName(value: string | null | undefined): string {
  return normalizeText(value)
    .normalize('NFKD')
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\u00ad]/g, '')
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function namesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeChatName(left);
  const normalizedRight = normalizeChatName(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight;
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft;

  return shorter.length >= 3 && longer.includes(shorter);
}

function isChatItemSelected(item: HTMLElement | null): boolean {
  return item?.querySelector('[aria-selected="true"]') !== null;
}

function isVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getBoundingClientRect().height > 0 &&
    element.getBoundingClientRect().width > 0
  );
}

function uniqueElements<T extends Element>(elements: T[]): T[] {
  return Array.from(new Set(elements));
}

function getChatListItems(): HTMLElement[] {
  const items = WA_SELECTORS.chatListRoots.flatMap((rootSelector) => {
    const root = document.querySelector(rootSelector);
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(WA_SELECTORS.chatListItem));
  });

  return uniqueElements(items).filter((item) => Boolean(getChatNameFromItem(item)));
}

function getChatNameFromItem(item: Element): string {
  const titleCandidates = item.querySelectorAll<HTMLElement>(WA_SELECTORS.chatTitle);
  for (const candidate of Array.from(titleCandidates)) {
    const value = normalizeText(candidate.getAttribute('title') || candidate.textContent);
    if (value) return value;
  }
  return '';
}

function getSelectedChatState():
  | {
      name: string;
      avatarUrl?: string;
      rowId?: string;
    }
  | null {
  return (window as typeof window & { [SELECTED_CHAT_KEY]?: { name: string; avatarUrl?: string; rowId?: string } })[
    SELECTED_CHAT_KEY
  ] ?? null;
}

function setSelectedChatState(data: { name: string; avatarUrl?: string; rowId?: string }) {
  (
    window as typeof window & {
      [SELECTED_CHAT_KEY]?: { name: string; avatarUrl?: string; rowId?: string };
    }
  )[SELECTED_CHAT_KEY] = data;
}

export function getOpenChatName(): string {
  const candidates = document.querySelectorAll<HTMLElement>(WA_SELECTORS.openChatTitle);
  for (const candidate of Array.from(candidates)) {
    const text = normalizeText(candidate.getAttribute('title') || candidate.textContent);
    if (text && !text.toLocaleLowerCase().startsWith('profile details')) {
      return text;
    }
  }
  return '';
}

function getPrimaryChatTarget(item: HTMLElement): HTMLElement {
  const candidates = [
    item.querySelector<HTMLElement>('[data-testid="cell-frame-container"]'),
    item.querySelector<HTMLElement>('[role="gridcell"]'),
    item.querySelector<HTMLElement>('div[tabindex="-1"]'),
    item.querySelector<HTMLElement>('button'),
    item.querySelector<HTMLElement>('a[href]'),
    item,
  ];

  return candidates.find((candidate) => isVisible(candidate)) || item;
}

function getVisibleMarkerLeft(item: HTMLElement): number {
  const rect = item.getBoundingClientRect();
  return Math.max(12, 12 - rect.left);
}

function fireSyntheticClick(target: HTMLElement) {
  const pointerTypes = ['pointerdown', 'pointerup'] as const;
  if (typeof PointerEvent !== 'undefined') {
    for (const type of pointerTypes) {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          isPrimary: true,
        })
      );
    }
  }

  for (const type of ['mousedown', 'mouseup', 'click'] as const) {
    target.dispatchEvent(
      new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
      })
    );
  }

  target.click();
}

function activateChatItem(item: HTMLElement) {
  item.scrollIntoView({ block: 'nearest' });
  const target = getPrimaryChatTarget(item);
  fireSyntheticClick(target);
  if (target !== item) {
    fireSyntheticClick(item);
  }
}

async function waitForChatToOpen(name: string, timeoutMs = 5000, item?: HTMLElement | null): Promise<boolean> {
  const targetName = normalizeChatName(name);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (item && isChatItemSelected(item)) {
      return true;
    }
    if (namesMatch(targetName, getOpenChatName())) {
      return true;
    }
    await wait(125);
  }

  return false;
}

function markSelectedButton(button: HTMLElement) {
  document.querySelectorAll<HTMLElement>(`.${SELECTOR_BUTTON_CLASS}`).forEach((btn) => {
    btn.style.backgroundColor = 'rgba(255,255,255,0.95)';
    btn.style.border = '2px solid #cbd5e1';
    btn.innerHTML = '';
  });

  button.style.backgroundColor = '#4f46e5';
  button.style.border = '2px solid #4f46e5';
  button.innerHTML = '<span style="color:white; font-size: 12px; line-height: 1;">&#10003;</span>';
}

// Returns array of { name, unreadCount }
export function getChatList(): ChatListItem[] {
  return getChatListItems().map((item) => {
    const badgeEl = item.querySelector<HTMLElement>(WA_SELECTORS.unreadBadge);
    const unreadCount = normalizeText(badgeEl?.textContent);

    return {
      name: getChatNameFromItem(item),
      unreadCount: unreadCount ? parseInt(unreadCount, 10) || 0 : 0,
    };
  });
}

// Click a chat by name to open it in the main window
export async function openChatByName(name: string): Promise<boolean> {
  if (namesMatch(name, getOpenChatName())) {
    return true;
  }

  const selectedChat = getSelectedChatState();
  if (selectedChat?.name && namesMatch(selectedChat.name, name) && selectedChat.rowId) {
    const selectedRow = document.querySelector<HTMLElement>(`[data-wg-chat-row-id="${selectedChat.rowId}"]`);
    if (selectedRow) {
      activateChatItem(selectedRow);
      if (await waitForChatToOpen(name, 5000, selectedRow)) {
        return true;
      }
    }
  }

  const matchingItems = getChatListItems().filter(
    (item) => namesMatch(getChatNameFromItem(item), name)
  );

  for (const item of matchingItems) {
    activateChatItem(item);
    if (await waitForChatToOpen(name, 5000, item)) {
      return true;
    }
  }

  return false;
}

export function injectSelectionButtons(): void {
  const items = getChatListItems();
  items.forEach((item, index) => {
    if (item.querySelector(`.${SELECTOR_BUTTON_CLASS}`)) return;

    item.dataset.wgChatRowId = item.dataset.wgChatRowId || `chat-${Date.now()}-${index}`;
    if (window.getComputedStyle(item).position === 'static') {
      item.style.position = 'relative';
    }

    const btn = document.createElement('div');
    btn.className = SELECTOR_BUTTON_CLASS;
    btn.style.position = 'absolute';
    btn.style.left = `${getVisibleMarkerLeft(item)}px`;
    btn.style.top = '50%';
    btn.style.transform = 'translateY(-50%)';
    btn.style.width = '20px';
    btn.style.height = '20px';
    btn.style.borderRadius = '50%';
    btn.style.backgroundColor = 'rgba(255,255,255,0.95)';
    btn.style.border = '2px solid #cbd5e1';
    btn.style.pointerEvents = 'none';
    btn.style.zIndex = '3';
    btn.style.padding = '0';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.18)';

    const name = getChatNameFromItem(item) || 'Unknown';
    const imgEl = item.querySelector<HTMLImageElement>('img');
    const avatarUrl = imgEl?.src || '';

    const handleSelection = () => {
      markSelectedButton(btn);
      setSelectedChatState({
        name,
        avatarUrl,
        rowId: item.dataset.wgChatRowId,
      });

      // Give WhatsApp time to process the trusted row click before the side panel steals focus.
      window.setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'CHAT_SELECTED',
          data: { name, avatarUrl },
        });
      }, 180);
    };

    item.addEventListener('click', handleSelection);
    selectionHandlers.set(item, handleSelection);

    item.appendChild(btn);
  });
}

export function removeSelectionButtons(): void {
  document.querySelectorAll(`.${SELECTOR_BUTTON_CLASS}`).forEach((btn) => btn.remove());
  getChatListItems().forEach((item) => {
    const handler = selectionHandlers.get(item);
    if (handler) {
      item.removeEventListener('click', handler);
      selectionHandlers.delete(item);
    }
  });
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
  const rows = document.querySelectorAll(WA_SELECTORS.messageRow);
  console.log('WhatsGenie scraper: found', rows.length, 'message rows');
  const messages: ScrapedMessage[] = [];

  rows.forEach((row) => {
    const isOutgoing = row.classList.contains('message-out');
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

    const textEl = row.querySelector<HTMLElement>('span.selectable-text');
    let text = normalizeText(textEl?.innerText);

    if (!text && copyable) {
      const spans = copyable.querySelectorAll<HTMLElement>('span');
      for (const span of Array.from(spans)) {
        const candidate = normalizeText(span.innerText);
        if (candidate) {
          text = candidate;
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

function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement || null;
  while (current && current !== document.body) {
    if (current.scrollHeight > current.clientHeight + 40) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function getMessageScrollContainer(containerSelector?: string): HTMLElement | null {
  if (containerSelector) {
    const explicitContainer = document.querySelector<HTMLElement>(containerSelector);
    if (explicitContainer) return explicitContainer;
  }

  const firstMessage = document.querySelector<HTMLElement>(WA_SELECTORS.messageRow);
  const detectedAncestor = findScrollableAncestor(firstMessage);
  if (detectedAncestor) return detectedAncestor;

  const fallbacks = [
    '#main [data-testid="conversation-panel-body"]',
    '#main div[tabindex="-1"]',
    '#main div[tabindex="0"]',
  ];

  for (const selector of fallbacks) {
    const container = document.querySelector<HTMLElement>(selector);
    if (container) return container;
  }

  return null;
}

export async function scrollToLoadMore(
  containerSelector?: string,
  maxScrolls = 50
): Promise<void> {
  const container = getMessageScrollContainer(containerSelector);
  if (!container) {
    console.log('WhatsGenie: scroll container not found, skipping scroll');
    return;
  }

  let prevMsgCount = 0;
  let noChangeRounds = 0;

  for (let i = 0; i < maxScrolls; i++) {
    container.scrollTop = 0;
    await wait(800);

    const currentCount = document.querySelectorAll(WA_SELECTORS.messageRow).length;
    console.log(`WhatsGenie: scroll ${i + 1}/${maxScrolls} - ${currentCount} messages loaded`);

    if (currentCount === prevMsgCount) {
      noChangeRounds++;
      if (noChangeRounds >= 3) {
        console.log('WhatsGenie: reached top of chat history');
        break;
      }
    } else {
      noChangeRounds = 0;
    }

    prevMsgCount = currentCount;
  }
}
