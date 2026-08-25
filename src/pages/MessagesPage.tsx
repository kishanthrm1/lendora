import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, User as UserIcon, ArrowRight } from 'lucide-react';
import { supabase, type Conversation } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!user) return;

    async function loadConversations() {
      const { data } = await supabase
        .from('conversations')
        .select(`
          *,
          item:items(*),
          participant_a_profile:profiles!conversations_participant_a_fkey(*),
          participant_b_profile:profiles!conversations_participant_b_fkey(*)
        `)
        .or(`participant_a.eq.${user!.id},participant_b.eq.${user!.id}`)
        .order('created_at', { ascending: false });

      setConversations(data as unknown as Conversation[]);
      setLoading(false);
    }
    loadConversations();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500">Your conversations with other users</p>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">No conversations yet.</p>
          <p className="mt-1 text-sm text-gray-400">Message an owner from any item page to start chatting.</p>
          <Link to="/browse" className="btn-primary mt-4">Browse items</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {conversations.map((conv) => {
            const isA = conv.participant_a === user?.id;
            const otherProfile = isA ? conv.participant_b_profile : conv.participant_a_profile;
            return (
              <Link
                key={conv.id}
                to={`/chat/${conv.id}`}
                className="card flex items-center gap-3 p-4 transition-all hover:shadow-md hover:border-teal-200"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-700">
                  {otherProfile?.full_name?.charAt(0).toUpperCase() || <UserIcon className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {otherProfile?.full_name || 'User'}
                  </p>
                  {conv.item && (
                    <p className="mt-0.5 text-xs text-gray-500">Re: {conv.item.title}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
