import React, { useState } from 'react';
import { StoriesBar } from '@/components/StoriesBar';
import { PostCard } from '@/components/PostCard';
import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';

export function Home() {
  const { posts } = useAppStore();

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 md:pb-0">
      <div className="pt-6 px-4 md:px-0">
        <StoriesBar />
        
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {posts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              No posts yet. Follow some people or create one!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
