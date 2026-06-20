import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppStore } from '@/lib/store';
import { Grid, Bookmark, PlaySquare, Settings, Heart } from 'lucide-react';
import { PostCard } from '@/components/PostCard';
import { cn } from '@/lib/utils';

export function Profile() {
  const { username } = useParams();
  const { currentUser, posts } = useAppStore();
  
  // For demo: if not current user, find from posts, else show a placeholder or current user.
  const profileUser = username === currentUser?.username 
    ? currentUser 
    : posts.find(p => p.user?.username === username)?.user || currentUser;

  const userPosts = posts.filter(p => p.userId === profileUser?.id);

  if (!profileUser) return <div className="p-8 text-center">User not found</div>;

  const getRoleClass = (role?: string) => {
    switch (role) {
      case 'owner': return 'role-owner text-xl font-bold';
      case 'admin': return 'role-admin text-xl font-bold';
      case 'moderator': return 'role-moderator text-xl font-bold';
      default: return 'text-foreground text-xl font-medium';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-20 md:pb-0 px-4 pt-8 md:pt-12">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className={cn("w-32 h-32 md:w-40 md:h-40 shrink-0 rounded-full overflow-hidden p-1", 
            profileUser.role === 'owner' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' :
            profileUser.role === 'admin' ? 'bg-gradient-to-tr from-pink-500 to-orange-400' :
            'bg-secondary'
          )}>
            <img 
              src={profileUser.avatarUrl || `https://ui-avatars.com/api/?name=${profileUser.username}`} 
              alt={profileUser.username} 
              className="w-full h-full object-cover rounded-full border-4 border-background"
            />
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <span className={getRoleClass(profileUser.role)}>{profileUser.username}</span>
              {(profileUser.role === 'owner' || profileUser.role === 'admin' || profileUser.followersCount >= 1000) && (
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.996 22a9.996 9.996 0 100-19.992 9.996 9.996 0 000 19.992zm-2.852-6.52l-3.32-3.32 1.414-1.414 1.906 1.906 5.56-5.56 1.414 1.414-6.974 6.974z" />
                </svg>
              )}
            </div>
            
            <div className="flex justify-center gap-2">
              {currentUser?.id === profileUser.id ? (
                <>
                  <Link to="/settings" className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm transition-colors">
                    Edit Profile
                  </Link>
                  <button className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg font-semibold text-sm transition-colors">
                    View Archive
                  </button>
                  <Link to="/settings" className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                    <Settings className="w-6 h-6" />
                  </Link>
                </>
              ) : (
                <button className="px-8 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors">
                  Follow
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-center md:justify-start gap-8 mb-4">
            <div className="text-center md:text-left"><span className="font-bold">{profileUser.postCount}</span> posts</div>
            <div className="text-center md:text-left"><span className="font-bold">{profileUser.followersCount.toLocaleString()}</span> followers</div>
            <div className="text-center md:text-left"><span className="font-bold">{profileUser.followingCount.toLocaleString()}</span> following</div>
          </div>

          <div>
            <h2 className="font-semibold mb-1">{profileUser.displayName}</h2>
            <p className="whitespace-pre-wrap">{profileUser.bio}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border mt-8 flex justify-center uppercase text-xs font-semibold tracking-widest text-muted-foreground">
        <button className="flex items-center gap-2 px-4 py-4 border-t border-foreground text-foreground -mt-px">
          <Grid className="w-4 h-4" /> Posts
        </button>
        <button className="flex items-center gap-2 px-4 py-4 hover:text-foreground transition-colors">
          <PlaySquare className="w-4 h-4" /> Reels
        </button>
        <button className="flex items-center gap-2 px-4 py-4 hover:text-foreground transition-colors">
          <Bookmark className="w-4 h-4" /> Saved
        </button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-4 mt-1">
        {userPosts.map(post => (
          <div key={post.id} className="aspect-square bg-secondary relative group cursor-pointer overflow-hidden rounded-sm md:rounded-lg">
            {post.images?.[0] ? (
              <img src={post.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full p-4 flex items-center justify-center text-center text-sm md:text-base group-hover:scale-110 transition-transform duration-500">
                {post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-4">
              <span className="flex items-center gap-1 font-bold text-lg"><Heart className="w-5 h-5 fill-white" /> {post.likesCount}</span>
            </div>
          </div>
        ))}
      </div>
      
      {userPosts.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          No posts yet.
        </div>
      )}
    </div>
  );
}
