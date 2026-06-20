import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PostCard } from '@/components/PostCard';
import { Post, UserProfile } from '@/types';
import { Search, TrendingUp, Users, PlaySquare, Image as ImageIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getRoleClass } from '@/components/PostCard';

export function Explore() {
  const [discoverItems, setDiscoverItems] = useState<any[]>([]);
  const [trendingUsers, setTrendingUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchExploreData();
  }, []);

  const fetchExploreData = async () => {
    setIsLoading(true);
    try {
      // Fetch posts ordered by likes to simulate trending
      const { data: postsData } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('likes_count', { ascending: false })
        .limit(20);
        
      if (postsData) {
        setDiscoverItems(postsData.map((p: any) => ({
          type: 'post',
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
            displayName: p.profiles.display_name,
            avatarUrl: p.profiles.avatar_url,
            role: p.profiles.role,
          }
        })));
      }

      // Fetch users ordered by followers
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(5);

      if (usersData) {
        setTrendingUsers(usersData.map((u: any) => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
          role: u.role,
          followersCount: u.followers_count,
        } as UserProfile)));
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search`);
      // Optionally we could pass query in state or url, but for now we just redirect
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/40 p-4">
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users, posts, or #hashtags... Press Enter"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 pl-10 pr-4 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
          />
        </form>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold border-b-2 border-primary pb-1">Discover</h2>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <span className="block w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {discoverItems.map((item) => (
                <div key={item.id} className="break-inside-avoid relative group cursor-pointer rounded-2xl overflow-hidden border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  {item.images && item.images.length > 0 ? (
                    <img src={item.images[0]} alt="" className="w-full h-auto object-cover" />
                  ) : (
                    <div className="p-4 bg-secondary/30 min-h-[150px] flex items-center justify-center text-center">
                      <p className="text-sm font-medium line-clamp-4">{item.content}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold backdrop-blur-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-5 h-5" />
                      <span>{item.likesCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8 hidden lg:block">
          <div className="bg-secondary/30 rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Trending Creators</h2>
            </div>
            <div className="space-y-4">
              {trendingUsers.map(user => (
                <Link key={user.id} to={`/profile/${user.username}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-border" />
                    <div>
                      <p className={cn("text-sm font-bold group-hover:underline", getRoleClass(user.role))}>{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.followersCount.toLocaleString()} followers</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
