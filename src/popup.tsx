import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import browser from 'webextension-polyfill';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// ── Types
interface HistoryItem {
  id: string;
  chat_name: string;
  summary: string;
  created_at: string;
}

// ── Lamp SVG
const LampIcon = () => (
  <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
    <defs>
      <linearGradient id="plg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7C3AED"/>
        <stop offset="100%" stopColor="#a78bfa"/>
      </linearGradient>
    </defs>
    <ellipse cx="40" cy="52" rx="22" ry="10" fill="url(#plg)" opacity="0.8"/>
    <path d="M24 52 C24 38, 30 28, 40 24 C50 28, 56 38, 56 52" fill="url(#plg)"/>
    <path d="M56 48 Q64 44, 68 38" stroke="#a78bfa" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <rect x="36" y="20" width="8" height="4" rx="2" fill="#a78bfa"/>
    <ellipse cx="40" cy="58" rx="18" ry="5" fill="#1a1a24" stroke="#7C3AED" strokeWidth="1"/>
  </svg>
);

function Popup() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [summaryCount, setSummaryCount] = useState(0);
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      // Check if we have Supabase config
      const items = await browser.storage.sync.get(['supabase_url', 'supabase_anon_key']);
      if (!items.supabase_url || !items.supabase_anon_key) {
        window.location.href = '../auth/login.html';
        return;
      }

      const sb = createClient(items.supabase_url as string, items.supabase_anon_key as string, {
        auth: {
          storage: {
            getItem: async (key: string) => {
              const result = await browser.storage.local.get(key);
              return result[key] ?? null;
            },
            setItem: async (key: string, value: string) => {
              await browser.storage.local.set({ [key]: value });
            },
            removeItem: async (key: string) => {
              await browser.storage.local.remove(key);
            },
          },
          autoRefreshToken: true,
          persistSession: true,
        },
      });
      setSupabase(sb);

      const { data: { session: sess } } = await sb.auth.getSession();
      if (!sess) {
        window.location.href = '../auth/login.html';
        return;
      }
      setSession(sess);

      // Check active tab
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      setIsWhatsApp(tab?.url?.includes('web.whatsapp.com') ?? false);

      // Load stats
      const { count } = await sb
        .from('history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', sess.user.id);
      setSummaryCount(count ?? 0);

      const { data: recent } = await sb
        .from('history')
        .select('id, chat_name, summary, created_at')
        .eq('user_id', sess.user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      setRecentItems((recent as HistoryItem[]) || []);
    } catch (err) {
      console.error('Popup init error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openSidebar() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.runtime.sendMessage({ action: 'INJECT_SIDEBAR' });
      window.close();
    }
  }

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await browser.storage.local.clear();
    window.location.href = '../auth/login.html';
  }

  function getInitial(name?: string): string {
    return name?.charAt(0)?.toUpperCase() || '?';
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  function truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  if (loading) {
    return (
      <>
        <div className="header">
          <div className="header-left"><LampIcon /><span>Genie</span></div>
          <div className="avatar-placeholder" style={{ opacity: 0.3 }}>?</div>
        </div>
        <div className="status-section">
          <div className="skeleton" style={{ width: '160px', height: '32px', borderRadius: '20px' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '48px', borderRadius: '12px' }}></div>
        </div>
        <div className="stats-row">
          <div className="stat"><div className="skeleton" style={{ width: '40px', height: '28px', margin: '0 auto 4px' }}></div><div className="skeleton" style={{ width: '80px', height: '12px', margin: '0 auto' }}></div></div>
          <div className="stat"><div className="skeleton" style={{ width: '40px', height: '28px', margin: '0 auto 4px' }}></div><div className="skeleton" style={{ width: '80px', height: '12px', margin: '0 auto' }}></div></div>
        </div>
        <div className="recent-section">
          <div className="skeleton" style={{ width: '120px', height: '12px', marginBottom: '12px' }}></div>
          {[1,2].map(i => (
            <div className="skeleton-card" key={i}>
              <div className="skeleton skeleton-line" style={{ width: '70%' }}></div>
              <div className="skeleton skeleton-line" style={{ width: '90%' }}></div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <LampIcon />
          <span>Genie</span>
        </div>
        <div className="avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          {session?.user?.user_metadata?.avatar_url ? (
            <img src={session.user.user_metadata.avatar_url} alt="" />
          ) : (
            <div className="avatar-placeholder">
              {getInitial(session?.user?.user_metadata?.full_name || session?.user?.email)}
            </div>
          )}
          <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
            <button onClick={() => browser.tabs.create({ url: browser.runtime.getURL('src/settings/settings.html') })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Settings
            </button>
            <button className="danger" onClick={handleSignOut}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="status-section">
        <div className={`status-pill ${isWhatsApp ? 'status-connected' : 'status-disconnected'}`}>
          <span className="status-dot"></span>
          {isWhatsApp ? 'Connected to WhatsApp Web' : 'Open WhatsApp Web first'}
        </div>
        <button className="btn-sidebar" onClick={openSidebar} disabled={!isWhatsApp}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
          Open Genie Sidebar
        </button>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat">
          <div className="stat-value">{summaryCount}</div>
          <div className="stat-label">summaries</div>
        </div>
        <div className="stat">
          <div className="stat-value">{recentItems.length}</div>
          <div className="stat-label">recent</div>
        </div>
      </div>

      {/* Recent */}
      <div className="recent-section">
        <h3>Recent Summaries</h3>
        {recentItems.length === 0 ? (
          <div className="empty-state">No summaries yet. Open the sidebar to get started.</div>
        ) : (
          recentItems.map(item => (
            <div className="summary-card" key={item.id}>
              <div className="summary-header">
                <span className="summary-name">{item.chat_name}</span>
                <span className="summary-date">{formatDate(item.created_at)}</span>
              </div>
              <div className="summary-preview">{truncate(item.summary || '', 80)}</div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bottom-nav">
        <button className="nav-btn" onClick={() => browser.tabs.create({ url: browser.runtime.getURL('src/settings/settings.html') })}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          Settings
        </button>
        <button className="nav-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Prompts
        </button>
        <button className="nav-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          History
        </button>
      </div>
    </>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
