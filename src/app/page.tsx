"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDemoAnswer, demoNotes } from "@/lib/demoData";

type Note = {
  id: string;
  title: string;
  content: string;
  insights: string[];
  summary: string;
  tags: string[];
  links: Array<{ label: string; url: string }>;
  confidence: number;
  updatedAt: string | null;
  lastAccessedAt: string | null;
};

type QueryResponse = {
  answer: string;
  sources: Array<{ id: string; title: string }>;
  matches?: Array<{ id: string; title: string; summary: string; confidence: number }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseInsights(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseLinks(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      return {
        label: label || url,
        url: url || label,
      };
    })
    .filter((link) => link.label && link.url);
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [insights, setInsights] = useState("");
  const [tags, setTags] = useState("");
  const [links, setLinks] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<QueryResponse | null>(null);
  const [asking, setAsking] = useState(false);
  const [activeView, setActiveView] = useState<"dashboard" | "notes" | "analytics" | "ai">("dashboard");
  const isDemo = process.env.NEXT_PUBLIC_DEMO === "true";

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeId) || null,
    [activeId, notes]
  );

  const weeklyCounts = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0);
    notes.forEach((note) => {
      const dateValue = note.updatedAt || note.lastAccessedAt;
      if (!dateValue) return;
      const dayIndex = new Date(dateValue).getDay();
      counts[dayIndex] += 1;
    });
    return counts;
  }, [notes]);

  async function loadNotes() {
    setLoading(true);
    setError(null);

    if (isDemo) {
      setNotes(demoNotes);
      if (!activeId && demoNotes.length) {
        setActiveId(demoNotes[0].id);
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/notes");
      const data = await response.json();
      setNotes(data.notes || []);
      if (!activeId && data.notes?.length) {
        setActiveId(data.notes[0].id);
      }
    } catch {
      setError("Could not load notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleCreateNote() {
    setLoading(true);
    setError(null);

    if (isDemo) {
      const now = new Date().toISOString();
      const newNote: Note = {
        id: `demo-${Date.now()}`,
        title,
        content,
        insights: parseInsights(insights),
        summary: content.slice(0, 160),
        tags: parseTags(tags),
        links: parseLinks(links),
        confidence: 0.85,
        updatedAt: now,
        lastAccessedAt: now,
      };

      setNotes((prev) => [newNote, ...prev]);
      setActiveId(newNote.id);
      setTitle("");
      setContent("");
      setInsights("");
      setTags("");
      setLinks("");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          insights: parseInsights(insights),
          tags: parseTags(tags),
          links: parseLinks(links),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      const data = await response.json();
      setNotes((prev) => [data.note, ...prev]);
      setActiveId(data.note.id);
      setTitle("");
      setContent("");
      setInsights("");
      setTags("");
      setLinks("");
    } catch {
      setError("Could not create note.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteNote(id: string) {
    setLoading(true);
    setError(null);

    if (isDemo) {
      setNotes((prev) => prev.filter((note) => note.id !== id));
      if (activeId === id) {
        setActiveId(null);
      }
      setLoading(false);
      return;
    }

    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      setNotes((prev) => prev.filter((note) => note.id !== id));
      if (activeId === id) {
        setActiveId(null);
      }
    } catch {
      setError("Could not delete note.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk() {
    setAsking(true);
    setAnswer(null);
    setError(null);

    if (isDemo) {
      const response = buildDemoAnswer(question, notes);
      setAnswer(response);
      setAsking(false);
      return;
    }

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error("Query failed");
      }

      const data = (await response.json()) as QueryResponse;
      setAnswer(data);
    } catch {
      setError("Could not answer the question.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="app-shell flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-800 bg-slate-950/70 backdrop-blur-xl flex flex-col">
        <div className="h-3" />
        <div className="px-6 pb-5 pt-1 border-b border-slate-800">
          <div className="flex items-center gap-5">
            <button
              className="group relative"
              aria-label="Neuronode Home"
            >
              <span className="absolute -inset-1 rounded-[22px] bg-gradient-to-br from-cyan-500/40 via-blue-500/30 to-purple-500/40 blur-md opacity-70 group-hover:opacity-100 transition" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-cyan-400/40 bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-xl">
                <span className="text-lg font-extrabold tracking-wide">N</span>
              </span>
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">NEURONODE</h1>
              <p className="text-[11px] text-slate-400 leading-tight">AI Second Brain</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                THINK. EXECUTE
              </div>
            </div>
          </div>
          <div className="mt-5 h-px w-full bg-gradient-to-r from-cyan-500/60 via-blue-500/40 to-transparent" />
        </div>
        
        <nav className="flex-1 mt-2 px-4 py-6 space-y-3">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Navigation</p>

          <button
            onClick={() => setActiveView('dashboard')}
            className={`nav-item ${activeView === 'dashboard' ? 'nav-item-active' : ''}`}
          >
            <span className="nav-accent" />
            <span className="nav-icon-box">📊</span>
            <span className="flex flex-col items-start">
              <span className="nav-label">Dashboard</span>
              <span className="nav-subtitle">System overview</span>
            </span>
          </button>

          <button
            onClick={() => setActiveView('notes')}
            className={`nav-item ${activeView === 'notes' ? 'nav-item-active' : ''}`}
          >
            <span className="nav-accent" />
            <span className="nav-icon-box">📝</span>
            <span className="flex flex-col items-start">
              <span className="nav-label">Notes</span>
              <span className="nav-subtitle">Knowledge entries</span>
            </span>
            <span className={`ml-auto neo-chip ${activeView === 'notes' ? 'text-white border-white/30 bg-white/10' : ''}`}>
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('analytics')}
            className={`nav-item ${activeView === 'analytics' ? 'nav-item-active' : ''}`}
          >
            <span className="nav-accent" />
            <span className="nav-icon-box">📈</span>
            <span className="flex flex-col items-start">
              <span className="nav-label">Analytics</span>
              <span className="nav-subtitle">Performance view</span>
            </span>
          </button>

          <button
            onClick={() => setActiveView('ai')}
            className={`nav-item ${activeView === 'ai' ? 'nav-item-active' : ''}`}
          >
            <span className="nav-accent" />
            <span className="nav-icon-box">🤖</span>
            <span className="flex flex-col items-start">
              <span className="nav-label">AI Assistant</span>
              <span className="nav-subtitle">Conversational help</span>
            </span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="neo-card flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Designed by</p>
              <p className="text-sm font-bold text-slate-100">Sujan</p>
            </div>
            <span className="neo-chip">2026</span>
          </div>
          <div className="neo-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Knowledge Health</p>
              <span className="neo-chip">Status</span>
            </div>
            <p className="text-2xl font-bold text-slate-100">
              {notes.length ? ((notes.reduce((sum, n) => sum + n.confidence, 0) / notes.length) * 100).toFixed(0) : 0}%
            </p>
            <div className="mt-3 h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${notes.length ? (notes.reduce((sum, n) => sum + n.confidence, 0) / notes.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Overall confidence health score</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-8">
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-3">
              <div className="neo-icon">🔍</div>
              <input
                type="text"
                placeholder="Search notes, tags, or ask AI..."
                className="neo-input"
              />
            </div>
          </div>
          <div className="flex items-center gap-4 ml-8">
            <button
              onClick={loadNotes}
              className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all text-slate-200"
              title="Refresh"
            >
              <span className="text-xl">↻</span>
            </button>
            <button className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-all relative text-slate-200">
              <span className="text-xl">🔔</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-200">Knowledge Base</p>
                <p className="text-xs text-slate-400">{notes.length} active notes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                K
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-8 mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-[20px]">
          {activeView === 'dashboard' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-6">
                <div className="neo-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-slate-400">Total Notes</h3>
                    <div className="neo-icon">📚</div>
                  </div>
                  <p className="text-2xl font-bold text-slate-100 mb-2">{notes.length}</p>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span>↗</span> Active knowledge
                  </p>
                </div>

                <div className="neo-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-slate-400">Total Tags</h3>
                    <div className="neo-icon">🏷️</div>
                  </div>
                  <p className="text-2xl font-bold text-slate-100 mb-2">
                    {Array.from(new Set(notes.flatMap(n => n.tags))).length}
                  </p>
                  <p className="text-[11px] text-purple-400 font-semibold flex items-center gap-1">
                    <span>↗</span> Categories
                  </p>
                </div>

                <div className="neo-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-slate-400">Avg Confidence</h3>
                    <div className="neo-icon">✨</div>
                  </div>
                  <p className="text-2xl font-bold text-slate-100 mb-2">
                    {notes.length ? ((notes.reduce((sum, n) => sum + n.confidence, 0) / notes.length) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span>↗</span> Strong recall
                  </p>
                </div>

                <div className="neo-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-semibold text-slate-400">AI Queries</h3>
                    <div className="neo-icon">🤖</div>
                  </div>
                  <p className="text-2xl font-bold text-slate-100 mb-2">{answer ? '1+' : '0'}</p>
                  <p className="text-[11px] text-orange-400 font-semibold flex items-center gap-1">
                    <span>↗</span> Today
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mt-6">
                {/* Knowledge Activity Chart */}
                <div className="col-span-2 neo-card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="neo-icon">📈</div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Knowledge Activity</h3>
                        <p className="text-xs text-slate-400 mt-1">Notes activity over time</p>
                      </div>
                    </div>
                    <button className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold">View All →</button>
                  </div>
                  <div className="flex items-end justify-between gap-3 h-48">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                      const maxCount = Math.max(1, ...weeklyCounts);
                      const ratio = weeklyCounts[i] / maxCount;
                      const height = Math.max(12, Math.round(ratio * 100));
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-3">
                          <div className="w-full relative group">
                            <div
                              className="w-full bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t-xl transition-all group-hover:from-purple-500 group-hover:to-blue-400 cursor-pointer"
                              style={{ height: `${height}%` }}
                              title={`${weeklyCounts[i]} note${weeklyCounts[i] === 1 ? "" : "s"}`}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-400">{day[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="neo-card bg-gradient-to-br from-cyan-600 to-blue-700 text-white">
                  <h3 className="text-base font-bold mb-2">Quick Actions</h3>
                  <p className="text-xs text-blue-100 mb-6">Create and explore</p>
                  <div className="grid gap-3">
                    <button
                      onClick={() => setActiveView('notes')}
                      className="nav-item text-white border-white/20 bg-white/10 hover:bg-white/20"
                    >
                      <span className="nav-accent" />
                      <span className="nav-icon-box">➕</span>
                      <span className="flex flex-col items-start">
                        <span className="nav-label text-white">Create Note</span>
                        <span className="nav-subtitle text-blue-100">New knowledge</span>
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveView('ai')}
                      className="nav-item text-white border-white/20 bg-white/10 hover:bg-white/20"
                    >
                      <span className="nav-accent" />
                      <span className="nav-icon-box">💬</span>
                      <span className="flex flex-col items-start">
                        <span className="nav-label text-white">Ask AI</span>
                        <span className="nav-subtitle text-blue-100">Instant insights</span>
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveView('analytics')}
                      className="nav-item text-white border-white/20 bg-white/10 hover:bg-white/20"
                    >
                      <span className="nav-accent" />
                      <span className="nav-icon-box">📊</span>
                      <span className="flex flex-col items-start">
                        <span className="nav-label text-white">View Stats</span>
                        <span className="nav-subtitle text-blue-100">Performance</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                {/* Recent Notes */}
                <div className="neo-card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="neo-icon">📝</div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Recent Notes</h3>
                        <p className="text-xs text-slate-400 mt-1">Your latest knowledge</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveView('notes')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      See All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notes.slice(0, 4).map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 cursor-pointer transition-all group"
                        onClick={() => {
                          setActiveId(note.id);
                          setActiveView('notes');
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xl flex-shrink-0">
                          📝
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                            {note.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {note.summary || note.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {(note.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-3xl mb-2">📝</p>
                        <p className="text-sm">No notes yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tag Cloud */}
                <div className="neo-card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="neo-icon -ml-1">🏷️</div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Popular Tags</h3>
                        <p className="text-xs text-slate-400 mt-1">Your knowledge categories</p>
                        <div className="h-4" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {Array.from(new Set(notes.flatMap(n => n.tags)))
                      .slice(0, 15)
                      .map((tag, i) => {
                        const colors = [
                          'bg-cyan-500/10 text-cyan-300 border-cyan-400/30',
                          'bg-purple-500/10 text-purple-300 border-purple-400/30',
                          'bg-emerald-500/10 text-emerald-300 border-emerald-400/30',
                          'bg-orange-500/10 text-orange-300 border-orange-400/30',
                          'bg-pink-500/10 text-pink-300 border-pink-400/30',
                        ];
                        return (
                          <span
                            key={tag}
                            className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold border cursor-pointer hover:scale-105 transition-all ${colors[i % colors.length]}`}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    {notes.length === 0 && (
                      <div className="w-full text-center py-8 text-slate-400">
                        <p className="text-3xl mb-2">🏷️</p>
                        <p className="text-sm">No tags yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'notes' && (
            <div className="max-w-7xl mx-auto">
              <div className="neo-card mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="neo-icon">📝</span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Notes</h2>
                    <p className="text-xs text-slate-400">Create and manage your knowledge base</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {/* Create Note Form */}
                <div className="col-span-1 neo-card h-fit sticky top-0">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                    <h3 className="text-base font-bold text-slate-100">📝 Create Note</h3>
                    <button
                      onClick={() => {
                        setTitle("");
                        setContent("");
                        setInsights("");
                        setTags("");
                        setLinks("");
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-4">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="neo-input font-semibold"
                      placeholder="Note title..."
                    />
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="neo-input min-h-[120px] resize-none"
                      placeholder="Write your core note here..."
                    />
                    <textarea
                      value={insights}
                      onChange={(e) => setInsights(e.target.value)}
                      className="neo-input text-sm h-20 resize-none"
                      placeholder="Key insights (one per line)..."
                    />
                    <input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="neo-input text-sm"
                      placeholder="Tags (comma-separated)..."
                    />
                    <textarea
                      value={links}
                      onChange={(e) => setLinks(e.target.value)}
                      className="neo-input text-sm h-16 resize-none"
                      placeholder="Links (Label | URL, one per line)..."
                    />
                  </div>
                  <button
                    onClick={handleCreateNote}
                    disabled={loading || !title || !content}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? "⏳ Saving..." : "💾 Save Note"}
                  </button>
                </div>

                {/* Notes List */}
                <div className="col-span-2 space-y-5">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`group neo-card p-7 border transition-all cursor-pointer ${
                        activeId === note.id
                          ? "border-cyan-400/60 shadow-lg shadow-cyan-500/20"
                          : "border-slate-800 hover:border-cyan-500/40 hover:shadow-md"
                      }`}
                      onClick={() => setActiveId(note.id)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors mb-1">
                            {note.title}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Updated {formatDate(note.updatedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full">
                            {(note.confidence * 100).toFixed(0)}%
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-red-300 transition-all"
                            title="Delete note"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 mb-4">{note.summary || note.content}</p>
                      {note.insights.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[11px] font-bold text-purple-300 mb-2 uppercase tracking-wider">Insights</p>
                          <div className="space-y-1">
                            {note.insights.map((insight, i) => (
                              <p key={i} className="text-[11px] text-slate-300 pl-3 border-l-2 border-purple-400/40">
                                {insight}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-400/30"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {note.links.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-800">
                          <p className="text-[11px] font-bold text-slate-400 mb-2">Links</p>
                          <div className="flex flex-wrap gap-2">
                            {note.links.map((link) => (
                              <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                              >
                                🔗 {link.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <div className="bg-slate-900/60 rounded-3xl p-12 border border-slate-800 text-center">
                      <div className="text-6xl mb-4">📝</div>
                      <h3 className="text-xl font-bold text-slate-100 mb-2">No notes yet</h3>
                      <p className="text-slate-400">Create your first note to get started with your knowledge base</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="max-w-7xl mx-auto">
              <div className="neo-card mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="neo-icon">📈</span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">Analytics</h2>
                    <p className="text-xs text-slate-400">Insights about your knowledge base</p>
                    <div className="h-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="neo-card">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">Confidence Distribution</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Excellent (80-100%)', gradient: 'linear-gradient(90deg, #34d399, #10b981)', count: notes.filter(n => n.confidence >= 0.8).length },
                      { label: 'Good (60-80%)', gradient: 'linear-gradient(90deg, #22d3ee, #3b82f6)', count: notes.filter(n => n.confidence >= 0.6 && n.confidence < 0.8).length },
                      { label: 'Fair  (40-60%)', gradient: 'linear-gradient(90deg, #fb923c, #f59e0b)', count: notes.filter(n => n.confidence >= 0.4 && n.confidence < 0.6).length },
                      { label: 'Low (<40%)', gradient: 'linear-gradient(90deg, #f87171, #ef4444)', count: notes.filter(n => n.confidence < 0.4).length },
                    ].map((item) => (
                      <div key={item.label} className="nav-item">
                        <span className="nav-accent" />
                        <span className="nav-icon-box">⬤</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-300">{item.label}</span>
                            <span className="text-[11px] font-bold text-slate-100">{item.count}</span>
                          </div>
                          <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${notes.length ? (item.count / notes.length) * 100 : 0}%`,
                                background: item.gradient,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="neo-card">
                  <h3 className="text-lg font-bold text-slate-100 mb-4">Top Tags</h3>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(new Set(notes.flatMap(n => n.tags)))
                      .slice(0, 20)
                      .map((tag, i) => {
                        const count = notes.filter(n => n.tags.includes(tag)).length;
                        const colors = [
                          'bg-cyan-500/10 text-cyan-300',
                          'bg-purple-500/10 text-purple-300',
                          'bg-emerald-500/10 text-emerald-300',
                          'bg-orange-500/10 text-orange-300',
                          'bg-pink-500/10 text-pink-300',
                        ];
                        return (
                          <span
                            key={tag}
                            className={`neo-chip border border-slate-700 ${colors[i % colors.length]}`}
                            style={{ fontSize: `${Math.max(0.75, Math.min(1.1, count * 0.2))}rem` }}
                          >
                            {tag} ({count})
                          </span>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'ai' && (
            <div className="max-w-4xl mx-auto">
              <div className="neo-card mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="neo-icon">🤖</span>
                  <div>
                    <h2 className="text-lg font-bold text-slate-100">AI Assistant</h2>
                    <p className="text-xs text-slate-400">Ask questions about your knowledge base</p>
                  </div>
                </div>
              </div>

              <div className="neo-card">
                <div className="flex gap-3 mb-6">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !asking && question && handleAsk()}
                    className="neo-input px-5 py-3 text-sm font-medium"
                    placeholder="Ask me anything about your notes..."
                  />
                  <button
                    onClick={handleAsk}
                    disabled={asking || !question}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {asking ? "⏳ Thinking..." : "🚀 Ask AI"}
                  </button>
                </div>

                {answer && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-gradient-to-br from-slate-900/60 to-slate-950/60 border-2 border-cyan-400/30 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🤖</span>
                        <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">AI Response</span>
                      </div>
                      <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-medium">
                        {answer.answer}
                      </div>
                    </div>
                    {answer.sources.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-300 mb-3">📚 Referenced Notes ({answer.sources.length})</p>
                        <div className="grid grid-cols-2 gap-5">
                          {answer.sources.map((source) => (
                            <div
                              key={source.id}
                              onClick={() => {
                                setActiveId(source.id);
                                setActiveView('notes');
                              }}
                              className="cursor-pointer rounded-xl border-2 border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:shadow-md"
                            >
                              📝 {source.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!answer && !asking && (
                  <div className="neo-card mt-4 w-full text-center py-10 flex flex-col items-center">
                    <div className="text-7xl mb-4">🤖</div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">Your AI Knowledge Agent</h3>
                    <p className="text-sm text-slate-400 max-w-xl">
                      Ask any question to get detailed, expert-level answers based on your notes and general knowledge
                    </p>
                  </div>
                )}

                {asking && (
                  <div className="neo-card mt-4 text-center py-10">
                    <div className="text-7xl mb-4 animate-bounce">🧠</div>
                    <h3 className="text-2xl font-bold text-slate-100 mb-2">Thinking...</h3>
                    <p className="text-sm text-slate-400">Analyzing your knowledge base and formulating an answer</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

