import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, User as UserIcon } from 'lucide-react';
import { supabase, type Message, type Item, type Profile } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function ChatPage() {
  const { conversationId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [item, setItem] = useState<Item | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!conversationId || !user) return;

    async function loadConversation() {
      const { data: conv } = await supabase
        .from('conversations')
        .select('*, item:items(*)')
        .eq('id', conversationId!)
        .maybeSingle();

      if (!conv) {
        setLoading(false);
        return;
      }

      const convData = conv as { id: string; item_id: string; participant_a: string; participant_b: string; item: Item };
      setItem(convData.item);

      const otherId = convData.participant_a === user!.id ? convData.participant_b : convData.participant_a;
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId)
        .maybeSingle();
      setOtherUser(otherProfile as Profile);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      setMessages(msgs as Message[]);

      // Mark received messages as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId!)
        .neq('sender_id', user!.id);

      setLoading(false);
    }
    loadConversation();
  }, [conversationId, user, authLoading, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !user) return;
    setSending(true);

    const { data } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: newMessage.trim(),
      })
      .select('*')
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as Message]);
      setNewMessage('');
    }
    setSending(false);
  };

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
            {otherUser?.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-bold text-gray-900">
              {otherUser?.full_name || 'User'}
            </p>
            {item && (
              <Link to={`/item/${item.id}`} className="text-xs text-teal-600 hover:text-teal-700">
                Re: {item.title}
              </Link>
            )}
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-[400px] space-y-3 overflow-y-auto bg-gray-50 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">No messages yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-100'
                    }`}
                  >
                    <p>{msg.body}</p>
                    <p className={`mt-1 text-xs ${isMe ? 'text-teal-100' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={sending || !newMessage.trim()} className="btn-primary">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
