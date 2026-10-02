"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  MessageSquare, Check, X, Bot, Activity, Clock, Settings, Users, 
  Send, Plus, RefreshCw, AlertCircle, Sparkles, MessageCircle, 
  CheckCircle2, XCircle, ArrowUpRight
} from "lucide-react";

type ChannelType = "WHATSAPP" | "INSTAGRAM" | "MESSENGER";

type Message = {
  id: string;
  text: string;
  direction: "INBOUND" | "OUTBOUND";
  createdAt: string;
};

type Draft = {
  id: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "SENT";
  createdAt: string;
  expiresAt: string;
};

type Task = {
  id: string;
  status: string;
  createdAt: string;
  drafts: Draft[];
};

type Conversation = {
  id: string;
  contact: { displayName: string };
  account?: { channel: ChannelType };
  messages: Message[];
  tasks: Task[];
  updatedAt: string;
};

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "contacts" | "activity">("inbox");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Simulation form state
  const [simChannel, setSimChannel] = useState<ChannelType>("WHATSAPP");
  const [simSender, setSimSender] = useState("Sarah Miller");
  const [simText, setSimText] = useState("Can you please share the project timeline and specs for the new launch?");

  const fetchConversations = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/conversations");
      if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      const data: Conversation[] = await res.json();
      setConversations(data);
      setError(null);
      
      setSelectedConvoId((prev) => {
        if (prev && data.some((c) => c.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (err: any) {
      console.error("Failed to load conversations:", err);
      setError(err?.message || "Failed to connect to backend server on port 3001");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => {
      fetchConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const selectedConvo = conversations.find((c) => c.id === selectedConvoId) || null;

  const handleApprove = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      const res = await fetch(`http://localhost:3001/api/approvals/${draftId}/approve`, {
        method: "POST"
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to approve draft");
      }
      await fetchConversations(true);
    } catch (err: any) {
      alert("Error approving draft: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      const res = await fetch(`http://localhost:3001/api/approvals/${draftId}/reject`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to reject draft");
      await fetchConversations(true);
    } catch (err: any) {
      alert("Error rejecting draft: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simText.trim()) return;
    setIsSimulating(true);
    try {
      const res = await fetch("http://localhost:3001/api/messages/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: simChannel,
          senderName: simSender.trim() || "User",
          text: simText.trim()
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to simulate message");
      }
      const result = await res.json();
      setShowSimulateModal(false);
      setSimText("");
      await fetchConversations(true);
      if (result.conversationId) {
        setSelectedConvoId(result.conversationId);
      }
    } catch (err: any) {
      alert("Simulation error: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  const getChannelBadge = (channel?: ChannelType) => {
    switch (channel) {
      case "INSTAGRAM":
        return {
          label: "Instagram",
          color: "bg-pink-500/10 text-pink-400 border-pink-500/20",
          dot: "bg-pink-500"
        };
      case "MESSENGER":
        return {
          label: "Messenger",
          color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          dot: "bg-blue-500"
        };
      case "WHATSAPP":
      default:
        return {
          label: "WhatsApp",
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-500"
        };
    }
  };

  // Collect all drafts across all tasks for the activity log
  const allActivity = conversations.flatMap((c) =>
    c.tasks.flatMap((t) =>
      t.drafts.map((d) => ({
        ...d,
        contactName: c.contact.displayName,
        channel: c.account?.channel || "WHATSAPP"
      }))
    )
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-hidden flex flex-col">
      {/* Top Notification / Server Status Bar */}
      {error && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-400" />
            <span><strong>Backend Server Offline:</strong> {error}</span>
          </div>
          <button 
            onClick={() => fetchConversations()}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors"
          >
            <RefreshCw size={12} /> Retry Connection
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-18 lg:w-64 border-r border-white/5 bg-[#0d0e15] flex flex-col justify-between shrink-0">
          <div>
            <div className="p-4 lg:p-5 flex items-center gap-3 border-b border-white/5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Bot className="text-white" size={22} />
              </div>
              <div className="hidden lg:block">
                <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  OmniAgent
                </span>
                <span className="block text-[10px] text-indigo-400 font-mono tracking-wider">PI ORCHESTRATOR</span>
              </div>
            </div>

            <div className="py-4 px-2 lg:px-3 flex flex-col gap-1">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden lg:block">
                Channels
              </div>

              <button 
                onClick={() => setActiveTab("inbox")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeTab === "inbox" 
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <MessageSquare size={18} />
                <span className="font-medium text-sm hidden lg:block">Unified Inbox</span>
                {conversations.length > 0 && (
                  <span className="ml-auto hidden lg:inline-flex px-1.5 py-0.5 text-[11px] rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                    {conversations.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab("contacts")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeTab === "contacts" 
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Users size={18} />
                <span className="font-medium text-sm hidden lg:block">Contacts</span>
                <span className="ml-auto hidden lg:inline-flex px-1.5 py-0.5 text-[11px] rounded-full bg-white/5 text-slate-400 font-mono">
                  {conversations.length}
                </span>
              </button>

              <button 
                onClick={() => setActiveTab("activity")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  activeTab === "activity" 
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30" 
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Activity size={18} />
                <span className="font-medium text-sm hidden lg:block">Agent Audit Log</span>
                {allActivity.filter(a => a.status === "PENDING").length > 0 && (
                  <span className="ml-auto hidden lg:inline-flex px-1.5 py-0.5 text-[11px] rounded-full bg-amber-500/20 text-amber-300 font-mono">
                    {allActivity.filter(a => a.status === "PENDING").length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 border-t border-white/5 space-y-2">
            <div className="hidden lg:flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Fastify Backend
              </span>
              <span className="text-[10px] font-mono text-emerald-400">:3001</span>
            </div>

            <button className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-slate-400 hover:bg-white/5 hover:text-slate-200 text-xs transition-colors">
              <Settings size={16} />
              <span className="hidden lg:block">Meta Integrations</span>
            </button>
          </div>
        </aside>

        {/* Tab 1: Unified Inbox */}
        {activeTab === "inbox" && (
          <>
            {/* Conversation List */}
            <section className="w-80 lg:w-96 border-r border-white/5 bg-[#0b0c12] flex flex-col shrink-0">
              <div className="p-4 border-b border-white/5 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-white">Live Conversations</h2>
                  <p className="text-xs text-slate-400">Meta Multi-App Inbox</p>
                </div>
                
                <button
                  onClick={() => setShowSimulateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Simulate incoming message from Meta app"
                >
                  <Plus size={14} />
                  <span>Simulate</span>
                </button>
              </div>

              {/* Conversation items */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
                {loading && conversations.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
                    <RefreshCw size={24} className="animate-spin text-indigo-400" />
                    <span>Connecting to OmniAgent server...</span>
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-500">
                      <MessageSquare size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300">No messages yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Click &quot;Simulate&quot; to inject a mock incoming WhatsApp, Instagram, or Messenger message.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSimulateModal(true)}
                      className="mt-2 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors"
                    >
                      + Simulate Message
                    </button>
                  </div>
                ) : (
                  conversations.map((convo) => {
                    const lastMsg = convo.messages[convo.messages.length - 1];
                    const isSelected = selectedConvoId === convo.id;
                    const channelInfo = getChannelBadge(convo.account?.channel);
                    const pendingDraft = convo.tasks
                      .flatMap((t) => t.drafts)
                      .find((d) => d.status === "PENDING");

                    return (
                      <div
                        key={convo.id}
                        onClick={() => setSelectedConvoId(convo.id)}
                        className={`p-4 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-indigo-950/30 border-l-2 border-indigo-500"
                            : "hover:bg-white/[0.02] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-100">
                              {convo.contact.displayName || "Unknown User"}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${channelInfo.color} font-medium flex items-center gap-1`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${channelInfo.dot}`}></span>
                              {channelInfo.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(convo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                          {lastMsg ? lastMsg.text : "No messages recorded"}
                        </p>

                        {pendingDraft && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-medium">
                            <Sparkles size={11} className="text-amber-400" />
                            <span>1 Pi draft awaiting approval</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Conversation Detail & Approval Panel */}
            <main className="flex-1 flex flex-col bg-gradient-to-br from-[#090a0f] to-[#0f111a] overflow-hidden">
              {selectedConvo ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 lg:px-6 lg:py-4 border-b border-white/5 bg-[#0d0e15]/70 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300">
                        {selectedConvo.contact.displayName?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-semibold text-white">
                            {selectedConvo.contact.displayName}
                          </h2>
                          {(() => {
                            const badge = getChannelBadge(selectedConvo.account?.channel);
                            return (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.color} font-medium`}>
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-slate-500">
                          Thread ID: {selectedConvo.id.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fetchConversations(true)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Chat Stream & Draft Cards */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Inbound Messages */}
                    {selectedConvo.messages.map((msg) => (
                      <div
                        key={msg.id || msg.text}
                        className={`flex flex-col gap-1 max-w-xl ${
                          msg.direction === "OUTBOUND" ? "ml-auto items-end" : "items-start"
                        }`}
                      >
                        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
                          <span>{msg.direction === "OUTBOUND" ? "You (via Pi Agent)" : selectedConvo.contact.displayName}</span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-md shadow-sm ${
                            msg.direction === "OUTBOUND"
                              ? "bg-indigo-600 text-white rounded-tr-sm"
                              : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {/* Agent Tasks and Reply Drafts */}
                    {selectedConvo.tasks.map((task) =>
                      task.drafts.map((draft) => {
                        const isPending = draft.status === "PENDING";
                        const isApproved = draft.status === "APPROVED";
                        const isRejected = draft.status === "REJECTED";

                        return (
                          <div
                            key={draft.id}
                            className="flex flex-col items-end gap-2 mt-4 animate-in slide-in-from-bottom-3 duration-300"
                          >
                            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium px-2">
                              <Sparkles size={13} className="text-indigo-400" />
                              <span>Pi Agent Proposed Reply</span>
                            </div>

                            <div
                              className={`w-full max-w-xl rounded-2xl p-5 border backdrop-blur-xl relative transition-all ${
                                isPending
                                  ? "bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900/50 border-indigo-500/40 shadow-[0_0_35px_rgba(99,102,241,0.15)]"
                                  : isApproved
                                  ? "bg-emerald-950/20 border-emerald-500/30"
                                  : "bg-rose-950/20 border-rose-500/20 opacity-70"
                              }`}
                            >
                              {/* Status Indicator */}
                              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-xs">
                                <div className="flex items-center gap-1.5">
                                  {isPending && (
                                    <span className="flex items-center gap-1.5 text-amber-300 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                      Awaiting Your Approval
                                    </span>
                                  )}
                                  {isApproved && (
                                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      <CheckCircle2 size={13} />
                                      Approved & Dispatched to Meta API
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="flex items-center gap-1.5 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                      <XCircle size={13} />
                                      Draft Rejected
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {new Date(draft.createdAt).toLocaleTimeString()}
                                </span>
                              </div>

                              {/* Draft Body */}
                              <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">
                                {draft.body}
                              </p>

                              {/* Actions for Pending Drafts */}
                              {isPending && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                                  <button
                                    onClick={() => handleApprove(draft.id)}
                                    disabled={actionLoading === draft.id}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                                  >
                                    {actionLoading === draft.id ? (
                                      <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                    <span>Approve & Send</span>
                                  </button>

                                  <button
                                    onClick={() => handleReject(draft.id)}
                                    disabled={actionLoading === draft.id}
                                    className="py-2.5 px-4 rounded-xl border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 font-medium text-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500 p-8">
                  <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bot size={32} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base font-semibold text-slate-300">OmniAgent Orchestrator</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Select a conversation on the left or simulate a new Meta message to trigger your local Pi coding agent.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSimulateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Plus size={14} />
                    <span>Simulate Incoming Message</span>
                  </button>
                </div>
              )}
            </main>
          </>
        )}

        {/* Tab 2: Contacts */}
        {activeTab === "contacts" && (
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-2">Connected Contacts</h2>
              <p className="text-xs text-slate-400 mb-6">
                Active contacts received across WhatsApp, Messenger, and Instagram.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {conversations.map((c) => {
                  const channel = getChannelBadge(c.account?.channel);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedConvoId(c.id);
                        setActiveTab("inbox");
                      }}
                      className="p-5 rounded-2xl bg-[#0f111a] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                          {c.contact.displayName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-slate-200">
                            {c.contact.displayName}
                          </h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${channel.color} inline-block mt-1 font-medium`}>
                            {channel.label}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        )}

        {/* Tab 3: Agent Audit Log */}
        {activeTab === "activity" && (
          <main className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Pi Agent Activity Log</h2>
                  <p className="text-xs text-slate-400">
                    Audit trail of all message generations and human approval decisions.
                  </p>
                </div>
                <button
                  onClick={() => fetchConversations(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              <div className="space-y-3">
                {allActivity.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#0e1017] border border-white/5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{item.contactName}</span>
                        <span className="text-slate-500">via</span>
                        <span className="text-[10px] font-mono uppercase text-indigo-400">{item.channel}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        item.status === "APPROVED"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : item.status === "REJECTED"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 italic bg-black/20 p-2.5 rounded-lg border border-white/5">
                      &quot;{item.body}&quot;
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Generated at: {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Modal: Simulate Incoming Message */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11131c] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowSimulateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-base text-white">Simulate Meta Inbound</h3>
                <p className="text-xs text-slate-400">Test Pi agent draft generation in real-time</p>
              </div>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["WHATSAPP", "INSTAGRAM", "MESSENGER"] as ChannelType[]).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setSimChannel(ch)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all text-center ${
                        simChannel === ch
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {ch === "WHATSAPP" ? "WhatsApp" : ch === "INSTAGRAM" ? "Instagram" : "Messenger"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Incoming Message Text
                </label>
                <textarea
                  rows={3}
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Enter what the user says..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-[11px] text-slate-500 mb-1.5">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSimText("Hey! Can you send me the documents for the project?")}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                  >
                    📄 Send docs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimText("Are you free for a call tomorrow afternoon to discuss details?")}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                  >
                    📞 Schedule call
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimText("What is the pricing breakdown for your service packages?")}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                  >
                    💰 Pricing inquiry
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-400 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSimulating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Pi Drafting Reply...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Inject & Draft Reply</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
