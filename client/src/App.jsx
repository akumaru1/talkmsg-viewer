import { useState, useEffect, useCallback, useRef } from 'react';
import Hub from './components/Hub.jsx';
import ChatView from './components/ChatView.jsx';
import MediaGallery from './components/MediaGallery.jsx';

const PAGE_SIZE = 100;

export default function App() {
  const [members,         setMembers]         = useState([]);
  const [membersLoading,  setMembersLoading]  = useState(true);

  // Navigation state
  const [view,            setView]            = useState('hub'); // 'hub' | 'chat' | 'gallery'
  const [selectedMember,  setSelectedMember]  = useState(null);

  // Messages for the currently selected member
  const [messages,        setMessages]        = useState([]);
  const [msgLoading,      setMsgLoading]      = useState(false);
  const [loadingOlder,    setLoadingOlder]    = useState(false);
  const [loadingNewer,    setLoadingNewer]    = useState(false);
  const [hasMore,         setHasMore]         = useState(false);
  const [hasNewer,        setHasNewer]        = useState(false);
  const [totalMessages,   setTotalMessages]   = useState(0);

  // Track current offset (how many messages from the top of the file we've fetched)
  const offsetRef = useRef(0);
  // Tracks the smallest file-array index we've loaded (0 = all-newest loaded, >0 = newer msgs exist)
  const newerOffsetRef = useRef(0);
  // Prevent duplicate concurrent requests
  const fetchingRef = useRef(false);

  // ── Load members index on mount ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load members:', err))
      .finally(() => setMembersLoading(false));
  }, []);

  // ── Android back-button support (History API) ────────────────────────────
  useEffect(() => {
    // Seed the base history entry so the hub always has an entry to fall back to
    history.replaceState({ view: 'hub' }, '');

    const handlePopState = (e) => {
      const target = e.state?.view ?? 'hub';
      setView(target);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ── Fetch one page from the server ───────────────────────────────────────
  const fetchPage = useCallback(async (dataFile, offset) => {
    const url = `/api/messages/${encodeURIComponent(dataFile)}?offset=${offset}&limit=${PAGE_SIZE}`;
    const r   = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json(); // { messages, total, offset, limit, hasMore }
  }, []);

  // ── Initial load when a member is selected ───────────────────────────────
  const loadMember = useCallback(async (member) => {
    setSelectedMember(member);
    setMessages([]);
    setHasMore(false);
    setTotalMessages(0);
    setMsgLoading(true);
    setView('chat');
    offsetRef.current   = 0;
    newerOffsetRef.current = 0;
    fetchingRef.current = false;

    try {
      const data = await fetchPage(member.data_file, 0);
      offsetRef.current = PAGE_SIZE;
      setMessages(data.messages);      // chronological order within the batch
      setHasMore(data.hasMore);
      setHasNewer(false);              // initial load starts from newest end
      setTotalMessages(data.total);
      // Push a history entry so the Android back button returns to hub
      history.pushState({ view: 'chat' }, '');
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMsgLoading(false);
    }
  }, [fetchPage]);

  // ── Load older messages (called when user scrolls to top) ────────────────
  const loadOlderMessages = useCallback(async () => {
    if (!selectedMember || !hasMore || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoadingOlder(true);

    try {
      const data = await fetchPage(selectedMember.data_file, offsetRef.current);
      offsetRef.current += PAGE_SIZE;
      // Prepend older messages at the top, keeping chronological order
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      fetchingRef.current = false;
      setLoadingOlder(false);
    }
  }, [selectedMember, hasMore, fetchPage]);
  // ── Load newer messages (called when user scrolls to bottom past loaded window) ──
  const loadNewerMessages = useCallback(async () => {
    if (!selectedMember || !hasNewer || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoadingNewer(true);

    try {
      const newStart = Math.max(0, newerOffsetRef.current - PAGE_SIZE);
      const count    = newerOffsetRef.current - newStart; // items we actually want
      const data     = await fetchPage(selectedMember.data_file, newStart);
      // fetchPage returns chronological order; the LAST `count` items correspond
      // to file-indices newStart..newerOffsetRef-1 (the newest in the batch)
      const newerMessages = data.messages.slice(-count);
      newerOffsetRef.current = newStart;
      setHasNewer(newStart > 0);
      // Append to end — these are newer than everything currently loaded
      setMessages(prev => [...prev, ...newerMessages]);
    } catch (err) {
      console.error('Failed to load newer messages:', err);
    } finally {
      fetchingRef.current = false;
      setLoadingNewer(false);
    }
  }, [selectedMember, hasNewer, fetchPage]);
  // ── Jump to a specific month (loads the right batch, then scroll) ─────────
  const jumpToMonth = useCallback(async (yyyymm) => {
    if (!selectedMember) return;

    try {
      // Ask the server for the best offset so the month appears at the top
      const r = await fetch(
        `/api/offset/${encodeURIComponent(selectedMember.data_file)}?month=${yyyymm}&limit=${PAGE_SIZE}`
      );
      const { offset } = await r.json();

      // Reset message state and load the targeted batch
      setMessages([]);
      setHasMore(false);
      setHasNewer(false);
      setMsgLoading(true);
      offsetRef.current      = 0;
      newerOffsetRef.current = 0;
      fetchingRef.current    = false;

      const data = await fetchPage(selectedMember.data_file, offset);
      offsetRef.current      = offset + PAGE_SIZE;
      newerOffsetRef.current = offset; // file indices 0..offset-1 are newer, not yet loaded
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setHasNewer(offset > 0);         // true whenever we didn't start from the newest end
      setTotalMessages(data.total);
    } catch (err) {
      console.error('Failed to jump to month:', err);
    } finally {
      setMsgLoading(false);
    }
  }, [selectedMember, fetchPage]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const goHub     = () => { history.replaceState({ view: 'hub' }, '');  setView('hub'); };
  const goChat    = () => { history.replaceState({ view: 'chat' }, ''); setView('chat'); };
  const goGallery = () => { history.pushState({ view: 'gallery' }, ''); setView('gallery'); };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {view === 'hub' && (
        <Hub
          members={members}
          loading={membersLoading}
          onSelectMember={loadMember}
        />
      )}

      {(view === 'chat' || view === 'gallery') && selectedMember && (
        <>
          {view === 'chat' && (
            <ChatView
              member={selectedMember}
              messages={messages}
              loading={msgLoading}
              loadingOlder={loadingOlder}
              loadingNewer={loadingNewer}
              hasMore={hasMore}
              hasNewer={hasNewer}
              totalMessages={totalMessages}
              onLoadOlder={loadOlderMessages}
              onLoadNewer={loadNewerMessages}
              onJumpToMonth={jumpToMonth}
              onBack={goHub}
              onGallery={goGallery}
            />
          )}
          {view === 'gallery' && (
            <MediaGallery
              member={selectedMember}
              messages={messages}
              loading={msgLoading}
              loadingOlder={loadingOlder}
              loadingNewer={loadingNewer}
              hasMore={hasMore}
              hasNewer={hasNewer}
              totalMessages={totalMessages}
              onLoadOlder={loadOlderMessages}
              onLoadNewer={loadNewerMessages}
              onJumpToMonth={jumpToMonth}
              onBack={goChat}
            />
          )}
        </>
      )}

    </div>
  );
}
