/// <reference types="chrome" />

import { scrapeMessages, getChatList, openChatByName, injectSelectionButtons, removeSelectionButtons, scrollToLoadMore } from './lib/whatsapp';

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
            
            // Re-inject on scroll/mutation to handle infinite scroll
            const observer = new MutationObserver(() => injectSelectionButtons());
            const pane = document.getElementById('pane-side');
            if (pane) observer.observe(pane, { childList: true, subtree: true });
            
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
        try {
            const { chatName } = request;
            console.log('WhatsGenie: Opening chat', chatName);
            showOverlay(`Opening "${chatName}"...`);
            
            // Explicitly open the chat by simulating a click
            const opened = openChatByName(chatName);
            if (!opened) {
               hideOverlay();
               sendResponse({ success: false, error: 'Chat not found on screen. Try scrolling down in WhatsApp.' });
               return true;
            }
            
            // Wait for chat panel to render
            setTimeout(async () => {
                try {
                    showOverlay(`Loading all messages from "${chatName}"...`);
                    
                    // Aggressively scroll to load entire chat history
                    await scrollToLoadMore('div.x10l6tqk.x13vifvy', 50);
                    
                    // Scroll back to bottom so user sees latest messages after extraction
                    const container = document.querySelector('div.x10l6tqk.x13vifvy') || document.querySelector('#main div[tabindex]');
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
            }, 2000);

        } catch (error: any) {
            hideOverlay();
            sendResponse({ success: false, error: String(error) });
        }
        return true;
    }
});
