import { create } from 'zustand';
import { supabase } from './supabase';
import type { UserProfile, Post, Story, Role, Notification } from '@/types';
import { Session } from '@supabase/supabase-js';

interface AppState {
  currentUser: UserProfile | null;
  session: Session | null;
  posts: Post[];
  stories: Story[];
  notifications: Notification[];
  unreadNotifications: number;
  isDark: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
  toggleTheme: () => void;
  likePost: (id: string) => Promise<void>;
  addPost: (content: string, image?: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateProfile: (updates: any) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  session: null,
  posts: [],
  stories: [],
  notifications: [],
  unreadNotifications: 0,
  isDark: true, // Default to dark mode for premium look
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    if (get().isInitialized) return;
    set({ isInitialized: true });

    // 1. Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    set({ session });

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profile) {
        set({
          currentUser: {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            coverUrl: profile.cover_url,
            bio: profile.bio,
            website: profile.website,
            followersCount: profile.followers_count,
            followingCount: profile.following_count,
            postCount: profile.post_count,
            communityCount: profile.community_count,
            joinedAt: profile.joined_at,
            isOnline: profile.is_online,
            role: profile.role,
          }
        });
      }
    }

    // 2. Fetch initial data
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (postsData) {
      set({ 
        posts: postsData.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          content: p.content,
          images: p.images,
          likesCount: p.likes_count,
          commentsCount: p.comments_count,
          sharesCount: p.shares_count,
          savedCount: p.saved_count,
          createdAt: p.created_at,
          user: {
            id: p.profiles.id,
            username: p.profiles.username,
            displayName: p.profiles.display_name,
            avatarUrl: p.profiles.avatar_url,
            role: p.profiles.role,
            followersCount: p.profiles.followers_count,
          } as UserProfile
        }))
      });
    }

    // Check likes for current user if logged in
    const state = get();
    if (state.currentUser && postsData) {
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', state.currentUser.id);
        
      if (likesData) {
        const likedPostIds = new Set(likesData.map((l: any) => l.post_id));
        set((s) => ({
          posts: s.posts.map(p => ({
            ...p,
            isLiked: likedPostIds.has(p.id)
          }))
        }));
      }
    }

    // Fetch Stories
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*, profiles(*)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesData) {
      set({
        stories: storiesData.map((s: any) => ({
          id: s.id,
          userId: s.user_id,
          imageUrl: s.image_url,
          createdAt: s.created_at,
          expiresAt: s.expires_at,
          user: {
            id: s.profiles.id,
            username: s.profiles.username,
            avatarUrl: s.profiles.avatar_url,
            role: s.profiles.role,
          } as UserProfile
        }))
      });
    }

    // Fetch Notifications
    if (session?.user) {
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*, profiles:actor_id(*)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsData) {
        set({
          notifications: notificationsData.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            actorId: n.actor_id,
            type: n.type,
            title: n.title,
            message: n.message,
            referenceId: n.reference_id,
            referenceType: n.reference_type,
            read: n.read,
            createdAt: n.created_at,
            actor: n.profiles ? {
              id: n.profiles.id,
              username: n.profiles.username,
              avatarUrl: n.profiles.avatar_url,
              role: n.profiles.role,
            } as UserProfile : undefined
          })),
          unreadNotifications: notificationsData.filter((n: any) => !n.read).length
        });
      }
    }

    set({ isLoading: false });

    // 3. Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session });
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          set({
            currentUser: {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name,
              avatarUrl: profile.avatar_url,
              coverUrl: profile.cover_url,
              bio: profile.bio,
              website: profile.website,
              followersCount: profile.followers_count,
              followingCount: profile.following_count,
              postCount: profile.post_count,
              communityCount: profile.community_count,
              joinedAt: profile.joined_at,
              isOnline: profile.is_online,
              role: profile.role,
            }
          });
        }
      } else {
        set({ currentUser: null });
      }
    });

    // 4. Realtime subscriptions Setup
    supabase.channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload: any) => {
        // Fetch user profile for the new post
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).single();
        if(!profile) return;
        
        const newPost: Post = {
          id: payload.new.id,
          userId: payload.new.user_id,
          content: payload.new.content,
          images: payload.new.images,
          likesCount: payload.new.likes_count,
          commentsCount: payload.new.comments_count,
          sharesCount: payload.new.shares_count,
          savedCount: payload.new.saved_count,
          createdAt: payload.new.created_at,
          isLiked: false,
          user: {
            id: profile.id,
            username: profile.username,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            role: profile.role,
            followersCount: profile.followers_count,
          } as UserProfile
        };
        set((s) => ({ posts: [newPost, ...s.posts] }));
      })
      .subscribe();
      
    supabase.channel('public:likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, async (payload: any) => {
        // Update like counts
        if (payload.eventType === 'INSERT') {
           set((s) => ({
             posts: s.posts.map(p => {
               if (p.id === payload.new.post_id) {
                 return { ...p, likesCount: p.likesCount + 1, isLiked: s.currentUser?.id === payload.new.user_id ? true : p.isLiked };
               }
               return p;
             })
           }));
        } else if (payload.eventType === 'DELETE') {
           set((s) => ({
             posts: s.posts.map(p => {
               if (p.id === payload.old.post_id) {
                 return { ...p, likesCount: Math.max(0, p.likesCount - 1), isLiked: s.currentUser?.id === payload.old.user_id ? false : p.isLiked };
               }
               return p;
             })
           }));
        }
      })
      .subscribe();

    if (session?.user) {
      supabase.channel('public:notifications')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', payload.new.actor_id).single();
            const newNotif: Notification = {
              id: payload.new.id,
              userId: payload.new.user_id,
              actorId: payload.new.actor_id,
              type: payload.new.type,
              title: payload.new.title,
              message: payload.new.message,
              referenceId: payload.new.reference_id,
              referenceType: payload.new.reference_type,
              read: payload.new.read,
              createdAt: payload.new.created_at,
              actor: profile ? {
                id: profile.id,
                username: profile.username,
                avatarUrl: profile.avatar_url,
                role: profile.role,
              } as UserProfile : undefined
            };
            set((s) => ({
              notifications: [newNotif, ...s.notifications],
              unreadNotifications: payload.new.read ? s.unreadNotifications : s.unreadNotifications + 1
            }));
          } else if (payload.eventType === 'UPDATE') {
             set((s) => ({
               notifications: s.notifications.map(n => n.id === payload.new.id ? { ...n, read: payload.new.read } : n),
               unreadNotifications: s.notifications.map(n => n.id === payload.new.id ? { ...n, read: payload.new.read } : n).filter(n => !n.read).length
             }));
          } else if (payload.eventType === 'DELETE') {
             set((s) => ({
               notifications: s.notifications.filter(n => n.id !== payload.old.id),
               unreadNotifications: s.notifications.filter(n => n.id !== payload.old.id && !n.read).length
             }));
          }
        })
        .subscribe();
    }
  },
  
  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, session: null });
  },
  
  toggleTheme: () => set((state) => {
    const newDark = !state.isDark;
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return { isDark: newDark };
  }),

  likePost: async (id: string) => {
    const state = get();
    if (!state.currentUser) return;
    
    const post = state.posts.find(p => p.id === id);
    if (!post) return;

    if (post.isLiked) {
      // Optimistic update
      set((s) => ({
        posts: s.posts.map(p => p.id === id ? { ...p, isLiked: false, likesCount: p.likesCount - 1 } : p)
      }));
      await supabase.from('likes').delete().eq('user_id', state.currentUser.id).eq('post_id', id);
    } else {
      // Optimistic update
      set((s) => ({
        posts: s.posts.map(p => p.id === id ? { ...p, isLiked: true, likesCount: p.likesCount + 1 } : p)
      }));
      await supabase.from('likes').insert({ user_id: state.currentUser.id, post_id: id });
    }
  },

  addPost: async (content: string, image?: string) => {
    const state = get();
    if (!state.currentUser) return;
    
    await supabase.from('posts').insert({
      user_id: state.currentUser.id,
      content,
      images: image ? [image] : []
    });
  },

  markNotificationRead: async (id: string) => {
    const state = get();
    if (!state.currentUser) return;
    
    set((s) => {
      const newNotifs = s.notifications.map(n => n.id === id ? { ...n, read: true } : n);
      return {
        notifications: newNotifs,
        unreadNotifications: newNotifs.filter(n => !n.read).length
      };
    });
    
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  markAllNotificationsRead: async () => {
    const state = get();
    if (!state.currentUser) return;

    set((s) => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadNotifications: 0
    }));

    await supabase.from('notifications').update({ read: true }).eq('user_id', state.currentUser.id);
  },

  updateProfile: async (updates: any) => {
    const state = get();
    if (!state.currentUser) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.currentUser.id);

    if (error) throw error;

    // Update local state
    set((s) => {
      if (!s.currentUser) return s;
      return {
        currentUser: {
          ...s.currentUser,
          username: updates.username ?? s.currentUser.username,
          displayName: updates.display_name ?? s.currentUser.displayName,
          bio: updates.bio ?? s.currentUser.bio,
          avatarUrl: updates.avatar_url ?? s.currentUser.avatarUrl,
        }
      };
    });
  },
}));
