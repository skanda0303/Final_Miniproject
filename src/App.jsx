import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Folder, MessageSquare, Wrench, Search, 
  LogOut, CheckCircle2, Cloud, Database, 
  Send, User, Bot, AlertTriangle, ArrowRight,
  TrendingUp, Sparkles, Shield, Cpu, RefreshCw,
  Terminal, Play, Trash2
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Finance': '💰',
  'Legal': '⚖️',
  'Education': '🎓',
  'Projects': '🚀',
  'Personal': '🏠',
  'Tech': '💻',
  'Work': '💼',
  'Resumes': '📄',
  'Uncategorized': '📁',
};

const CATEGORY_COLORS = {
  'Finance': 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  'Legal': 'border-rose-500/30 text-rose-400 bg-rose-500/10',
  'Education': 'border-blue-500/30 text-blue-400 bg-blue-500/10',
  'Projects': 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  'Personal': 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  'Tech': 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  'Work': 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  'Resumes': 'border-pink-500/30 text-pink-400 bg-pink-500/10',
  'Uncategorized': 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10',
};

const CARD_SHADOWS = {
  'Finance': 'card-shadow-finance',
  'Legal': 'card-shadow-legal',
  'Education': 'card-shadow-education',
  'Projects': 'card-shadow-projects',
  'Personal': 'card-shadow-personal',
  'Tech': 'card-shadow-tech',
  'Work': 'card-shadow-work',
  'Resumes': 'card-shadow-resumes',
  'Uncategorized': 'card-shadow-default',
};

function App() {
  const [status, setStatus] = useState({ authenticated: false, fileCount: 0, indexingComplete: false });
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemma2:9b');
  const [logs, setLogs] = useState([]);
  const [scanningActive, setScanningActive] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const scrollRef = useRef(null);
  const terminalEndRef = useRef(null);

  const fetchData = async () => {
    try {
      const [statusRes, sugRes, filesRes] = await Promise.all([
        fetch('http://localhost:3001/api/status'),
        fetch('http://localhost:3001/api/suggestions'),
        fetch('http://localhost:3001/api/files')
      ]);
      const statusData = await statusRes.json();
      const sugData = await sugRes.json();
      const filesData = await filesRes.json();
      setStatus(statusData);
      setSuggestions(sugData);
      setFiles(filesData);
    } catch (e) {
      console.error('Data sync failed');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/logs');
      const data = await res.json();
      // SQLite store logs order by id desc
      setLogs(data);
    } catch (e) {
      console.error('Failed to fetch logs');
    }
  };

  useEffect(() => {
    fetchData();
    fetchLogs();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll logs frequently if a scan is active or files are indexing
  useEffect(() => {
    let logInterval;
    if (!status.indexingComplete || scanningActive) {
      fetchLogs();
      logInterval = setInterval(fetchLogs, 3000);
    } else {
      fetchLogs();
      logInterval = setInterval(fetchLogs, 10000);
    }
    return () => clearInterval(logInterval);
  }, [status.indexingComplete, scanningActive]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  // Keep terminal scrolled to bottom when new logs arrive
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = question;
    setQuestion('');
    setLoading(true);

    const newHistory = [
      ...chatHistory,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: 'Analyzing your files...' }
    ];
    setChatHistory(newHistory);

    try {
      const res = await fetch('http://localhost:3001/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          history: chatHistory.slice(-5).map(m => m.content),
          model: selectedModel
        })
      });
      const data = await res.json();

      setChatHistory([
        ...newHistory.slice(0, -1),
        { role: 'assistant', content: data.answer || 'I couldn\'t find a specific answer.' }
      ]);
    } catch {
      setChatHistory([
        ...newHistory.slice(0, -1),
        { role: 'assistant', content: 'Local AI is currently offline. Please check if Ollama is running.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('http://localhost:3001/auth/url');
      const data = await res.json();
      window.open(data.url, '_blank');
    } catch (e) {
      console.error('Failed to connect to backend', e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/logout', { method: 'POST' });
      window.location.reload();
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const handleScan = async () => {
    try {
      setScanningActive(true);
      await fetch('http://localhost:3001/api/scan', { method: 'POST' });
      fetchData();
      fetchLogs();
      // End visual active state after 25s
      setTimeout(() => setScanningActive(false), 25000);
    } catch (e) {
      console.error('Scan trigger failed');
    }
  };

  const handleReset = async () => {
    try {
      await fetch('http://localhost:3001/api/reset', { method: 'POST' });
      setScanningActive(true);
      setShowResetConfirm(false);
      fetchData();
      fetchLogs();
      setTimeout(() => setScanningActive(false), 25000);
    } catch (e) {
      console.error('Reset failed');
    }
  };

  const handleClearDB = async () => {
    try {
      setScanningActive(true);
      await fetch('http://localhost:3001/api/clear', { method: 'POST' });
      await fetchData();
      await fetchLogs();
      setScanningActive(false);
    } catch (e) {
      console.error('Clear DB failed');
      setScanningActive(false);
    }
  };


  // Determine active pipeline stage based on the latest database logs
  const getActivePipelineStep = () => {
    if (logs.length === 0) return 0;
    // index 0 is newest
    const latestLog = logs[0];
    const text = (latestLog.action + ' ' + latestLog.details).toUpperCase();
    
    if (text.includes('RESET') || text.includes('START') || text.includes('DRIVE') || text.includes('DISCOVER')) {
      return 1;
    }
    if (text.includes('PARSING') || text.includes('EXTRACT') || text.includes('READ')) {
      return 2;
    }
    if (text.includes('EMBEDDING') || text.includes('GEMINI') || text.includes('VECTOR') || text.includes('AI') || text.includes('SUMMARY')) {
      return 3;
    }
    if (text.includes('SUGGESTION') || text.includes('TAXONOMY') || text.includes('REORGANIZE') || text.includes('SUCCESS') || text.includes('MOVE')) {
      return 4;
    }
    return 1;
  };

  const activeStep = (scanningActive || !status.indexingComplete) ? getActivePipelineStep() : 0;

  // Render Premium Auth Screen if not logged in
  if (!status.authenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030308] text-slate-50 p-6 relative overflow-hidden">
        {/* Glowing Decorative Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/15 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-center">
          
          {/* Left Side: Cyber Presentation & Features */}
          <div className="lg:col-span-6 space-y-8 pr-0 lg:pr-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Autonomous Document Intelligence
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-none font-heading">
                Intellect<span className="text-cyan-400">.</span>
              </h1>
              <p className="text-lg text-slate-400 font-sans max-w-md mx-auto lg:mx-0">
                A cognitive assistant that scans, organizes, and unlocks actionable knowledge from your Google Drive files in real-time.
              </p>
            </div>

            {/* Value Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md sm:max-w-none mx-auto">
              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3 border border-cyan-500/20">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm">Gemini AI Analysis</h3>
                <p className="text-xs text-slate-500 mt-1">Automatic semantic summary & category extraction.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 border border-indigo-500/20">
                  <Folder className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm">Smart Categorization</h3>
                <p className="text-xs text-slate-500 mt-1">Autonomous folder reorganization suggestions.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 border border-purple-500/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm">Cognitive RAG Chat</h3>
                <p className="text-xs text-slate-500 mt-1">Talk to your files directly in natural language.</p>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm">Secure Authentication</h3>
                <p className="text-xs text-slate-500 mt-1">Direct official Google OAuth integration.</p>
              </div>
            </div>
          </div>

          {/* Right Side: Glowing Login Card */}
          <div className="lg:col-span-6 flex justify-center w-full">
            <div className="glass-panel p-8 w-full max-w-md border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
              
              <div className="space-y-6 text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <Database className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight font-heading">Secure Portal</h2>
                  <p className="text-sm text-slate-400">Authorize Intellect to secure and organize your documents.</p>
                </div>

                <div className="border-y border-white/5 py-4 space-y-2 text-left text-xs text-slate-500 font-mono">
                  <div className="flex justify-between">
                    <span>PORTAL STATUS:</span>
                    <span className="text-cyan-400 font-bold">STANDBY</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI BACKEND:</span>
                    <span className="text-emerald-400">ACTIVE (GEMINI)</span>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  onClick={handleConnect} 
                  className="w-full text-md font-semibold font-heading py-6 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 border border-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-300 transform active:scale-[0.98]"
                >
                  Connect Google Drive <ArrowRight className="w-5 h-5 ml-2" />
                </Button>

                <p className="text-xs text-slate-600">
                  We secure your connection using official OAuth tokens. We never store your direct passwords.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.category?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="h-screen w-screen bg-[#030308] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-950/10 blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] rounded-full bg-purple-950/10 blur-[150px] pointer-events-none z-0" />

      {/* Modern Frosted Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#030308]/40 backdrop-blur-xl z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Database className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider font-heading">
            Intellect<span className="text-cyan-400">.</span>
          </h1>
        </div>
        
        {/* Custom Frosted Search Bar */}
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="w-full pl-10 bg-slate-950/30 border-white/10 hover:border-cyan-500/25 focus-visible:ring-cyan-500/30 rounded-xl"
            placeholder="Search through index database..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {/* Sync Status Badge & Avatar */}
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className={`px-3 py-1.5 gap-2 rounded-full font-heading font-medium tracking-wide badge-shimmer ${
              status.indexingComplete && !scanningActive
                ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' 
                : 'border-cyan-500/20 text-cyan-400 bg-cyan-500/10'
            }`}
          >
            {status.indexingComplete && !scanningActive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot-cyan shrink-0" />
                Synced
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                Cognitive Pipeline Scan Active
              </>
            )}
          </Badge>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/10 border border-cyan-400/20">
            S
          </div>
        </div>
      </header>

      {/* Main Core Layout */}
      <div className="flex flex-1 overflow-hidden z-10">
        <Tabs defaultValue="storage" className="flex-1 flex flex-row">
          
          {/* Frosted Sidebar */}
          <aside className="w-64 border-r border-white/5 bg-[#030308]/20 backdrop-blur-lg flex flex-col p-4 shrink-0">
            <TabsList className="flex flex-col h-auto bg-transparent p-0 gap-2 items-start justify-start w-full">
              <TabsTrigger 
                value="storage" 
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-l-2 data-[state=active]:border-cyan-500 data-[state=active]:font-semibold"
              >
                <Folder className="w-4 h-4" />
                Document Store
              </TabsTrigger>
              
              <TabsTrigger 
                value="assistant" 
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-l-2 data-[state=active]:border-cyan-500 data-[state=active]:font-semibold"
              >
                <MessageSquare className="w-4 h-4" />
                AI RAG Assistant
              </TabsTrigger>
              
              <TabsTrigger 
                value="optimize" 
                className="w-full justify-start gap-3 py-3 px-4 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:border-l-2 data-[state=active]:border-cyan-500 data-[state=active]:font-semibold"
              >
                <Wrench className="w-4 h-4" />
                Auto-Optimize
                {suggestions.length > 0 && (
                  <Badge variant="secondary" className="ml-auto bg-cyan-500/20 text-cyan-400 border border-cyan-400/20">
                    {suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            {/* Pipeline & DB Control Actions */}
            <div className="space-y-2 mt-6 mb-4 shrink-0">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 font-mono">Control Panel</div>
              <Button 
                onClick={handleScan}
                disabled={scanningActive}
                className="w-full justify-start gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold font-heading tracking-wide border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.05)] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanningActive ? 'animate-spin' : ''}`} />
                Index New Documents
              </Button>
              
              <Button 
                onClick={handleClearDB}
                disabled={scanningActive}
                className="w-full justify-start gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold font-heading tracking-wide border border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/15 disabled:opacity-50 transition-all duration-300 shadow-[0_0_10px_rgba(244,63,94,0.02)] hover:shadow-[0_0_15px_rgba(244,63,94,0.1)]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Database
              </Button>
            </div>

            {/* System Status Metrics */}
            <div className="mt-auto space-y-4">
              <div className="p-4 rounded-2xl border border-white/5 bg-slate-950/40 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>FILES SCAN:</span>
                  <span className="text-slate-300 font-semibold font-mono">{status.fileCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>DB STORAGE:</span>
                  <span className="text-slate-300 font-semibold font-mono">SQLite (Active)</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>AI MODEL:</span>
                  <span className="text-slate-300 font-semibold font-mono text-[10px] truncate max-w-[80px]" title={selectedModel}>{selectedModel}</span>
                </div>
              </div>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl py-3" 
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </aside>
          
          {/* Central Main Panel */}
          <main className="flex-1 relative overflow-hidden bg-transparent">
            
            {/* 1. Storage View Tab */}
            <TabsContent value="storage" className="mt-0 h-full focus-visible:outline-none">
              <ScrollArea className="h-[calc(100vh-73px)] w-full">
                <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight font-heading">
                      Document <span className="gradient-text-cyan-purple">Library</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Autonomous semantic classification and summary catalog.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredFiles.map((file, idx) => (
                      <a 
                        key={file.id} 
                        href={`https://drive.google.com/file/d/${file.id}/view`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="group flex flex-col animate-slide-up hover-glow"
                        style={{ animationDelay: `${idx * 60}ms` }}
                      >
                        <div className={`glass-panel p-5 h-full border-white/5 flex flex-col justify-between hover:bg-slate-900/40 hover:scale-[1.02] transform transition-all duration-300 ${CARD_SHADOWS[file.category] || 'card-shadow-default'}`}>
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <div className="text-3xl bg-white/5 p-3 rounded-2xl group-hover:scale-110 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-all duration-300">
                                {CATEGORY_ICONS[file.category] || '📁'}
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CATEGORY_COLORS[file.category] || 'border-slate-500/30'}`}
                              >
                                {file.category}
                              </Badge>
                            </div>
                            
                            <h3 className="text-base font-bold font-heading leading-snug line-clamp-2 text-slate-100 group-hover:text-cyan-300 transition-colors" title={file.name}>
                              {file.name}
                            </h3>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/5">
                            <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed">
                              {file.summary || 'AI Analysis pending...'}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                    
                    {filteredFiles.length === 0 && (
                      <div className="col-span-full py-32 text-center text-slate-500 glass-panel border-dashed border-white/5 animate-slide-up">
                        <Folder className="w-16 h-16 mx-auto mb-4 opacity-10 text-cyan-400 animate-float" />
                        <p className="text-lg font-medium">Empty Catalog</p>
                        <p className="text-sm text-slate-600 mt-1">No documents fit the current query.</p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* 2. RAG AI Assistant Tab */}
            <TabsContent value="assistant" className="mt-0 h-full w-full flex flex-col p-8 space-y-6 focus-visible:outline-none overflow-hidden animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight font-heading">
                    Cognitive <span className="gradient-text-cyan-purple">Assistant</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Converse directly with your index database via RAG.</p>
                </div>
                
                {/* Glowing Select Model */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 font-mono">MODEL ENG:</span>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[180px] bg-slate-950/40 border-white/10 rounded-xl text-slate-300 font-heading focus:ring-cyan-500/20">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-white/10 rounded-xl text-slate-300">
                      <SelectItem value="gemma2:9b" className="hover:bg-white/5 rounded-lg">Gemma 2 (9B)</SelectItem>
                      <SelectItem value="qwen3:8b" className="hover:bg-white/5 rounded-lg">Qwen 3 (8B)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* High Tech Chat Container with scrolling conversation */}
              <div className="flex-1 min-h-0 flex flex-col bg-slate-950/20 rounded-3xl border border-white/5 overflow-hidden shadow-2xl backdrop-blur-xl">
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-indigo-500/30 scrollbar-track-transparent">
                  <div className="space-y-6 pb-4">
                    {chatHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-4 animate-fade-in">
                        <div className="w-16 h-16 ai-core-orb flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/10">
                          <Bot className="w-8 h-8" />
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-lg font-medium text-slate-300">RAG Vector Hub</p>
                          <p className="text-xs text-slate-600 max-w-sm">Ask queries like: "Summarize legal contracts" or "Show me projects under design stage."</p>
                        </div>
                      </div>
                    )}
                    
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                        {msg.role === 'assistant' && (
                          <div className="w-9 h-9 ai-core-orb flex items-center justify-center shrink-0 text-cyan-300">
                            <Bot className="w-5 h-5" />
                          </div>
                        )}
                        
                        <div className={`px-5 py-4 rounded-2xl max-w-[80%] leading-relaxed text-sm ${
                          msg.role === 'user' 
                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-sm shadow-md shadow-cyan-500/5' 
                            : 'bg-slate-950/60 border border-white/5 text-slate-200 rounded-tl-sm shadow-lg border-l-2 border-l-cyan-400 prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#030308] prose-pre:border prose-pre:border-white/5 prose-a:text-cyan-400'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          ) : (
                            msg.content
                          )}
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 text-slate-300 font-bold">
                            S
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </div>

                {/* Chat Input Capsule pinned at the bottom */}
                <div className="p-4 bg-[#030308]/60 border-t border-white/5 shrink-0">
                  <form onSubmit={handleAsk} className="flex gap-3 max-w-5xl mx-auto">
                    <Input
                      className="flex-1 bg-slate-950/40 border-white/10 focus-visible:ring-cyan-500/30 rounded-2xl py-6 hover:border-cyan-500/20 focus:border-cyan-500/30 transition-all duration-300"
                      placeholder="Query database records..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <Button 
                      type="submit" 
                      disabled={loading || !question.trim()} 
                      className="bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white font-heading font-semibold shrink-0 px-6 rounded-2xl border border-cyan-400/20 shadow-md shadow-cyan-500/5 gap-2 h-[52px] transform active:scale-95 transition-all"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {loading ? 'Processing' : 'Transmit'}
                    </Button>
                  </form>
                </div>

              </div>
            </TabsContent>

            {/* 3. Reorganize/Optimize Tab */}
            <TabsContent value="optimize" className="mt-0 h-full focus-visible:outline-none">
              <ScrollArea className="h-[calc(100vh-73px)] w-full">
                <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight font-heading">
                      Structural <span className="gradient-text-cyan-purple">Optimization</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Approve AI suggested actions to automatically restructure folders.</p>
                  </div>

                  <div className="space-y-6 max-w-4xl">
                    {suggestions.length === 0 ? (
                      <div className="glass-panel p-16 border-dashed border-white/5 flex flex-col items-center justify-center space-y-4 text-center animate-slide-up">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 animate-float">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-slate-300">Perfectly Balanced</p>
                          <p className="text-xs text-slate-600">The Google Drive structural organization matches the AI taxonomy.</p>
                        </div>
                      </div>
                    ) : (
                      suggestions.map((s, idx) => (
                        <div 
                          key={s.id} 
                          className="glass-panel border-white/5 hover:border-cyan-500/20 transition-all duration-300 p-6 space-y-5 animate-slide-up hover-glow"
                          style={{ animationDelay: `${idx * 100}ms` }}
                        >
                          
                          {/* Suggestion Card Header */}
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <div className="flex items-center gap-2.5 text-cyan-400 font-heading">
                              <AlertTriangle className="w-4 h-4 text-cyan-400 animate-pulse" />
                              <span className="font-bold tracking-wider text-xs uppercase">Automated Relocation Suggestion</span>
                            </div>
                          </div>

                          {/* Path Comparison Flex */}
                          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between text-xs">
                            <div className="flex-1 w-full space-y-1 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 font-heading">Current Node Path</div>
                              <div className="text-slate-300 font-mono break-all">{s.original_path}</div>
                            </div>
                            
                            <div className="hidden md:flex text-slate-600 shrink-0 self-center">
                              <ArrowRight className="w-5 h-5 text-cyan-500 animate-pulse" />
                            </div>
                            
                            <div className="flex-1 w-full space-y-1 bg-cyan-950/15 p-4 rounded-2xl border border-cyan-500/10">
                              <div className="text-cyan-400/80 text-[10px] font-bold uppercase tracking-wider mb-1 font-heading">Suggested Destination</div>
                              <div className="text-cyan-300 font-mono break-all">{s.suggested_path}</div>
                            </div>
                          </div>
                          
                          {/* Reason Bubble */}
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <p className="text-xs text-slate-300 leading-relaxed">
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] mr-2 font-heading">Cognitive Rationale:</span>
                              {s.reason}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2">
                            <Button 
                              onClick={() => fetch('http://localhost:3001/api/approve', { 
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ id: s.id }) 
                              }).then(() => fetchData())}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-semibold rounded-xl px-5 border border-emerald-500/20 shadow-md shadow-emerald-500/5 transform transition active:scale-[0.98]"
                            >
                              Approve Move
                            </Button>
                            
                            <Button 
                              variant="outline"
                              onClick={() => fetch('http://localhost:3001/api/deny', { 
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ id: s.id }) 
                              }).then(() => fetchData())}
                              className="border-white/10 hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-xl px-5"
                            >
                              Dismiss Action
                            </Button>
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </main>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
