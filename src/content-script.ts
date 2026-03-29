/// <reference types="chrome" />

import {
    scrapeMessages,
    getChatList,
    injectSelectionButtons,
    removeSelectionButtons,
    scrollToLoadMore,
    getMessageScrollContainer,
    getOpenChatName,
} from './lib/whatsapp';

function showOverlay(message: string) {
    let overlay = document.getElementById('wg-extraction-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'wg-extraction-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.color = '#fff';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999999';
        overlay.style.fontFamily = 'Arial, sans-serif';
        overlay.innerHTML = `
            <div style="width: 50px; height: 50px; border: 5px solid #fff; border-top: 5px solid #4f46e5; border-radius: 50%; animation: wg-spin 1s linear infinite; margin-bottom: 20px;"></div>
            <h2 id="wg-overlay-text" style="margin:0; font-weight: normal; font-size: 24px;"></h2>
            <style>@keyframes wg-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        document.body.appendChild(overlay);
    }
    const textEl = document.getElementById('wg-overlay-text');
    if (textEl) textEl.textContent = message;
    overlay.style.display = 'flex';
}

function hideOverlay() {
    const overlay = document.getElementById('wg-extraction-overlay');
    if (overlay) overlay.style.display = 'none';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'INJECT_SELECTORS') {
        try {
            console.log('WhatsGenie: Injecting selectors...');
            injectSelectionButtons();

            // Re-inject on mutations so newly rendered rows also get selectors.
            const observer = new MutationObserver(() => injectSelectionButtons());
            const pane = document.getElementById('pane-side');
            observer.observe(pane || document.body, { childList: true, subtree: true });
            
            // Store observer on window to disconnect later
            (window as any).__wg_observer = observer;

            sendResponse({ success: true });
        } catch (error: any) {
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }

    if (request.type === 'REMOVE_SELECTORS') {
        if ((window as any).__wg_observer) {
            (window as any).__wg_observer.disconnect();
        }
        removeSelectionButtons();
        sendResponse({ success: true });
        return true;
    }

    if (request.type === 'EXTRACT_CHAT') {
        try {
            console.log('WhatsGenie Content Script: Extracting chat...');
            const data = scrapeMessages();
            sendResponse({ success: true, data });
        } catch (error: any) {
            console.error('WhatsApp Extraction error:', error);
            sendResponse({ success: false, error: String(error) });
        }
        return true; 
    }

    if (request.type === 'GET_CHATS') {
        try {
            console.log('WhatsGenie: Fetching active chats...');
            const chats = getChatList();
            sendResponse({ success: true, data: chats });
        } catch (error: any) {
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }

    if (request.type === 'OPEN_AND_EXTRACT_CHAT') {
        (async () => {
            try {
                const openedChatName = getOpenChatName();
                if (!openedChatName) {
                   hideOverlay();
                   sendResponse({ success: false, error: 'Please click the chat row in WhatsApp first so the conversation is open before extracting.' });
                   return;
                }

                try {
                    showOverlay(`Loading all messages from "${openedChatName}"...`);

                    // Load the full history from the top of the currently open chat panel.
                    await scrollToLoadMore(undefined, 50);

                    // Scroll back to bottom so the user still sees the latest messages after extraction.
                    const container = getMessageScrollContainer();
                    if (container) container.scrollTop = container.scrollHeight;

                    showOverlay('Extracting messages...');
                    console.log('WhatsGenie: Scraping messages...');
                    const data = scrapeMessages();
                    console.log('WhatsGenie: Got', data.length, 'messages');
                    hideOverlay();
                    sendResponse({ success: true, data });
                } catch(e: any) {
                     console.error('WhatsGenie extraction error:', e);
                    hideOverlay();
                    sendResponse({ success: false, error: String(e) });
                }

            } catch (error: any) {
                hideOverlay();
                sendResponse({ success: false, error: String(error) });
            }
        })();
        return true;
    }
});
