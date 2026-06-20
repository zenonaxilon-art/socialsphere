import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Search as SearchIcon, User, Image, Hash, PlaySquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PostCard } from '@/components/PostCard';
import { cn } from '@/lib/utils';
import { getRoleClass } from '@/components/PostCard';

export function Search() {
  const { currentUser } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  
  const [results, setResults] = useState({
    users: [],
    posts: [],
    hashtags: []
  });
  
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRecentSearches();
  }, [currentUser]);

  useEffect(() => {
    if (query.trim().length > 0) {
      const delay = setTimeout(() => {
        performSearch(query);
      }, 300);
      return () => clearTimeout(delay);
    } else {
      setResults({ users: [], posts: [], hashtags: [] });
    }
  }, [query, activeTab]);

  const fetchRecentSearches = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentSearches(data);
  };

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      if (activeTab === 'users' || activeTab === 'all') {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `%${searchQuery}%`)
          .limit(10);
        
        setResults(prev => ({ ...prev, users: usersData || [] }));
      }

      if (activeTab === 'posts' || activeTab === 'all') {
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .ilike('content', `%${searchQuery}%`)
          .limit(10);
          
        const formattedPosts = postsData?.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          content: p.content,
          images: p.images,
          likesCount: p.likes_count,
          commentsCount: p.comments_count,
          createdAt: p.created_at,
          user: {
            id: p.profiles.id,
            username: p.profiles.username,
            avatarUrl: p.profiles.avatar_url,
            role: p.profiles.role,
          }
        })) || [];
        
        setResults(prev => ({ ...prev, posts: formattedPosts }));
      }
      
      // Save to recent searches if submitted/debounced
      if (searchQuery.length > 2 && currentUser) {
         // Debounce saving
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const saveSearch = async (searchQuery: string) => {
    if (!currentUser || !searchQuery.trim()) return;
    await supabase.from('search_history').insert({
      user_id: currentUser.id,
      query: searchQuery.trim()
    });
    fetchRecentSearches();
  };

  return (
    <div className="max-w-4xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/40 p-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users, posts, or #hashtags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveSearch(query);
            }}
            className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          />
        </div>
        
        <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-none">
          {['all', 'users', 'posts', 'tags'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors border border-border",
                activeTab === tab ? "bg-foreground text-background" : "bg-transparent text-foreground hover:bg-secondary"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {query.length === 0 ? (
          <div>
            <h3 className="font-bold text-lg mb-4">Recent Searches</h3>
            <div className="space-y-2">
              {recentSearches.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-secondary rounded-xl cursor-pointer" onClick={() => setQuery(s.query)}>
                  <SearchIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{s.query}</span>
                </div>
              ))}
              {recentSearches.length === 0 && <p className="text-muted-foreground">No recent searches</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {isLoading && <div className="text-center py-8"><span className="block w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" /></div>}
            
            {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User className="w-5 h-5"/> Users</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {results.users.map((user: any) => (
                    <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:bg-secondary transition-colors">
                      <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} alt="" className="w-12 h-12 rounded-full object-cover border border-border" />
                      <div>
                        <p className={cn("font-bold text-base", getRoleClass(user.role))}>{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.display_name || `@${user.username}`}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Image className="w-5 h-5"/> Posts</h3>
                <div className="space-y-4">
                  {results.posts.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            )}
            
            {!isLoading && results.users.length === 0 && results.posts.length === 0 && (
               <div className="text-center py-20 text-muted-foreground">
                 No results found for "{query}"
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
