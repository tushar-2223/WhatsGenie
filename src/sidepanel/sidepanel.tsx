import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AddCircle, Setting2, ArrowLeft2, InfoCircle, Refresh2 } from 'iconsax-react';
import { callGroq, buildSummarizePrompt, buildQAPrompt, buildCustomPrompt, ChatMessage } from '../lib/groq';
import { DEFAULT_GROQ_MODEL, GROQ_API_KEY } from '../lib/config';

type AppState = 'idle' | 'selecting' | 'selected' | 'extracting' | 'analyzing';

interface SelectedChat {
  name: string;
  avatarUrl: string;
  selectedAt?: number;
}

function App() {
  const [apiKey, setApiKey] = useState(GROQ_API_KEY || '');
  const [groqModel, setGroqModel] = useState(DEFAULT_GROQ_MODEL);
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isWhatsApp, setIsWhatsApp] = useState(true);

  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);

  const [chatData, setChatData] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState('');

  const [activeTab, setActiveTab] = useState<'summary' | 'qa' | 'custom'>('summary');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [question, setQuestion] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    const checkIfWhatsApp = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setIsWhatsApp(Boolean(tab?.url?.includes('web.whatsapp.com')));
    };

    checkIfWhatsApp();
    chrome.tabs.onActivated.addListener(checkIfWhatsApp);
    chrome.tabs.onUpdated.addListener(checkIfWhatsApp);

    chrome.storage.local.get(['groq_api_key', 'groq_model']).then((res) => {
      if (res.groq_model) setGroqModel(res.groq_model as string);
      if (res.groq_api_key) {
        setApiKey(res.groq_api_key as string);
        setIsConfigured(true);
      } else if (GROQ_API_KEY) {
        setIsConfigured(true);
      }
    });

    chrome.storage.local.get(['wg_selected_chat']).then(async (res) => {
      const storedChat = res.wg_selected_chat as SelectedChat | undefined;
      if (!storedChat) return;

      const isRecentSelection =
        typeof storedChat.selectedAt === 'number' && Date.now() - storedChat.selectedAt < 30_000;

      if (isRecentSelection) {
        setSelectedChat(storedChat);
        setAppState('selected');
        return;
      }

      await chrome.storage.local.remove('wg_selected_chat');
    });

    const messageListener = (msg: any) => {
      if (msg.type === 'CHAT_SELECTED') {
        setSelectedChat(msg.data as SelectedChat);
        setAppState('selected');
        setStatus('');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.trim()) return alert('Please enter a valid API key');
    await chrome.storage.local.set({
      groq_api_key: apiKey.trim(),
      groq_model: groqModel,
    });
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

  const clearSelectionState = async () => {
    await chrome.storage.local.remove('wg_selected_chat');
    setSelectedChat(null);
    setChatData([]);
    setResult('');
    setStatus('');
  };

  const removeSelectors = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });
    }
    await clearSelectionState();
    setAppState('idle');
  };

  const goBackToSelection = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });
    }

    await clearSelectionState();
    setAppState('selecting');

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'INJECT_SELECTORS' });
    }
  };

  const goHome = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });
    }

    await clearSelectionState();
    setShowSettings(false);
    setAppState('idle');
  };

  const triggerExtraction = async (mode: 'extract' | 'sync' = 'extract') => {
    if (!selectedChat) return;

    setAppState('extracting');
    setStatus(`${mode === 'sync' ? 'Syncing' : 'Extracting'} ${selectedChat.name}...`);
    setResult('');
    if (mode === 'extract') {
      setChatData([]);
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');

      chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_SELECTORS' });

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'OPEN_AND_EXTRACT_CHAT',
        chatName: selectedChat.name,
      });

      if (response?.success) {
        setChatData(response.data);
        setStatus(
          `${mode === 'sync' ? 'Synced' : 'Loaded'} ${response.data.length} messages from the open chat.`
        );
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

      if (activeTab === 'summary') {
        prompt = buildSummarizePrompt(chatData);
      } else if (activeTab === 'qa') {
        if (!question.trim()) throw new Error('Please enter a question');
        prompt = buildQAPrompt(chatData, question);
      } else {
        if (!customPrompt.trim()) throw new Error('Please enter a custom prompt');
        prompt = buildCustomPrompt(chatData, customPrompt);
      }

      const response = await callGroq(apiKey, groqModel, prompt);
      setResult(response);
      setStatus('');
    } catch (e: any) {
      setStatus(`AI Error: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHeroAvatar = () => {
    if (selectedChat?.avatarUrl) {
      return <img src={selectedChat.avatarUrl} className="hero-avatar" alt="" />;
    }

    const initial = selectedChat?.name?.slice(0, 1)?.toUpperCase() || 'W';
    return <div className="hero-avatar fallback">{initial}</div>;
  };

  const renderExtractedMessages = () => {
    if (chatData.length === 0) return null;

    return (
      <div className="content-card transcript-card">
        <div className="transcript-header">
          <span className="selected-card-badge">Extracted Chat</span>
          <span className="transcript-count">{chatData.length} messages</span>
        </div>

        <div className="transcript-list">
          {chatData.map((message, index) => (
            <div className="transcript-item" key={`${message.time}-${message.sender}-${index}`}>
              <div className="transcript-meta">
                <span className="transcript-sender">{message.sender}</span>
                <span className="transcript-time">{message.time}</span>
              </div>
              <div className="transcript-text">{message.text || 'Media or unsupported message'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTopBar = (showAddButton = true) => (
    <div className="app-header">
      <div className="brand-pill">
        <button className="brand-home-btn" onClick={goHome} aria-label="Go to home screen">
          <img src="/icon/48.png" alt="WhatsGenie Logo" className="brand-logo" />
          <span>WhatsGenie</span>
        </button>
      </div>
      <div className="header-actions">
        {showAddButton && appState === 'idle' && (
          <button className="icon-btn" onClick={injectSelectors} aria-label="Select chat">
            <AddCircle size="18" color="currentColor" variant="Outline" />
          </button>
        )}
        {selectedChat && (appState === 'selected' || appState === 'extracting' || appState === 'analyzing') && (
          <button
            className={`icon-btn ${appState === 'extracting' ? 'syncing' : ''}`}
            onClick={() => triggerExtraction('sync')}
            disabled={appState === 'extracting'}
            aria-label="Sync current chat"
            title="Sync current chat"
          >
            <Refresh2 size="18" color="currentColor" />
          </button>
        )}
        <button className="icon-btn settings-btn" onClick={() => setShowSettings(true)} aria-label="Open settings">
          <Setting2 size="18" color="currentColor" />
        </button>
      </div>
    </div>
  );

  if (!isWhatsApp) {
    return (
      <div className="panel-shell">
        <div className="panel-card panel-card-centered">
          {renderTopBar(false)}
          <div className="panel-divider"></div>
          <div className="hero-avatar fallback">W</div>
          <h2 className="hero-title">WhatsApp Web Only</h2>
          <p className="hero-subtitle">
            Open WhatsApp Web in this window to select a chat, load the full history, and run AI analysis.
          </p>
          <button className="primary-cta" onClick={() => chrome.tabs.create({ url: 'https://web.whatsapp.com' })}>
            Open WhatsApp Web
          </button>
        </div>
      </div>
    );
  }

  if (!isConfigured || showSettings) {
    return (
      <div className="panel-shell">
        <div className="panel-card">
          {renderTopBar(false)}
          <div className="panel-divider"></div>

          <div className="panel-title-block">
            <h1>Settings</h1>
            <p className="subtitle">Configure your Groq key and model before you start extracting chats.</p>
          </div>

          <div className="content-card settings-card">
            <label className="label">Groq API Key</label>
            <input
              type="password"
              placeholder="gsk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="helper-text">Use your Groq key to power summaries, Q&amp;A, and custom prompts.</p>

            <label className="label field-gap">AI Model</label>
            <select value={groqModel} onChange={(e) => setGroqModel(e.target.value)}>
              <option value="openai/gpt-oss-120b">OpenAI GPT-OSS 120B</option>
            </select>
          </div>

          <button className="primary-cta" onClick={saveApiKey}>Save Settings</button>
          {isConfigured && (
            <button className="secondary-cta" onClick={() => setShowSettings(false)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="panel-shell">
      <div className="panel-card">
        {renderTopBar(true)}
        <div className="panel-divider"></div>

        {appState === 'idle' && (
          <div className="empty-state">
            <div className="empty-arrow">+</div>
            <h3>No Extracted Chats Yet</h3>
            <p>Click the plus button above to show selector markers in WhatsApp and choose the chat you want to extract.</p>
          </div>
        )}

        {appState === 'selecting' && (
          <div className="state-panel">
            <div className="hero-avatar fallback">WG</div>
            <h2 className="hero-title">Select a Chat</h2>
            <p className="hero-subtitle">
              The selector markers are now visible in the WhatsApp sidebar. Click the chat row you want to open and extract.
            </p>
            <button className="secondary-cta visible-cta" onClick={removeSelectors}>Cancel</button>
          </div>
        )}

        {(appState === 'selected' || appState === 'extracting' || appState === 'analyzing') && selectedChat && (
          <>
            <button
              className="secondary-cta inline-reset"
              onClick={goBackToSelection}
              disabled={appState === 'extracting'}
            >
              <ArrowLeft2 size="16" color="currentColor" />
              Select Another Chat
            </button>

            <div className="chat-hero">
              {renderHeroAvatar()}
              <h2 className="hero-title compact">{selectedChat.name}</h2>
            </div>

            <div className="content-card selected-card">
              <div className="selected-card-body">
                {selectedChat.avatarUrl ? <img src={selectedChat.avatarUrl} className="avatar" alt="" /> : <div className="avatar fallback" />}
                <div className="chat-meta">
                  <span className="chat-name">{selectedChat.name}</span>
                </div>
              </div>
            </div>

            {renderExtractedMessages()}

            {appState !== 'analyzing' && (
              <button className="primary-cta" onClick={() => triggerExtraction('extract')} disabled={appState === 'extracting'}>
                {appState === 'extracting' ? 'Extracting...' : 'Extract'}
              </button>
            )}

            {appState === 'selected' && (
              <div className="info-box">
                <InfoCircle size="20" color="#1e40af" variant="Bold" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Selection Tip</strong>
                  <p>Click the actual WhatsApp chat row after pressing the add button. The marker is only a visual guide.</p>
                </div>
              </div>
            )}
          </>
        )}

        {appState === 'analyzing' && (
          <div className="content-card analysis-card">
            <label className="label">AI Analysis</label>
            <div className="tabs segmented-tabs">
              <div className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>Summary</div>
              <div className={`tab ${activeTab === 'qa' ? 'active' : ''}`} onClick={() => setActiveTab('qa')}>Q&A</div>
              <div className={`tab ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>Custom</div>
            </div>

            {activeTab === 'summary' && (
              <p className="helper-text section-gap">
                Generate a concise summary, key topics, and action items for the extracted chat.
              </p>
            )}

            {activeTab === 'qa' && (
              <input
                placeholder="Ask a question about this chat..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            )}

            {activeTab === 'custom' && (
              <textarea
                placeholder="E.g., List all the movie recommendations mentioned..."
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            )}

            <button className="primary-cta" onClick={generateAIResponse} disabled={isGenerating}>
              {isGenerating ? 'Thinking...' : 'Generate Answer'}
            </button>
          </div>
        )}

        {status && <div className="status-banner">{status}</div>}
        {result && <div className="result content-card">{result}</div>}
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
