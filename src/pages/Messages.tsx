import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Image, Plus, Users, ArrowLeft, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    fetchConversations();
    fetchInvites();
    
    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.new && id && payload.new.conversation_id === id) {
          fetchMessages(id);
        }
        fetchConversations();
      })
      .subscribe();
      
    const cpChannel = supabase.channel('public:conversation_participants')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${currentUser.id}` }, () => {
         fetchConversations();
      })
      .subscribe();
      
    const inviteChannel = supabase.channel('public:group_invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_invites', filter: `invitee_id=eq.${currentUser.id}` }, () => {
         fetchInvites();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(cpChannel);
      supabase.removeChannel(inviteChannel);
    };
  }, [currentUser, id]);

  useEffect(() => {
    if (id) {
      fetchMessages(id);
    } else {
      setMessages([]);
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const fetchInvites = async () => {
    const { data } = await supabase
      .from('group_invites')
      .select('*, group_chats(name, conversation_id, avatar_url), inviter:inviter_id(username)')
      .eq('invitee_id', currentUser?.id)
      .eq('status', 'pending');
      
    if (data) setInvites(data);
  };

  const respondToInvite = async (invite: any, status: 'accepted' | 'declined') => {
    try {
      await supabase.from('group_invites').update({ status }).eq('id', invite.id);
      if (status === 'accepted') {
        const convoId = invite.group_chats.conversation_id;
        
        await supabase.from('conversation_participants').insert({
          conversation_id: convoId,
          user_id: currentUser!.id
        });
        
        await supabase.from('group_members').insert({
          group_id: invite.group_id,
          user_id: currentUser!.id,
          role: 'member'
        });
        
        navigate(`/messages/${convoId}`);
      }
      fetchInvites();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const fetchConversations = async () => {
// ...
    if (!currentUser) return;
    
    // Custom query to get conversations and the other participant or group details
    const { data: cpData } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversation_id (
           is_group,
           updated_at,
           group_chats(name, avatar_url)
        )
      `)
      .eq('user_id', currentUser.id)
      .order('last_read_at', { ascending: false });

    if (cpData) {
      const convos = await Promise.all(cpData.map(async (cp: any) => {
        const convo = cp.conversations;
        let title = 'Chat';
        let avatar = '';

        if (convo.is_group && convo.group_chats && convo.group_chats.length > 0) {
          title = convo.group_chats[0].name;
          avatar = convo.group_chats[0].avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}`;
        } else {
          // fetch other participant
          const { data: otherUser } = await supabase
            .from('conversation_participants')
            .select('user_id, profiles!inner(username, avatar_url)')
            .eq('conversation_id', cp.conversation_id)
            .neq('user_id', currentUser.id)
            .limit(1)
            .single();
            
          if (otherUser && otherUser.profiles) {
             title = otherUser.profiles.username;
             avatar = otherUser.profiles.avatar_url || `https://ui-avatars.com/api/?name=${title}`;
          }
        }
        
        return {
          id: cp.conversation_id,
          title,
          avatar,
          updatedAt: convo.updated_at,
          isGroup: convo.is_group
        };
      }));
      setConversations(convos.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    }
  };

  const fetchMessages = async (convoId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(username, avatar_url)')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true });
      
    if (data) {
      setMessages(data);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMessage.trim() || !currentUser) return;

    try {
      await supabase.from('messages').insert({
        conversation_id: id,
        sender_id: currentUser.id,
        content: newMessage.trim(),
      });
      
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id);
      
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const createGroupChat = async (name: string, userIds: string[]) => {
    if (!currentUser) return;
    try {
      // 1. Create conversation
      const { data: convo, error: convoErr } = await supabase.from('conversations').insert({ is_group: true }).select().single();
      if (convoErr) throw convoErr;
      
      // 2. Create group chat
      const { data: group } = await supabase.from('group_chats').insert({
        conversation_id: convo.id,
        name,
        owner_id: currentUser.id
      }).select().single();
      
      // 3. Add owner to participants and members
      await supabase.from('conversation_participants').insert({ conversation_id: convo.id, user_id: currentUser.id });
      await supabase.from('group_members').insert({ group_id: group.id, user_id: currentUser.id, role: 'owner' });
      
      // 4. Send Invites to others
      if (userIds.length > 0) {
        const invites = userIds.map(uid => ({
          group_id: group.id,
          inviter_id: currentUser.id,
          invitee_id: uid
        }));
        await supabase.from('group_invites').insert(invites);
      }

      setIsGroupModalOpen(false);
      navigate(`/messages/${convo.id}`);
    } catch (err: any) {
      alert("Error creating group: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full min-h-screen bg-background flex">
      {/* Sidebar - conversations list */}
      <div className={cn("w-full md:w-80 border-r border-border flex flex-col", id ? 'hidden md:flex' : 'flex')}>
        <div className="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex items-center justify-between">
          <h2 className="text-xl font-bold">Messages</h2>
          <button onClick={() => setIsGroupModalOpen(true)} className="p-2 hover:bg-secondary rounded-full transition-colors" title="New Group">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {invites.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-2">Invites</h3>
              {invites.map(invite => (
                <div key={invite.id} className="bg-secondary/50 rounded-xl p-3 mb-2 border border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <img src={invite.group_chats.avatar_url || `https://ui-avatars.com/api/?name=${invite.group_chats.name}`} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="font-bold text-sm leading-tight">{invite.group_chats.name}</p>
                      <p className="text-xs text-muted-foreground">invited by @{invite.inviter?.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => respondToInvite(invite, 'accepted')} className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button onClick={() => respondToInvite(invite, 'declined')} className="flex-1 bg-background text-foreground text-xs font-bold py-1.5 rounded-lg border border-border flex items-center justify-center gap-1">
                      <X className="w-3 h-3" /> Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {conversations.length > 0 && <h3 className="px-3 text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-2">Conversations</h3>}
          {conversations.length === 0 && invites.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No messages yet.</p>
              <button onClick={() => setIsGroupModalOpen(true)} className="mt-4 text-primary font-bold">Start a conversation</button>
            </div>
          ) : (
            conversations.map(c => (
               <div 
                 key={c.id} 
                 onClick={() => navigate(`/messages/${c.id}`)}
                 className={cn("flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors", id === c.id ? "bg-primary/10" : "hover:bg-secondary")}
               >
                 <img src={c.avatar} alt="" className="w-12 h-12 rounded-full border border-border object-cover" />
                 <div className="flex-1 min-w-0">
                   <p className="font-bold truncate">{c.title}</p>
                   <p className="text-sm text-muted-foreground truncate">{c.isGroup ? 'Group Chat' : 'Direct Message'}</p>
                 </div>
               </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 flex flex-col h-screen", !id ? 'hidden md:flex' : 'flex')}>
        {id ? (
          <>
            <div className="p-4 border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10 flex items-center gap-3">
               <button onClick={() => navigate('/messages')} className="md:hidden p-2 hover:bg-secondary rounded-full">
                 <ArrowLeft className="w-5 h-5" />
               </button>
               {conversations.find(c => c.id === id) && (
                 <>
                   <img src={conversations.find(c => c.id === id)?.avatar} alt="" className="w-10 h-10 rounded-full border border-border object-cover" />
                   <h3 className="font-bold text-lg">{conversations.find(c => c.id === id)?.title}</h3>
                 </>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => {
                const isMine = m.sender_id === currentUser?.id;
                const showAvatar = !isMine && (i === messages.length - 1 || messages[i + 1]?.sender_id !== m.sender_id);
                return (
                  <div key={m.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                    <div className="flex gap-2 max-w-[70%]">
                      {!isMine && (
                        <div className="w-8 shrink-0 flex items-end">
                          {showAvatar ? (
                             <img src={m.sender?.avatar_url || `https://ui-avatars.com/api/?name=${m.sender?.username}`} alt="" className="w-8 h-8 rounded-full border border-border object-cover" />
                          ) : <div className="w-8 h-8" />}
                        </div>
                      )}
                      
                      <div className={cn("px-4 py-2 rounded-2xl", isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm")}>
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-4 bg-background border-t border-border">
              <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                <button type="button" className="p-3 text-muted-foreground hover:bg-secondary rounded-xl transition-colors">
                  <Image className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Message..."
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="submit" disabled={!newMessage.trim()} className="p-3 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all font-bold flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <Send className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p>Select a chat or start a new conversation.</p>
          </div>
        )}
      </div>

      {/* Group Modal could go here, omitting full form logic for brevity, but could use prompt */}
      {isGroupModalOpen && (
        <GroupChatModal onClose={() => setIsGroupModalOpen(false)} onCreate={createGroupChat} />
      )}
    </div>
  );
}

function GroupChatModal({ onClose, onCreate }: { onClose: () => void, onCreate: (name: string, users: string[]) => void }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  useEffect(() => {
    if (query.trim().length > 0) {
      supabase.from('profiles').select('*').ilike('username', `%${query}%`).limit(5)
        .then(({ data }) => setUsers(data || []));
    } else {
      setUsers([]);
    }
  }, [query]);

  const toggleUser = (u: any) => {
    if (selectedUsers.find(su => su.id === u.id)) {
      setSelectedUsers(selectedUsers.filter(su => su.id !== u.id));
    } else {
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-border w-full max-w-md rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Create Group Chat</h2>
        
        <input 
           value={name} onChange={e=>setName(e.target.value)}
           placeholder="Group Name"
           className="w-full bg-secondary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
        />

        <input 
           value={query} onChange={e=>setQuery(e.target.value)}
           placeholder="Search users..."
           className="w-full bg-secondary border border-border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
        />
        
        <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
           {users.map(u => (
             <div key={u.id} onClick={() => toggleUser(u)} className="flex items-center justify-between p-2 hover:bg-secondary rounded-lg cursor-pointer">
               <div className="flex items-center gap-2">
                 <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.username}`} className="w-8 h-8 rounded-full" />
                 <span>{u.username}</span>
               </div>
               {selectedUsers.find(su => su.id === u.id) && <div className="w-4 h-4 rounded-full bg-primary" />}
             </div>
           ))}
        </div>

        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
             {selectedUsers.map(u => (
               <span key={u.id} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">{u.username}</span>
             ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 font-bold hover:bg-secondary rounded-xl transition-colors">Cancel</button>
          <button 
             onClick={() => onCreate(name || 'Group Chat', selectedUsers.map(u => u.id))} 
             disabled={selectedUsers.length === 0}
             className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl transition-colors disabled:opacity-50"
          >
             Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
