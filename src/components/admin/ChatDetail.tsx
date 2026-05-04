"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertCircle,
  Bot,
  User,
  GraduationCap,
  Send,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useChatSession, useChatReply } from "@/hooks/useChat";
import { useAuth } from "@/hooks/useAuth";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { PERSONA_LABELS } from "@/types/chat";
import type { ChatMessage, ChatPersona } from "@/types/chat";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString("cs", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERSONA_COLORS: Record<ChatPersona, string> = {
  ai_teacher: "bg-blue-100 text-blue-800",
  math_mentor: "bg-green-100 text-green-800",
  study_coach: "bg-amber-100 text-amber-800",
  language_mentor: "bg-purple-100 text-purple-800",
};

function isTeacherMessage(msg: ChatMessage): boolean {
  return msg.metadata?.sent_by === "teacher";
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isTeacher = isTeacherMessage(message);

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? "bg-gray-200 text-gray-600"
            : isTeacher
            ? "bg-emerald-100 text-emerald-700"
            : "bg-blue-100 text-blue-600"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : isTeacher ? (
          <GraduationCap className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className={`max-w-[75%] ${isUser ? "text-right" : ""}`}>
        {isTeacher && (
          <div className="text-xs text-emerald-600 font-medium mb-1">
            {message.metadata?.teacher_name ?? "Učitel"}
          </div>
        )}
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : isTeacher
              ? "bg-emerald-50 text-gray-900 border border-emerald-200 rounded-bl-md"
              : "bg-gray-100 text-gray-900 rounded-bl-md"
          }`}
        >
          {message.content || (
            <span className="italic text-gray-400">Prázdná zpráva</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
          {message.feedback_type === "like" && (
            <ThumbsUp className="w-3 h-3 text-green-500" />
          )}
          {message.feedback_type === "dislike" && (
            <ThumbsDown className="w-3 h-3 text-red-500" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reply input ──────────────────────────────────────────────────────────────

function ReplyInput({ sessionId }: { sessionId: number }) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reply = useChatReply();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    await reply.mutateAsync({ sessionId, content: trimmed });
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      <div className="flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Odpovědět jako učitel..."
          rows={1}
          maxLength={4000}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || reply.isPending}
          isLoading={reply.isPending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
      {reply.isError && (
        <p className="text-xs text-red-500 mt-2">
          {reply.error instanceof Error ? reply.error.message : "Nepodařilo se odeslat zprávu"}
        </p>
      )}
    </form>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function ChatDetail({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: session, isLoading, error } = useChatSession(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  if (isLoading) {
    return <LoadingPage message="Načítání chatu..." />;
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst chat</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : "Chat nenalezen"}
        </p>
        <Button variant="ghost" onClick={() => router.push("/admin/chats")}>
          Zpět na seznam
        </Button>
      </div>
    );
  }

  // Determine if the current admin/teacher can reply.
  // AI-only chats: anyone can reply as teacher.
  // The key logic: the admin can always reply as teacher into any chat.
  const canReply = !!user;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <button
          onClick={() => router.push("/admin/chats")}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {session.title || "Bez názvu"}
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {session.user.name}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PERSONA_COLORS[session.persona]}`}>
              <Bot className="w-3 h-3" />
              {PERSONA_LABELS[session.persona]}
            </span>
            <span className="text-gray-400">
              {session.messages.length} zpráv
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {session.messages.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Žádné zprávy v tomto chatu
          </div>
        ) : (
          session.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply input */}
      {canReply && <ReplyInput sessionId={sessionId} />}
    </div>
  );
}
