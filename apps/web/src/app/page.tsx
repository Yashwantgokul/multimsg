"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Check, X, Bot, Activity, Clock, Settings, Users, Phone } from "lucide-react";

type Conversation = {
  id: string;
  contact: { displayName: string };
  messages: { text: string; direction: string; createdAt: string }[];
  tasks: { drafts: { id: string; body: string; status: string }[] }[];
  updatedAt: string;
};

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        setConversations(data);
        if (data.length > 0) setSelectedConvo(data[0]);
      })
      .catch(console.error);
  }, []);

  const handleApprove = async (draftId: string) => {
    await fetch(`http://localhost:3001/api/approvals/${draftId}/approve`, {
      method: "POST"
    });
    // refresh
    const res = await fetch("http://localhost:3001/api/conversations");
    const data = await res.json();
    setConversations(data);
    setSelectedConvo(data.find((c: any) => c.id === selectedConvo?.id));
  };

  const handleReject = async (draftId: string) => {
    await fetch(`http://localhost:3001/api/approvals/${draftId}/reject`, {
      method: "POST"
    });
    // refresh
    const res = await fetch("http://localhost:3001/api/conversations");
    const data = await res.json();
    setConversations(data);
    setSelectedConvo(data.find((c: any) => c.id === selectedConvo?.id));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex">
      {/* Sidebar */}
      <div className="w-20 lg:w-64 border-r border-white/5 bg-white/[0.02] flex flex-col backdrop-blur-3xl transition-all duration-300">
        <div className="p-4 flex items-center gap-3 border-b border-white/5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">OmniAgent</span>
        </div>
        
        <div className="flex-1 py-6 px-3 flex flex-col gap-2">
          <div className="px-3 py-2 text-xs font-semibold text-white/40 uppercase tracking-wider hidden lg:block">Menu</div>
          <button className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10 transition-colors group">
            <MessageSquare size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            <span className="font-medium hidden lg:block">Inbox</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:bg-white/5 transition-colors group">
            <Users size={20} className="group-hover:text-white/90 transition-colors" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/60 hover:bg-white/5 transition-colors group">
            <Activity size={20} className="group-hover:text-white/90 transition-colors" />
            <span className="font-medium hidden lg:block">Agent Activity</span>
          </button>
        </div>
        
        <div className="p-4 border-t border-white/5">
          <button className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-white/60 hover:bg-white/5 transition-colors group">
            <Settings size={20} className="group-hover:text-white/90 transition-colors" />
            <span className="font-medium hidden lg:block">Settings</span>
          </button>
        </div>
      </div>

      {/* Inbox List */}
      <div className="w-80 border-r border-white/5 bg-[#0d0d12] flex flex-col">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold">Messages</h2>
          <p className="text-sm text-white/40 mt-1">Simulated Inbox</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map(convo => {
            const lastMsg = convo.messages[0];
            const isSelected = selectedConvo?.id === convo.id;
            return (
              <div 
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-white/90">{convo.contact.displayName}</h3>
                  <span className="text-xs text-white/30"><Clock size={12} className="inline mr-1"/>Now</span>
                </div>
                <p className="text-sm text-white/50 truncate">
                  {lastMsg ? lastMsg.text : "No messages yet"}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a0c] to-[#12121a]">
        {selectedConvo ? (
          <>
            <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                  <Phone size={20} className="text-white/60" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{selectedConvo.contact.displayName}</h2>
                  <p className="text-sm text-emerald-400 font-medium">WhatsApp</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {selectedConvo.messages.map(msg => (
                <div key={msg.text} className="flex flex-col gap-2 max-w-xl">
                  <span className="text-xs text-white/40 uppercase tracking-wider pl-4">Incoming</span>
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-white/90 shadow-sm backdrop-blur-md">
                    {msg.text}
                  </div>
                </div>
              ))}

              {selectedConvo.tasks.map(task => 
                task.drafts.map(draft => (
                  <div key={draft.id} className="flex flex-col items-end gap-2 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                    <div className="flex items-center gap-2 pr-2">
                      <span className="text-xs text-indigo-400 font-medium uppercase tracking-wider">Pi Agent Draft</span>
                      <Bot size={14} className="text-indigo-400" />
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm p-5 max-w-xl shadow-[0_0_30px_rgba(99,102,241,0.1)] backdrop-blur-xl relative group">
                      
                      {draft.status === "PENDING" && (
                        <div className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/20">
                          <span className="text-[10px] font-bold text-white">!</span>
                        </div>
                      )}

                      <p className="text-white/90 leading-relaxed mb-5">
                        {draft.body}
                      </p>

                      {draft.status === "PENDING" && (
                        <div className="flex items-center gap-3 pt-4 border-t border-indigo-500/20">
                          <button 
                            onClick={() => handleApprove(draft.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95"
                          >
                            <Check size={18} />
                            Approve & Send
                          </button>
                          <button 
                            onClick={() => handleReject(draft.id)}
                            className="px-4 py-2.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200 active:scale-95"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}

                      {draft.status === "APPROVED" && (
                        <div className="flex items-center gap-2 pt-3 border-t border-emerald-500/20 text-emerald-400 text-sm font-medium">
                          <Check size={16} /> Approved for sending
                        </div>
                      )}
                      
                      {draft.status === "REJECTED" && (
                        <div className="flex items-center gap-2 pt-3 border-t border-red-500/20 text-red-400 text-sm font-medium">
                          <X size={16} /> Draft Rejected
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-white/20">
            <Bot size={64} className="opacity-50" />
            <p className="text-xl font-medium tracking-tight">Select a conversation to view agent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
