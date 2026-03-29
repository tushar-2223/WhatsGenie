import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AddCircle, Setting2, ArrowLeft2, InfoCircle } from 'iconsax-react';
import { callOpenRouter, buildSummarizePrompt, buildQAPrompt, buildCustomPrompt, ChatMessage } from '../lib/gemini';
import { OPENROUTER_KEY } from '../lib/config';

type AppState = 'idle' | 'selecting' | 'selected' | 'extracting' | 'analyzing';

function App() {
  const [apiKey, setApiKey] = useState(OPENROUTER_KEY || '');
  const [geminiModel, setGeminiModel] = useState('qwen/qwen3-next-80b-a3b-instruct:free');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWhatsApp, setIsWhatsApp] = useState(true);

  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedChat, setSelectedChat] = useState<{ name: string, avatarUrl: string } | null>(null);

  const [chatData, setChatData] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'custom'>('summary');
  const [result, setResult] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [question, setQuestion] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Setup tab listeners & storage
  useEffect(() => {
    const checkIfWhatsApp = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && !tab.url.includes('web.whatsapp.com')) {
        setIsWhatsApp(false);
      } else {
        setIsWhatsApp(true);
      }
    };
    checkIfWhatsApp();
    chrome.tabs.onActivated.addListener(checkIfWhatsApp);
    chrome.tabs.onUpdated.addListener(checkIfWhatsApp);

    chrome.storage.local.get(['openrouter_api_key', 'openrouter_model']).then((res) => {
      if (res.openrouter_model) setGeminiModel(res.openrouter_model as string);
      if (res.openrouter_api_key) {
        setApiKey(res.openrouter_api_key as string);
        setIsConfigured(true);
      } else if (OPENROUTER_KEY) {
        setIsConfigured(true);
      }
    });

    const messageListener = (msg: any) => {
      if (msg.type === 'CHAT_SELECTED') {
        setSelectedChat(msg.data);
        setAppState('selected');
        setStatus('');
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.trim()) return alert('Please enter a valid API key');
    await chrome.storage.local.set({ openrouter_api_key: apiKey.trim(), openrouter_model: geminiModel });
    setIsConfigured(true);
    setShowSettings(false);
  };

  const injectSelectors = async () => {
    setAppState('selecting');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'INJECT_SELECTORS' });
    }
  };

  const removeSelectors = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });
    }
    setAppState('idle');
    setSelectedChat(null);
  };

  const triggerExtraction = async () => {
    if (!selectedChat) return;
    setAppState('extracting');
    setStatus(`Extracting ${selectedChat.name}...`);
    setResult('');
    setChatData([]);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');

      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'OPEN_AND_EXTRACT_CHAT',
        chatName: selectedChat.name,
      });

      if (response && response.success) {
        setChatData(response.data);
        setStatus(`Successfully extracted ${response.data.length} messages.`);
        setAppState('analyzing');
      } else {
        throw new Error(response?.error || 'Failed to extract chat.');
      }
    } catch (err: any) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
      setAppState('selected');
    }
  };

  const generateAIResponse = async () => {
    if (chatData.length === 0) return alert('No chat data to analyze.');
    setIsGenerating(true);
    setResult('');
    setStatus('Thinking...');

    try {
      let prompt = '';
      if (activeTab === 'summary') prompt = buildSummarizePrompt(chatData);
      else if (activeTab === 'qa') {
        if (!question.trim()) throw new Error('Please enter a question');
        prompt = buildQAPrompt(chatData, question);
      }
      else if (activeTab === 'custom') {
        if (!customPrompt.trim()) throw new Error('Please enter a custom prompt');
        prompt = buildCustomPrompt(chatData, customPrompt);
      }

      const response = await callOpenRouter(apiKey, geminiModel, prompt);
      setResult(response);
      setStatus('');
    } catch (e: any) {
      setStatus(`AI Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isWhatsApp) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <h2 style={{ marginBottom: '8px' }}>WhatsApp Web Only</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          WhatsGenie is designed to work exclusively with WhatsApp Web.
        </p>
        <button onClick={() => chrome.tabs.create({ url: 'https://web.whatsapp.com' })}>
          Open WhatsApp Web
        </button>
      </div>
    );
  }

  if (!isConfigured || showSettings) {
    return (
      <>
        <h1>⚙️ Settings</h1>
        <p className="subtitle">Configure WhatsGenie to get started</p>

        <div className="card">
          <label className="label">OpenRouter API Key</label>
          <input
            type="password"
            placeholder="sk-or-v1-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Get your free API key from OpenRouter.ai.
          </p>
          <label className="label" style={{marginTop: 12}}>AI Model</label>
          <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-lighter)', color: 'white', fontSize: '13px'}}>
            <option value="qwen/qwen3-next-80b-a3b-instruct:free">Qwen 3 Next 80B (Free)</option>
            <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (Free)</option>
            <option value="google/gemini-2.0-flash-lite-preview-02-05:free">Gemini 2.0 Flash Lite (Free)</option>
            <option value="google/gemini-2.5-flash-free">Gemini 2.5 Flash (Free)</option>
          </select>
        </div>

        <button onClick={saveApiKey}>Save Settings</button>
        {isConfigured && (
          <button style={{ marginTop: '8px', background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' }} onClick={() => setShowSettings(false)}>
            Cancel
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/icon/48.png" alt="WhatsGenie Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
          <span>WhatsGenie</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {appState === 'idle' && (
            <button className="icon-btn" onClick={injectSelectors}>
              <AddCircle size="24" color="var(--primary)" variant="Outline" />
            </button>
          )}
          <button className="icon-btn settings-btn" onClick={() => setShowSettings(true)}>
            <Setting2 size="20" color="currentColor" />
          </button>
        </div>
      </h1>

      {appState === 'idle' && (
        <div className="empty-state">
          <div className="empty-arrow">↗</div>
          <h3>No Extracted Chats!</h3>
          <p>Click the (+) button above to select a chat directly from your WhatsApp sidebar.</p>
        </div>
      )}

      {appState === 'selecting' && (
        <div className="empty-state">
          <h3>Select a Chat</h3>
          <p>A selector has been added to your WhatsApp chat list. Click one to continue.</p>
          <button style={{ marginTop: 16 }} className="outline-btn" onClick={removeSelectors}>Cancel</button>
        </div>
      )}

      {(appState === 'selected' || appState === 'extracting' || appState === 'analyzing') && selectedChat && (
        <>
          <p className="subtitle" style={{ marginBottom: 8 }}>Selected Chats</p>
          <div className="selected-card" style={{ marginBottom: 16 }}>
            <div className="selected-indicator">✔</div>
            {selectedChat.avatarUrl ? <img src={selectedChat.avatarUrl} className="avatar" /> : <div className="avatar fallback" />}
            <span className="chat-name">{selectedChat.name}</span>
            <div className="selected-indicator checked">✔</div>
          </div>

          {appState !== 'analyzing' && (
            <button onClick={triggerExtraction} disabled={appState === 'extracting'}>
              {appState === 'extracting' ? 'Extracting...' : 'Extract'}
            </button>
          )}

          {appState === 'selected' && (
            <div className="info-box" style={{ marginTop: 16 }}>
              <InfoCircle size="24" color="#1e40af" variant="Bold" style={{ flexShrink: 0 }} />
              <div>
                <strong>Having trouble with selection buttons?</strong>
                <p>If you don't see selection buttons on WhatsApp, please refresh the WhatsApp page and close and reopen this extension.</p>
              </div>
            </div>
          )}
        </>
      )}

      {appState === 'analyzing' && (
        <div className="card" style={{ marginTop: 16 }}>
          <button className="outline-btn" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', fontSize: '13px' }} onClick={() => { setAppState('idle'); setSelectedChat(null); setChatData([]); }}>
            <ArrowLeft2 size="16" color="currentColor" />
            Select Another Chat
          </button>
          <label className="label">AI Analysis</label>
          <div className="tabs">
            <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</div>
            <div className={`tab ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>Q&A</div>
            <div className={`tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>Custom</div>
          </div>

          {activeTab === 'summary' && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Generate a concise summary, key topics, and action items for the extracted chat.
            </p>
          )}
          {activeTab === 'qa' && (
            <input placeholder="Ask a question about this chat..." value={question} onChange={(e) => setQuestion(e.target.value)} />
          )}
          {activeTab === 'custom' && (
            <textarea placeholder="E.g., List all the movie recommendations mentioned..." rows={3} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />
          )}

          <button onClick={generateAIResponse} disabled={isGenerating}>
            {isGenerating ? 'Thinking...' : 'Generate Answer'}
          </button>
        </div>
      )}

      {status && <div className="status" style={{ marginTop: 16 }}>{status}</div>}
      {result && <div className="result">{result}</div>}
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
