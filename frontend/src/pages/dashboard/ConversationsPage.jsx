import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Send, Users, Mail, Loader2, MessagesSquare } from 'lucide-react';
import { fetchConversations, fetchConversationMessages } from '../../services/api';

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle },
  telegram: { label: 'Telegram', Icon: Send },
  messenger: { label: 'Messenger', Icon: Users },
  email: { label: 'Email', Icon: Mail },
};

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const loadList = useCallback(async () => {
    const data = await fetchConversations();
    setConversations(data.conversations);
    setLoading(false);
    if (!selectedId && data.conversations.length > 0) {
      setSelectedId(data.conversations[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    setThreadLoading(true);
    fetchConversationMessages(selectedId).then((data) => {
      setThread(data);
      setThreadLoading(false);
    });
  }, [selectedId]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <MessagesSquare className="h-5 w-5 text-signal" strokeWidth={1.75} />
        <h1 className="font-display text-2xl font-semibold text-ink">Conversations</h1>
      </div>
      <p className="mb-6 text-sm text-ink-muted">Every conversation your AI is having, across every channel.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
        </div>
      ) : conversations.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-14 text-center">
          <MessagesSquare className="h-6 w-6 text-ink-faint" />
          <p className="text-sm text-ink-muted">No conversations yet. Once a channel is connected, real customer chats show up here.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Conversation list */}
          <div className="panel max-h-[70vh] overflow-y-auto">
            {conversations.map((conv) => {
              const meta = CHANNEL_META[conv.channel] || CHANNEL_META.whatsapp;
              const isActive = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`flex w-full items-start gap-2.5 border-b border-void-border p-4 text-left transition-colors last:border-b-0 ${
                    isActive ? 'bg-void-elevated' : 'hover:bg-void-elevated/50'
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-void-elevated">
                    <meta.Icon className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-ink">{conv.display_name || conv.external_user_id}</p>
                      <span className="shrink-0 text-[11px] text-ink-faint">{timeAgo(conv.last_message_at)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {conv.last_message_direction === 'outbound' && <span className="text-ink-faint">You: </span>}
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                    {conv.last_intent === 'order_confirmation' && (
                      <span className="mt-1 inline-block rounded-full bg-wire-on/15 px-2 py-0.5 text-[10px] text-wire-on">
                        Order confirmed
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Message thread */}
          <div className="panel flex max-h-[70vh] flex-col overflow-hidden">
            {threadLoading || !thread ? (
              <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <div className="border-b border-void-border p-4">
                  <p className="font-display text-sm font-semibold text-ink">
                    {thread.session.display_name || thread.session.external_user_id}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {CHANNEL_META[thread.session.channel]?.label || thread.session.channel} &middot; {thread.session.external_user_id}
                  </p>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
                        msg.direction === 'outbound'
                          ? 'ml-auto rounded-br-sm bg-signal text-void'
                          : 'rounded-bl-sm bg-void-elevated text-ink'
                      }`}
                    >
                      {msg.content}
                      <div className={`mt-1 text-[10px] ${msg.direction === 'outbound' ? 'text-void/60' : 'text-ink-faint'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.provider_used && ` · via ${msg.provider_used}`}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
