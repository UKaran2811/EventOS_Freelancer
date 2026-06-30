import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  Send, 
  Plus, 
  ArrowLeft, 
  Upload, 
  Bell, 
  ChevronLeft, 
  X, 
  User, 
  Users,
  Phone,
  Copy,
  Database, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  Sparkles,
  Check,
  Smartphone,
  Server,
  CloudLightning,
  Hash,
  ArrowUpRight,
  Menu,
  MessageSquare,
  Activity,
  Layers,
  Paperclip,
  Download,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Event, ChatMessage, Resource, Notification } from './types';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<'home' | 'tasks' | 'chat' | 'resources' | 'notifs'>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Full-Stack Server State
  const [state, setState] = useState<{
    checkInStatus: { checkedIn: boolean; checkInTime: string | null };
    event: Event | null;
    tasks: Task[];
    chat: ChatMessage[];
    resources: Resource[];
    notifications: Notification[];
  }>({
    checkInStatus: { checkedIn: false, checkInTime: null },
    event: null,
    tasks: [],
    chat: [],
    resources: [],
    notifications: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Never');

  // Input States
  const [chatMessage, setChatMessage] = useState('');
  const [newSubtaskTexts, setNewSubtaskTexts] = useState<Record<string, string>>({});
  const [addingSubtaskId, setAddingSubtaskId] = useState<string | null>(null);
  const [delayReportingTaskId, setDelayReportingTaskId] = useState<string | null>(null);
  const [delaySummary, setDelaySummary] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [checkingInStatus, setCheckingInStatus] = useState<'idle' | 'checking' | 'done'>('idle');

  // Filter States
  const [taskFilter, setTaskFilter] = useState<'all' | 'ongoing' | 'pending' | 'done'>('all');

  // Refs for Chat Auto-scroll
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load state from fullstack Express backend
  const fetchState = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setState(data);
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setError(null);
    } catch (e: any) {
      console.error("Error connecting to backend API:", e);
      setSyncStatus('error');
      setError("Cannot sync with server. Check database connection.");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch + interval polling (every 3 seconds for active chats/coordination)
  useEffect(() => {
    fetchState(true);
    const interval = setInterval(() => {
      fetchState(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat to bottom when messages list changes
  useEffect(() => {
    if (currentTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.chat, currentTab]);

  // Event Handlers
  const handleCheckIn = async () => {
    if (checkingInStatus !== 'idle') return;
    setCheckingInStatus('checking');
    
    // Simulate location verification lag
    setTimeout(async () => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedIn: true, time }),
        });
        if (res.ok) {
          const result = await res.json();
          setState(result.state);
          setCheckingInStatus('done');
        }
      } catch (e) {
        console.error("Check-in request failed:", e);
        setCheckingInStatus('idle');
      }
    }, 1200);
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, currentChecked: boolean) => {
    // Optimistic Update
    const updatedTasks = state.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, checked: !currentChecked } : s)
        };
      }
      return t;
    });
    setState(prev => ({ ...prev, tasks: updatedTasks }));

    try {
      const res = await fetch('/api/subtask/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, subtaskId, checked: !currentChecked }),
      });
      if (res.ok) {
        const result = await res.json();
        setState(result.state);
      }
    } catch (e) {
      console.error("Failed to toggle subtask on backend:", e);
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    const text = newSubtaskTexts[taskId]?.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/subtask/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, name: text, assignedTo: "Rahul" }),
      });
      if (res.ok) {
        const result = await res.json();
        setState(result.state);
        setNewSubtaskTexts(prev => ({ ...prev, [taskId]: '' }));
        setAddingSubtaskId(null);
      }
    } catch (e) {
      console.error("Failed to add subtask:", e);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const res = await fetch('/api/task/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      });
      if (res.ok) {
        const result = await res.json();
        setState(result.state);
        if (status !== 'delayed') {
          setDelayReportingTaskId(null);
        }
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleSubmitDelayReport = async (taskId: string) => {
    if (!delaySummary.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await fetch('/api/task/delay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, summary: delaySummary.trim(), time }),
      });
      if (res.ok) {
        const result = await res.json();
        setState(result.state);
        setDelaySummary('');
        setDelayReportingTaskId(null);
      }
    } catch (e) {
      console.error("Failed to report delay:", e);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const text = chatMessage.trim();
    setChatMessage(''); // Clear input instantly for snappy typing experience
    
    // Optimistic Update
    const tempMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      sender: "Rahul Kapoor",
      avatar: "RK",
      role: "Production",
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderId: "rk",
    };
    setState(prev => ({ ...prev, chat: [...prev.chat, tempMsg] }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, time: tempMsg.time }),
      });
      if (res.ok) {
        const result = await res.json();
        setState(result.state);
      }
    } catch (e) {
      console.error("Failed to post chat message:", e);
    }
  };

  // Mock upload logic that registers a real metadata object to the Express backend database
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: 'pdf' | 'doc' | 'img' = 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      type = 'img';
    } else if (['doc', 'docx', 'txt', 'xls', 'xlsx'].includes(extension || '')) {
      type = 'doc';
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " · Just now";

    // Call backend
    fetch('/api/resource/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, type, size: sizeStr, time }),
    })
    .then(res => res.json())
    .then(result => {
      setState(result.state);
    })
    .catch(err => console.error("Error registering uploaded resource:", err));
  };

  const triggerUploadInput = () => {
    fileInputRef.current?.click();
  };

  // Filter Tasks based on tab filters
  const filteredTasks = state.tasks.filter(task => {
    if (taskFilter === 'all') return true;
    return task.status === taskFilter;
  });

  const unreadNotifCount = state.notifications.length;
  const pendingTasksCount = state.tasks.filter(t => t.status !== 'done').length;

  return (
    <div className="min-h-screen bg-[#050508] text-[#F2EFFC] font-dmsans selection:bg-[#FF5A1F] selection:text-white flex flex-col lg:flex-row relative overflow-hidden">
      
      {/* ── BACKGROUND LIGHT ACCENTS ── */}
      <div className="absolute top-[-5%] left-[-5%] w-[50%] h-[50%] rounded-full bg-[#FF5A1F] opacity-[0.03] blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] rounded-full bg-blue-500 opacity-[0.03] blur-[150px] pointer-events-none z-0" />

      {/* ── MOBILE / TABLET HEADER ── */}
      <header className="lg:hidden h-16 border-b border-white/5 bg-[#08080C] px-4 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FF5A1F] to-amber-500 flex items-center justify-center shadow-md">
            <CloudLightning className="w-4 h-4 text-white" />
          </div>
          <span className="text-md font-extrabold font-syne tracking-tight">
            Event<span className="text-[#FF5A1F]">OS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick sync status indicator */}
          <span className="flex items-center gap-1.5 text-xs bg-white/5 px-2 py-1 rounded-lg">
            <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[10px] text-[#82809A] font-bold">LIVE</span>
          </span>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#F2EFFC] hover:bg-white/10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── MAIN SIDEBAR (DESKTOP FIXED & MOBILE OFF-CANVAS BACKDROP) ── */}
      <AnimatePresence>
        {(mobileMenuOpen || true) && (
          <motion.aside 
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className={`w-[290px] bg-[#08080C] border-r border-white/5 flex flex-col justify-between shrink-0 z-30 
              lg:flex lg:translate-x-0 lg:opacity-100 lg:relative fixed top-16 bottom-0 left-0 lg:top-0 h-[calc(100vh-64px)] lg:h-screen
              ${mobileMenuOpen ? 'block' : 'hidden lg:flex'}
            `}
          >
            {/* Top Workspace Section */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
              
              {/* App Brand Identity (Desktop Only) */}
              <div className="hidden lg:flex items-center gap-3 py-1.5 border-b border-white/5 pb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5A1F] to-amber-500 flex items-center justify-center shadow-lg shadow-[#FF5A1F]/20">
                  <CloudLightning className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight font-syne text-[#F2EFFC]">
                    Event<span className="text-[#FF5A1F]">OS</span>
                  </h1>
                  <p className="text-[10px] text-[#82809A] uppercase tracking-wider font-bold">Freelancer Core</p>
                </div>
              </div>

              {/* Event Spotlight Card */}
              <div 
                className="p-4 rounded-xl bg-[#0E0E14] border border-white/5 space-y-2 shadow-md cursor-help"
                title={`Client: ${state.event?.client || "Mehta Family"} | Staff: ${state.event?.checkedInCount || 0}/${state.event?.totalStaff || 9} present`}
              >
                <div className="flex items-center justify-between text-[10px] font-extrabold text-[#82809A] uppercase tracking-widest">
                  <span className="flex items-center gap-1.5 truncate">
                    <Calendar className="w-3.5 h-3.5 text-[#FF5A1F]" /> {state.event?.name || "Sharma Wedding"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FF5A1F]/15 text-[#FF5A1F] tracking-widest animate-pulse uppercase shrink-0">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-[#82809A] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#FF5A1F]" /> {state.event?.venue || "Racecourse Club, Rajkot"}
                </p>
              </div>

              {/* Custom Navigation Menu */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-extrabold text-[#82809A] tracking-wider uppercase px-2.5 mb-2">Workspace Controls</h4>
                
                {/* Home navigation item */}
                <button 
                  onClick={() => { setCurrentTab('home'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    currentTab === 'home' 
                      ? 'bg-gradient-to-r from-[#FF5A1F]/15 to-transparent text-[#FF5A1F] border-l-3 border-[#FF5A1F]' 
                      : 'text-[#82809A] hover:text-[#F2EFFC] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Home Briefing</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A1F]" />
                </button>

                {/* Tasks navigation item */}
                <button 
                  onClick={() => { setCurrentTab('tasks'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    currentTab === 'tasks' 
                      ? 'bg-gradient-to-r from-[#FF5A1F]/15 to-transparent text-[#FF5A1F] border-l-3 border-[#FF5A1F]' 
                      : 'text-[#82809A] hover:text-[#F2EFFC] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Active Workflow</span>
                  </div>
                  {pendingTasksCount > 0 && (
                    <span className="text-[10px] bg-[#3B82F6]/10 text-[#3B82F6] font-bold px-1.5 py-0.5 rounded-md">
                      {pendingTasksCount}
                    </span>
                  )}
                </button>

                {/* Chat navigation item */}
                <button 
                  onClick={() => { setCurrentTab('chat'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    currentTab === 'chat' 
                      ? 'bg-gradient-to-r from-[#FF5A1F]/15 to-transparent text-[#FF5A1F] border-l-3 border-[#FF5A1F]' 
                      : 'text-[#82809A] hover:text-[#F2EFFC] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>Group Coordination</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-[#10B981] font-bold px-1.5 py-0.5 rounded-md">Team</span>
                </button>

                {/* Resources navigation item */}
                <button 
                  onClick={() => { setCurrentTab('resources'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    currentTab === 'resources' 
                      ? 'bg-gradient-to-r from-[#FF5A1F]/15 to-transparent text-[#FF5A1F] border-l-3 border-[#FF5A1F]' 
                      : 'text-[#82809A] hover:text-[#F2EFFC] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" />
                    <span>Resource Vault</span>
                  </div>
                  <span className="text-[10px] text-[#82809A] font-mono">{state.resources.length} files</span>
                </button>

                {/* Notifications navigation item */}
                <button 
                  onClick={() => { setCurrentTab('notifs'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    currentTab === 'notifs' 
                      ? 'bg-gradient-to-r from-[#FF5A1F]/15 to-transparent text-[#FF5A1F] border-l-3 border-[#FF5A1F]' 
                      : 'text-[#82809A] hover:text-[#F2EFFC] hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>System Broadcasts</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="text-[10px] bg-red-500/15 text-red-400 font-extrabold px-1.5 py-0.5 rounded-md">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Server Database Synchronization Block */}
              <div 
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between shadow-md cursor-help"
                title={`Engine: data.json | Last Saved: ${lastSyncTime}`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#82809A]">
                  <Database className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Synced</span>
                </div>
                <button 
                  onClick={() => fetchState(true)}
                  className="p-1 rounded bg-white/5 hover:bg-white/10 active:scale-95 transition"
                  title="Force refresh database status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#F2EFFC] ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                </button>
              </div>

            </div>

            {/* Bottom Freelancer Profile section */}
            <div className="p-4 border-t border-white/5 bg-[#050508] flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-br from-[#FF5A1F] to-purple-600 text-white font-extrabold text-xs flex items-center justify-center border border-white/10 shadow-md">
                  RK
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F2EFFC]">Rahul Kapoor</h4>
                  <p className="text-[10px] text-[#82809A]">Lead production staff</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-[#10B981] font-bold px-1.5 py-0.5 rounded">
                <Check className="w-3 h-3" /> GPS
              </span>
            </div>

          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── MAIN WORKSPACE CONTENT WINDOW ── */}
      <main className="flex-1 flex flex-col min-w-0 z-10 overflow-y-auto lg:h-screen">
        
        {/* Workspace Top Action Bar (Desktop-only header, beautifully spaced) */}
        <section className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-white/5 bg-[#08080C]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#82809A]">
              {currentTab === 'home' && "Workspace Dashboard"}
              {currentTab === 'tasks' && "Tactical Tasks & Subtasks"}
              {currentTab === 'chat' && "Event Crew Directory"}
              {currentTab === 'resources' && "Project Reference Library"}
              {currentTab === 'notifs' && "Live Broadcast Feed"}
            </h2>
            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="text-xs text-[#82809A] font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF5A1F]" /> Today is June 28, 2026
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Arrival Checkin Quick status widget */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border transition ${
              state.checkInStatus.checkedIn 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-[#10B981]' 
                : 'bg-[#FF5A1F]/10 border-[#FF5A1F]/20 text-[#FF5A1F]'
            }`}>
              <span className="text-xs font-bold">
                {state.checkInStatus.checkedIn 
                  ? `Checked In at ${state.checkInStatus.checkInTime}` 
                  : "Arrival Check-In Missing"}
              </span>
              {!state.checkInStatus.checkedIn ? (
                <button 
                  onClick={handleCheckIn}
                  disabled={checkingInStatus !== 'idle'}
                  className="px-2.5 py-1 bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition shadow-sm"
                >
                  {checkingInStatus === 'idle' ? 'Check In' : checkingInStatus === 'checking' ? 'Verifying...' : 'Done'}
                </button>
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981]">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
              )}
            </div>

            <span className="w-[1px] h-6 bg-white/10" />

            {/* active staff count badge */}
            <div className="text-xs text-[#82809A] font-bold bg-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>{state.event?.checkedInCount || 8}/{state.event?.totalStaff || 9} Online</span>
            </div>
          </div>
        </section>

        {/* Dynamic Warning Alert banner if Server Sync error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* ── WORKSPACE CORE SCREENS VIEWPORTS ── */}
        <section className="flex-1 p-4 pb-24 lg:pb-8 lg:p-8 overflow-y-auto min-h-0 relative">
          
          {/* ── HOME BRIEFING TAB VIEW ── */}
          {currentTab === 'home' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Dynamic Welcome and Urgent Alert Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Arrival Checkin Main Promo box for mobile */}
                <div 
                  className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-[#161622] to-[#0E0E14] border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-lg cursor-help"
                  title={`Assigned to Production Department. Use this screen to coordinate duties, download schematics, and view crew details.`}
                >
                  <div className="absolute right-0 bottom-0 w-48 h-48 bg-[#FF5A1F] opacity-[0.03] blur-[60px] pointer-events-none" />
                  
                  <div className="space-y-1 z-10">
                    <span className="px-2 py-0.5 rounded bg-[#FF5A1F]/10 text-[#FF5A1F] text-[9px] font-extrabold tracking-widest uppercase">
                      Briefing
                    </span>
                    <h2 className="text-lg lg:text-xl font-extrabold font-syne text-[#F2EFFC] mt-1.5">
                      Welcome, Rahul Kapoor
                    </h2>
                    <p className="text-xs text-[#82809A] leading-relaxed mt-1">
                      Lead production for <strong className="text-white font-semibold">{state.event?.name || "Sharma Wedding"}</strong>.
                    </p>
                  </div>

                  {/* Arrival actions for responsive layout */}
                  <div className="pt-3 flex flex-wrap gap-3 items-center justify-between z-10 border-t border-white/5 mt-3">
                    <span className="text-xs text-[#82809A] font-semibold flex items-center gap-1" title="Venue: Racecourse Club, Rajkot">
                      <MapPin className="w-3.5 h-3.5 text-[#FF5A1F]" /> Rajkot
                    </span>
                    
                    {!state.checkInStatus.checkedIn ? (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleCheckIn}
                          disabled={checkingInStatus !== 'idle'}
                          className="px-3 py-1 bg-[#FF5A1F] hover:bg-[#FF5A1F]/90 text-white rounded-lg text-xs font-bold transition shadow-md disabled:opacity-50"
                        >
                          {checkingInStatus === 'idle' ? 'GPS Check-In' : 'Verifying...'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[#10B981]" title={`Check-in recorded at ${state.checkInStatus.checkInTime}`}>
                        <span className="w-4.5 h-4.5 rounded-full bg-[#10B981]/15 flex items-center justify-center">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                        <span className="text-[11px] font-bold">Checked In</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Urgent Broadcast Notice Box */}
                <div 
                  className="p-5 rounded-2xl bg-[#161622] border-l-4 border-[#FF5A1F] border-y border-r border-white/5 flex flex-col justify-between shadow-lg cursor-help"
                  title="Shifted schedules across all departments. Production setup timelines shifted by half an hour."
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-[9px] font-extrabold tracking-widest text-[#FF5A1F] uppercase mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#FF5A1F]" /> Alert
                    </div>
                    <p className="text-xs font-bold text-[#F2EFFC] leading-snug mt-2">
                      Baraat delayed by 30 mins.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-[#82809A]">
                    <span className="font-semibold text-white/80">Team Leader</span>
                    <span className="font-mono">10:05 AM</span>
                  </div>
                </div>

              </div>

              {/* Home Metrics and Timeline Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Progress Wheel and Work Breakdown Box */}
                <div 
                  className="lg:col-span-1 p-5 rounded-2xl bg-[#0E0E14] border border-white/5 space-y-4 shadow-lg cursor-help"
                  title="Calculated dynamically based on active & completed checklist items"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#82809A]">Progress</h3>
                    </div>
                    <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded font-mono font-bold">RK</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    {/* Large circular indicator */}
                    <div className="relative w-18 h-18">
                      <svg className="w-full h-full" viewBox="0 0 36 36">
                        <circle className="text-white/5" strokeWidth="3" stroke="currentColor" fill="none" r="16" cx="18" cy="18" />
                        <circle 
                          className="text-[#FF5A1F] transition-all duration-700 ease-out" 
                          strokeWidth="3" 
                          strokeDasharray="100" 
                          strokeDashoffset={100 - (state.event?.progress || 0)} 
                          strokeLinecap="round" 
                          stroke="currentColor" 
                          fill="none" 
                          r="16" cx="18" cy="18" 
                          transform="rotate(-90 18 18)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black text-[#F2EFFC]">
                          {state.event?.progress || 0}%
                        </span>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <h4 className="text-xs font-extrabold text-[#F2EFFC]">Rahul Kapoor</h4>
                      <p className="text-[10px] text-[#82809A] font-mono">{state.tasks.length} Direct Tasks</p>
                    </div>
                  </div>

                  {/* Task Department Metrics breakdown */}
                  <div className="pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="py-1 rounded bg-[#10B981]/5 text-[#10B981]" title="Completed Tasks">
                      Done: <span className="text-white font-extrabold font-mono">2</span>
                    </div>
                    <div className="py-1 rounded bg-[#3B82F6]/5 text-[#3B82F6]" title="Tasks currently in progress">
                      Live: <span className="text-white font-extrabold font-mono">1</span>
                    </div>
                    <div className="py-1 rounded bg-amber-500/5 text-amber-500" title="Tasks pending start">
                      Wait: <span className="text-white font-extrabold font-mono">2</span>
                    </div>
                  </div>
                </div>

                {/* Timeline flow on Right */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0E0E14] border border-white/5 flex flex-col shadow-lg">
                  <div className="mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#82809A]">Chronology</h3>
                  </div>

                  <div className="flex-1 relative pl-6 space-y-4 py-1">
                    {/* Vertical guideline */}
                    <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-white/5" />

                    {state.tasks.map((task) => {
                      const isDone = task.status === 'done';
                      const isOngoing = task.status === 'ongoing';
                      const isDelayed = task.status === 'delayed';
                      const isBlocked = task.status === 'blocked';

                      return (
                        <div 
                          key={task.id} 
                          className="relative flex justify-between items-center group cursor-help"
                          title={`Assigned to: ${task.assignees.join(', ')} | Department: ${task.department} | Schedule: ${task.startTime} - ${task.deadline}`}
                        >
                          {/* Chrono dot marker */}
                          <div className={`absolute left-[-22px] top-1/2 -translate-y-1/2 w-[9px] h-[9px] rounded-full border-2 border-[#07070B] transition-colors ${
                            isDone ? 'bg-[#10B981]' : isOngoing ? 'bg-[#3B82F6] ring-4 ring-[#3B82F6]/10' : isDelayed ? 'bg-amber-500' : isBlocked ? 'bg-red-500' : 'bg-[#4C4B63]'
                          }`} />

                          <div className="min-w-0 pr-4">
                            <h4 className={`text-xs font-bold truncate transition ${isDone ? 'text-[#82809A] line-through' : 'text-[#F2EFFC]'}`}>
                              {task.name}
                            </h4>
                            <p className="text-[10px] text-[#82809A] font-mono mt-0.5">{task.startTime} - {task.deadline}</p>
                          </div>

                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isDone ? 'bg-[#10B981]/10 text-[#10B981]' : isOngoing ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : isDelayed ? 'bg-amber-500/10 text-amber-500' : isBlocked ? 'bg-red-500/10 text-red-500' : 'bg-white/5 text-[#82809A]'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* ── ACTIVE TASKS & WORKFLOW TAB VIEW ── */}
          {currentTab === 'tasks' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Filter controls and count banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0E0E14] p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-sm font-black font-syne text-[#F2EFFC]">Duty Board</h3>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'ongoing', 'pending', 'done'] as const).map(f => (
                    <button 
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition shrink-0 ${
                        taskFilter === f 
                          ? 'bg-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/15' 
                          : 'bg-[#161622] hover:bg-[#1C1C2C] text-[#82809A] hover:text-[#F2EFFC]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of task card elements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                {filteredTasks.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-xs text-[#82809A] bg-[#0E0E14] rounded-2xl border border-white/5 border-dashed">
                    No active tasks match this category filter.
                  </div>
                ) : (
                  filteredTasks.map(task => {
                    const isRK = task.assignees.includes("RK");
                    const hasSubtasks = task.subtasks.length > 0;
                    const isOngoing = task.status === 'ongoing';
                    const isDelayed = task.status === 'delayed';
                    const isBlocked = task.status === 'blocked';
                    const isDone = task.status === 'done';

                    return (
                      <div 
                        key={task.id} 
                        className={`p-5 rounded-2xl bg-[#0E0E14] border flex flex-col justify-between space-y-4 transition-all duration-300 relative overflow-hidden ${
                          isOngoing ? 'border-[#3B82F6]/30 shadow-lg shadow-[#3B82F6]/5' : isDelayed ? 'border-amber-500/30 shadow-md' : isBlocked ? 'border-red-500/30' : 'border-white/5'
                        }`}
                      >
                        {/* Background flare if active */}
                        {isOngoing && <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500 opacity-[0.02] blur-[40px] pointer-events-none" />}
                        
                        <div className="space-y-2.5">
                          {/* Department and state status pill */}
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-extrabold tracking-widest text-[#FF5A1F] uppercase bg-[#FF5A1F]/10 px-2 py-0.5 rounded">
                              {task.department}
                            </span>
                            
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              isDone ? 'bg-[#10B981]/15 text-[#10B981]' : isOngoing ? 'bg-[#3B82F6]/15 text-[#3B82F6]' : isDelayed ? 'bg-amber-500/15 text-amber-400' : isBlocked ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-[#82809A]'
                            }`}>
                              {task.status}
                            </span>
                          </div>

                          {/* Task Name and Timings */}
                          <div>
                            <h4 className="text-sm font-extrabold text-[#F2EFFC] leading-snug">{task.name}</h4>
                            <div className="flex gap-4 mt-2 text-[11px] text-[#82809A]">
                              <span className="flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5 text-white/20" /> {task.startTime} - {task.deadline}</span>
                              <span className="text-white/10">|</span>
                              <span className="flex items-center gap-1 font-mono"><User className="w-3.5 h-3.5 text-white/20" /> {task.assignees.join(', ')}</span>
                            </div>
                          </div>

                          {/* Subtasks block */}
                          {hasSubtasks && (
                            <div className="pt-3 border-t border-white/5 space-y-2.5">
                              <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-[#82809A]">
                                <span>Checklist</span>
                                <span className="text-[#3B82F6]">
                                  {task.subtasks.filter(s => s.checked).length} of {task.subtasks.length} Done
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {task.subtasks.map(sub => (
                                  <div 
                                    key={sub.id} 
                                    onClick={() => handleToggleSubtask(task.id, sub.id, sub.checked)}
                                    className="flex items-center justify-between p-2 rounded-lg bg-[#07070B] hover:bg-white/5 transition cursor-pointer border border-white/[0.02]"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      {sub.checked ? (
                                        <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                                      ) : (
                                        <div className="w-4 h-4 rounded border border-white/20 shrink-0" />
                                      )}
                                      <span className={`text-xs ${sub.checked ? 'text-[#82809A] line-through' : 'text-[#F2EFFC]'}`}>
                                        {sub.name}
                                      </span>
                                    </div>
                                    <span className="text-[9px] text-[#82809A] bg-white/5 px-1.5 py-0.5 rounded font-mono font-bold">
                                      {sub.assignedTo}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Trigger for adding checklist subtasks */}
                          {addingSubtaskId === task.id ? (
                            <div className="pt-2 flex gap-2">
                              <input 
                                type="text"
                                value={newSubtaskTexts[task.id] || ''}
                                onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task.id]: e.target.value }))}
                                placeholder="Add custom item..."
                                className="flex-1 bg-[#07070B] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#3B82F6]/50 transition"
                                onKeyDown={(e) => { if(e.key === 'Enter') handleAddSubtask(task.id); }}
                              />
                              <button 
                                onClick={() => handleAddSubtask(task.id)}
                                className="px-3 py-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white rounded-lg text-xs font-bold transition"
                              >
                                Add
                              </button>
                              <button 
                                onClick={() => setAddingSubtaskId(null)}
                                className="p-1 text-[#82809A] hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            !isDone && (
                              <button 
                                onClick={() => setAddingSubtaskId(task.id)}
                                className="text-[10px] text-[#3B82F6] hover:text-[#3B82F6]/90 font-bold flex items-center gap-1 mt-1 transition"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add checklist point
                              </button>
                            )
                          )}
                        </div>

                        {/* Quick Status Action Panel */}
                        {!isDone && (
                          <div className="pt-4 border-t border-white/5">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                              <button 
                                onClick={() => handleUpdateTaskStatus(task.id, 'done')}
                                className="py-2 px-1 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/15 active:scale-95 transition text-[11px] font-extrabold text-[#10B981] flex items-center justify-center gap-1"
                              >
                                <CheckSquare className="w-3.5 h-3.5" /> Done
                              </button>
                              <button 
                                onClick={() => {
                                  setDelayReportingTaskId(delayReportingTaskId === task.id ? null : task.id);
                                  setDelaySummary('');
                                }}
                                className={`py-2 px-1 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 active:scale-95 transition ${
                                  delayReportingTaskId === task.id
                                    ? 'bg-amber-500 text-black shadow-md'
                                    : 'bg-amber-500/10 hover:bg-amber-500/15 text-amber-500'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> Delay
                              </button>
                              <button 
                                onClick={() => handleUpdateTaskStatus(task.id, 'blocked')}
                                className="py-2 px-1 rounded-lg bg-red-500/10 hover:bg-red-500/15 active:scale-95 transition text-[11px] font-extrabold text-red-500 flex items-center justify-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Blocked
                              </button>
                              <button 
                                onClick={() => handleUpdateTaskStatus(task.id, 'ongoing')}
                                className="py-2 px-1 rounded-lg bg-[#3B82F6]/10 hover:bg-[#3B82F6]/15 active:scale-95 transition text-[11px] font-extrabold text-[#3B82F6] flex items-center justify-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" /> On It
                              </button>
                            </div>

                            {/* Delay Reporting Inner Drawer Container */}
                            {delayReportingTaskId === task.id && (
                              <div className="p-3.5 rounded-xl bg-[#07070B] border border-amber-500/20 space-y-2.5">
                                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                  Delay Alert Cause
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(['Waiting for materials', 'Setup taking longer', 'Vendor delayed', 'Equipment failure']).map(preset => (
                                    <button 
                                      key={preset}
                                      onClick={() => setDelaySummary(preset)}
                                      className="px-2 py-1 rounded bg-amber-500/5 hover:bg-amber-500/10 text-[9px] text-amber-400 font-bold border border-amber-500/10"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                                <textarea 
                                  value={delaySummary}
                                  onChange={(e) => setDelaySummary(e.target.value)}
                                  placeholder="Describe the cause of delay..."
                                  className="w-full bg-[#161622] border border-white/5 rounded-lg p-2.5 text-xs text-white outline-none resize-none h-14"
                                />
                                <button 
                                  onClick={() => handleSubmitDelayReport(task.id)}
                                  disabled={!delaySummary.trim()}
                                  className="w-full py-2 bg-amber-500 hover:bg-amber-500/90 text-black font-extrabold rounded-lg text-xs tracking-wider shadow-md disabled:opacity-50 transition"
                                >
                                  Submit Delay To Control Desk
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Active Delay Report banner */}
                        {task.delayReport && (
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs text-amber-400 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <div className="font-extrabold uppercase tracking-wide text-[9px]">Delay Active</div>
                              <p className="mt-0.5 leading-relaxed">{task.delayReport.summary}</p>
                              <div className="text-[9px] text-[#82809A] mt-1 font-semibold">Reported by {task.delayReport.reportedBy} at {task.delayReport.reportedAt}</div>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {/* ── EVENT CREW DIRECTORY TAB VIEW ── */}
          {currentTab === 'chat' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="p-5 rounded-2xl bg-[#0E0E14] border border-white/5 flex flex-col space-y-5 shadow-lg min-h-[460px]">
                
                {/* Search and Header Section */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#82809A]">Event Crew Directory</h3>
                    <p className="text-[10px] text-[#82809A] mt-0.5">Secure view of active staff contact details</p>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#07070B] border border-white/5 w-full sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-[#82809A] shrink-0" />
                    <input 
                      type="text"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Search crew by name or role..."
                      className="flex-1 bg-transparent text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {/* Team Members List Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto no-scrollbar max-h-[500px]">
                  {[
                    { name: "Rahul Kapoor", role: "Production", phone: "+91 98765 43210", initials: "RK", status: "Online", isMe: true },
                    { name: "Sneha Mehta", role: "Decoration", phone: "+91 98234 56789", initials: "SM", status: "Online", isMe: false },
                    { name: "Team Leader", role: "Management", phone: "+91 95555 44444", initials: "TL", status: "Online", isMe: false },
                    { name: "Niraj Patel", role: "Production", phone: "+91 91234 56789", initials: "NP", status: "Online", isMe: false },
                    { name: "Meera Rao", role: "Hospitality", phone: "+91 90123 45678", initials: "MR", status: "Offline", isMe: false },
                    { name: "Karan Desai", role: "Decoration", phone: "+91 99887 76655", initials: "KD", status: "Online", isMe: false }
                  ]
                    .filter(member => 
                      member.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
                      member.role.toLowerCase().includes(teamSearch.toLowerCase())
                    )
                    .map((member, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl bg-[#161622] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar Circle with Status Indicator */}
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full text-xs font-black flex items-center justify-center border border-white/5 shadow-sm ${
                              member.isMe 
                                ? 'bg-gradient-to-tr from-[#FF5A1F] to-amber-500 text-white' 
                                : member.role === 'Management' 
                                  ? 'bg-rose-500/20 text-rose-400' 
                                  : 'bg-[#3B82F6]/20 text-[#3B82F6]'
                            }`}>
                              {member.initials}
                            </div>
                            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161622] ${
                              member.status === 'Online' ? 'bg-[#10B981]' : 'bg-[#82809A]'
                            }`} />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-extrabold text-[#F2EFFC] truncate">
                                {member.name}
                              </h4>
                              {member.isMe && (
                                <span className="text-[8px] bg-[#FF5A1F]/10 text-[#FF5A1F] px-1 rounded font-bold uppercase">Me</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#82809A] font-medium mt-0.5">
                              {member.role}
                            </p>
                          </div>
                        </div>

                        {/* Phone action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(member.phone);
                              setCopiedPhoneId(member.name);
                              setTimeout(() => setCopiedPhoneId(null), 2000);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#82809A] hover:text-white hover:bg-white/10 transition"
                            title="Copy phone number"
                          >
                            {copiedPhoneId === member.name ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          
                          <a
                            href={`tel:${member.phone.replace(/\s+/g, '')}`}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#82809A] hover:text-white hover:bg-white/10 transition"
                            title="Call teammate"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>

              </div>
            </motion.div>
          )}

          {/* ── RESOURCE REFERENCE VAULT TAB VIEW ── */}
          {currentTab === 'resources' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left side: Upload card and stats */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Stats Info */}
                  <div className="p-5 rounded-2xl bg-[#0E0E14] border border-white/5 space-y-4 shadow-lg">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-[#82809A]">Resource Vault</h3>
                      <p className="text-[10px] text-[#82809A] mt-0.5">Shared schedules, lists & references</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#82809A]">Total Files</span>
                        <span className="font-bold text-white">{state.resources.length} uploaded</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#82809A]">Direct Upload Access</span>
                        <span className="text-amber-400 font-bold">Manager Only</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#82809A]">Format Support</span>
                        <span className="text-white/60 font-mono text-[9px]">PDF, PNG, DOCX</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right side: File Search and Grid Listing */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0E0E14] border border-white/5 flex flex-col space-y-4 shadow-lg min-h-[400px]">
                  
                  {/* Title and search bar */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#82809A]">Active Reference Library</h4>
                      <p className="text-[10px] text-[#82809A] mt-0.5">Click file nodes to view details</p>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#07070B] border border-white/5 w-full sm:max-w-xs">
                      <Search className="w-3.5 h-3.5 text-[#82809A] shrink-0" />
                      <input 
                        type="text"
                        value={resourceSearch}
                        onChange={(e) => setResourceSearch(e.target.value)}
                        placeholder="Search resource files..."
                        className="flex-1 bg-transparent text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Grid layout for files */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto no-scrollbar max-h-[420px] pt-2">
                    {state.resources
                      .filter(res => res.name.toLowerCase().includes(resourceSearch.toLowerCase()))
                      .map(res => (
                        <div 
                          key={res.id} 
                          className="p-3.5 rounded-xl bg-[#161622] border border-white/5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Colorful file extension badge */}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                              res.type === 'pdf' ? 'bg-red-500/10 text-red-400' : res.type === 'img' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {res.type === 'pdf' ? <FileText className="w-4 h-4" /> : res.type === 'img' ? <ImageIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[#F2EFFC] truncate max-w-[140px] group-hover:text-[#FF5A1F] transition">
                                {res.name}
                              </h4>
                              <p className="text-[9px] text-[#82809A] mt-0.5">
                                By {res.uploadedBy} · {res.size} · {res.uploadedAt}
                              </p>
                            </div>
                          </div>

                          <a 
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent("EventOS Secure Reference Resource:\nFile: " + res.name + "\nSize: " + res.size + "\nUploaded By: " + res.uploadedBy + "\nUploaded At: " + res.uploadedAt)}`}
                            download={res.name + ".txt"}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#82809A] hover:text-white hover:bg-white/10 transition shrink-0"
                            title="Download reference"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                  </div>

                </div>

              </div>
            </motion.div>
          )}

          {/* ── BROADCAST ALERTS TAB VIEW ── */}
          {currentTab === 'notifs' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div className="p-5 rounded-2xl bg-[#0E0E14] border border-white/5 space-y-4 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black font-syne text-[#F2EFFC]">System Broadcast Desk</h3>
                    <p className="text-[10px] text-[#82809A]">Audit trail of department events and delay notices</p>
                  </div>
                  <span className="text-[9px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded font-extrabold tracking-widest uppercase">
                    Live Feed
                  </span>
                </div>

                <div className="space-y-3 divide-y divide-white/5">
                  {state.notifications.map((notif) => {
                    const isGreen = notif.type === 'green';
                    const isBlue = notif.type === 'blue';
                    const isAmber = notif.type === 'amber';
                    const isAccent = notif.type === 'accent';
                    
                    return (
                      <div 
                        key={notif.id} 
                        className="pt-3 first:pt-0 flex gap-3.5 items-start hover:bg-white/[0.01] p-2 rounded-xl transition"
                      >
                        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                          isGreen ? 'bg-[#10B981]' : isBlue ? 'bg-[#3B82F6]' : isAmber ? 'bg-amber-500' : isAccent ? 'bg-[#FF5A1F]' : 'bg-[#A78BFA]'
                        }`} />
                        <div className="space-y-1">
                          <p className="text-xs text-[#F2EFFC] leading-relaxed font-medium">
                            {notif.text}
                          </p>
                          <div className="text-[9px] text-[#82809A] font-semibold">
                            {notif.time}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

        </section>

      </main>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#08080C]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-2 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setCurrentTab('home')}
          className={`flex-1 flex flex-col items-center justify-center h-full text-center relative transition-colors ${
            currentTab === 'home' ? 'text-[#FF5A1F]' : 'text-[#82809A] hover:text-[#F2EFFC]'
          }`}
          style={{ minHeight: '44px' }}
          title="Home"
        >
          <Smartphone className="w-5 h-5" />
          {currentTab === 'home' && (
            <motion.div 
              layoutId="mobileActiveTab" 
              className="absolute bottom-1 w-5 h-1 rounded bg-[#FF5A1F]" 
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <button 
          onClick={() => setCurrentTab('tasks')}
          className={`flex-1 flex flex-col items-center justify-center h-full text-center relative transition-colors ${
            currentTab === 'tasks' ? 'text-[#FF5A1F]' : 'text-[#82809A] hover:text-[#F2EFFC]'
          }`}
          style={{ minHeight: '44px' }}
          title="Workflow"
        >
          <div className="relative">
            <CheckCircle className="w-5 h-5" />
            {pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#3B82F6]" />
            )}
          </div>
          {currentTab === 'tasks' && (
            <motion.div 
              layoutId="mobileActiveTab" 
              className="absolute bottom-1 w-5 h-1 rounded bg-[#FF5A1F]" 
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <button 
          onClick={() => setCurrentTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center h-full text-center relative transition-colors ${
            currentTab === 'chat' ? 'text-[#FF5A1F]' : 'text-[#82809A] hover:text-[#F2EFFC]'
          }`}
          style={{ minHeight: '44px' }}
          title="Group Coordination"
        >
          <div className="relative">
            <Users className="w-5 h-5" />
          </div>
          {currentTab === 'chat' && (
            <motion.div 
              layoutId="mobileActiveTab" 
              className="absolute bottom-1 w-5 h-1 rounded bg-[#FF5A1F]" 
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <button 
          onClick={() => setCurrentTab('resources')}
          className={`flex-1 flex flex-col items-center justify-center h-full text-center relative transition-colors ${
            currentTab === 'resources' ? 'text-[#FF5A1F]' : 'text-[#82809A] hover:text-[#F2EFFC]'
          }`}
          style={{ minHeight: '44px' }}
          title="Resource"
        >
          <FileText className="w-5 h-5" />
          {currentTab === 'resources' && (
            <motion.div 
              layoutId="mobileActiveTab" 
              className="absolute bottom-1 w-5 h-1 rounded bg-[#FF5A1F]" 
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <button 
          onClick={() => setCurrentTab('notifs')}
          className={`flex-1 flex flex-col items-center justify-center h-full text-center relative transition-colors ${
            currentTab === 'notifs' ? 'text-[#FF5A1F]' : 'text-[#82809A] hover:text-[#F2EFFC]'
          }`}
          style={{ minHeight: '44px' }}
          title="Broadcast"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </div>
          {currentTab === 'notifs' && (
            <motion.div 
              layoutId="mobileActiveTab" 
              className="absolute bottom-1 w-5 h-1 rounded bg-[#FF5A1F]" 
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </nav>

    </div>
  );
}
