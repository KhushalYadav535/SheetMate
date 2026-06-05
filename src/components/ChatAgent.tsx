// src/components/ChatAgent.tsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatAgent() {
  const router = useRouter();
  const [studentProfileId, setStudentProfileId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I am SheetMate AI. 📚 Tell me what worksheet you want to generate (e.g. 'Give me a Class 5 Math worksheet on Fractions, Easy difficulty')."
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync profile details on load
  useEffect(() => {
    const savedId = localStorage.getItem("sheetmate_profile_id");
    if (savedId) {
      setStudentProfileId(savedId);
      fetch(`/api/student/dashboard?id=${savedId}`)
        .then(res => {
          if (res.ok) return res.json();
        })
        .then(data => {
          if (data && data.profile) {
            setStudentProfile(data.profile);
            setMessages([
              {
                role: "assistant",
                content: `Hi ${data.profile.name}! 📚 I see you are in ${data.profile.grade} (${data.profile.board.replace("_", " ")}). Tell me what worksheet you want to generate (e.g. 'Science worksheet on Plants, Medium difficulty').`
              }
            ]);
          }
        })
        .catch(err => console.error("Error loading profile:", err));
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : input;
    if (!text.trim() || loading) return;

    if (textToSend === undefined) {
      setInput("");
    }

    const updatedHistory = [...messages, { role: "user", content: text } as ChatMessage];
    setMessages(updatedHistory);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: updatedHistory,
          profile: studentProfile ? {
            name: studentProfile.name,
            grade: studentProfile.grade,
            board: studentProfile.board
          } : null
        })
      });

      if (!res.ok) {
        throw new Error("Chat extraction API failed");
      }

      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "assistant", content: data.clarifyingMessage }]);

      if (data.params) {
        // Parameters resolved! Call generate API
        setMessages(prev => [
          ...prev, 
          { role: "assistant", content: "⚙️ Parameters verified! Generating your custom worksheet now..." }
        ]);

        const genRes = await fetch("/api/worksheets/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentProfileId,
            board: data.params.board || "CBSE",
            grade: data.params.grade || "Class 6",
            subject: data.params.subject || "MATH",
            topics: [data.params.topic || "General Topic"],
            difficulty: data.params.difficulty || "MEDIUM",
            includeAnswerKey: !!studentProfileId
          })
        });

        if (!genRes.ok) {
          const genErr = await genRes.json();
          throw new Error(genErr.error || "Failed to auto-generate worksheet");
        }

        const genData = await genRes.json();
        
        setMessages(prev => [
          ...prev, 
          { role: "assistant", content: "🎉 Worksheet generated successfully! Redirecting you now..." }
        ]);

        setTimeout(() => {
          router.push(`/worksheets/${genData.worksheetId}`);
        }, 1200);
      }

    } catch (err) {
      console.error("[Chatbot Error]:", err);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "⚠️ Sorry, I ran into an error. Please specify a valid subject (MATH, SCIENCE, ENGLISH, EVS, HINDI, or SST) and try again!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    handleSend(suggestion);
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(167, 139, 250, 0.4); }
          50% { box-shadow: 0 0 25px rgba(6, 182, 212, 0.6); }
          100% { box-shadow: 0 0 10px rgba(167, 139, 250, 0.4); }
        }
        @keyframes typing {
          0%, 100% { transform: translateY(0px); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .chat-floating-bubble {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 1000;
          border: 1px solid rgba(255, 255, 255, 0.15);
          animation: float 4s ease-in-out infinite, pulse-glow 3s ease-in-out infinite;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .chat-floating-bubble:hover {
          transform: scale(1.1) translateY(-4px);
        }
        .chat-container-panel {
          position: fixed;
          bottom: 105px;
          right: 30px;
          width: 380px;
          height: 520px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(25px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateY(20px);
          opacity: 0;
          pointer-events: none;
        }
        .chat-container-panel.active {
          transform: translateY(0);
          opacity: 1;
          pointer-events: all;
        }
        @media (max-width: 480px) {
          .chat-container-panel {
            width: calc(100vw - 40px);
            height: calc(100vh - 120px);
            right: 20px;
            bottom: 90px;
          }
        }
      `}</style>

      {/* Toggle Bubble */}
      <div className="chat-floating-bubble" onClick={() => setOpen(!open)}>
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </div>

      {/* Chat Window Panel */}
      <div className={`chat-container-panel ${open ? "active" : ""}`}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.1))",
          borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>SheetMate AI Helper</h3>
              <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "1px" }}>Online &bull; Adaptive practice agent</p>
            </div>
          </div>
          <button 
            onClick={() => setOpen(false)} 
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem" }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable Messages Box */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {messages.map((msg, idx) => {
            const isAI = msg.role === "assistant";
            return (
              <div 
                key={idx} 
                style={{
                  alignSelf: isAI ? "flex-start" : "flex-end",
                  maxWidth: "80%",
                  background: isAI ? "rgba(255,255,255,0.03)" : "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                  border: isAI ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                  borderRadius: isAI ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                  padding: "10px 14px",
                  fontSize: "0.85rem",
                  lineHeight: 1.4,
                  color: isAI ? "#e2e8f0" : "white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }}
              >
                {msg.content}
              </div>
            );
          })}

          {/* Suggested prompts list */}
          {messages.length === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Try asking like this:</p>
              {[
                "Class 5 Math worksheet on Fractions, Medium",
                "Grade 7 Science paper about Plants, Hard",
                "Class 3 English Nouns worksheets, Easy"
              ].map((sug, idx) => (
                <div
                  key={idx}
                  onClick={() => selectSuggestion(sug)}
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "0.75rem",
                    color: "var(--accent-cyan)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = "rgba(6, 182, 212, 0.05)";
                    e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.2)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                  }}
                >
                  💡 "{sug}"
                </div>
              ))}
            </div>
          )}

          {/* Typing Indicator */}
          {loading && (
            <div style={{
              alignSelf: "flex-start",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "12px 12px 12px 2px",
              padding: "12px 16px",
              display: "flex",
              gap: "4px",
              alignItems: "center"
            }}>
              {[0, 1, 2].map(dot => (
                <div 
                  key={dot} 
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--accent-cyan)",
                    animation: `typing 1s infinite ease-in-out`,
                    animationDelay: `${dot * 0.2}s`
                  }} 
                />
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            display: "flex",
            gap: "10px"
          }}
        >
          <input
            type="text"
            placeholder="Type your request here..."
            className="form-input"
            style={{ flex: 1, fontSize: "0.85rem", padding: "10px 14px", height: "auto" }}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ padding: "10px 16px", height: "auto" }}
            disabled={loading || !input.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}
