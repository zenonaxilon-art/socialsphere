import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import type { Post } from '@/types';
import { formatDistanceToNow, cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export const getRoleClass = (role?: string) => {
  switch (role) {
    case 'owner': return 'role-owner font-bold';
    case 'admin': return 'role-admin font-semibold';
    case 'moderator': return 'role-moderator font-semibold';
    default: return 'text-foreground font-medium';
  }
};

export function PostCard({ post }: { post: Post; key?: string | number }) {
  const { likePost } = useAppStore();

  return (
    <motion.article 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[480px] mx-auto bg-zinc-900/40 border border-zinc-800/60 rounded-3xl overflow-hidden flex flex-col shadow-2xl mb-8"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer">
          <div className={cn("w-10 h-10 rounded-full overflow-hidden p-[2px]", 
            post.user?.role === 'owner' && 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500',
            post.user?.role === 'admin' && 'bg-gradient-to-tr from-pink-500 to-orange-400'
          )}>
            <img 
              src={post.user?.avatarUrl || `https://ui-avatars.com/api/?name=${post.user?.username}`} 
              alt={post.user?.username} 
              className="w-full h-full object-cover rounded-full border-2 border-background"
            />
          </div>
          <div>
            <div className="flex items-center space-x-1">
              <span className={cn("text-sm", getRoleClass(post.user?.role))}>
                {post.user?.username}
              </span>
              {(post.user?.role === 'owner' || post.user?.role === 'admin' || post.user?.followersCount! >= 1000) && (
                <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.996 22a9.996 9.996 0 100-19.992 9.996 9.996 0 000 19.992zm-2.852-6.52l-3.32-3.32 1.414-1.414 1.906 1.906 5.56-5.56 1.414 1.414-6.974 6.974z" />
                </svg>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(post.createdAt)}</span>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-secondary/50 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {post.images && post.images.length > 0 ? (
        <div className="w-full bg-secondary/20 aspect-[4/5] sm:aspect-square md:aspect-auto md:max-h-[600px] overflow-hidden flex items-center justify-center">
          <img 
            src={post.images[0]} 
            alt="Post content" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="px-4 pb-2 text-base sm:text-lg text-foreground">
          <span className="whitespace-pre-wrap">{post.content}</span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3 text-foreground">
          <div className="flex items-center space-x-4">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={() => likePost(post.id)}
              className={cn("hover:text-muted-foreground transition-colors", post.isLiked && "text-red-500 hover:text-red-600")}
            >
              <Heart className={cn("w-6 h-6", post.isLiked && "fill-current")} />
            </motion.button>
            <button className="hover:text-muted-foreground transition-colors">
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="hover:text-muted-foreground transition-colors">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button className="hover:text-muted-foreground transition-colors">
            <Bookmark className="w-6 h-6" />
          </button>
        </div>

        <div className="font-semibold text-sm mb-2 text-foreground">
          {post.likesCount?.toLocaleString()} likes
        </div>

        {post.images && post.images.length > 0 && (
          <div className="text-sm text-foreground">
            <span className={cn("mr-2", getRoleClass(post.user?.role))}>
              {post.user?.username}
            </span>
            <span className="whitespace-pre-wrap">{post.content}</span>
          </div>
        )}

        {post.commentsCount > 0 && (
          <button className="text-muted-foreground text-sm mt-2 font-medium">
            View all {post.commentsCount} comments
          </button>
        )}
      </div>
    </motion.article>
  );
}
