import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function StoriesBar() {
  const { stories, currentUser } = useAppStore();

  return (
    <div className="w-full max-w-[480px] mx-auto flex gap-4 overflow-x-auto hide-scrollbar mb-8 pt-4 justify-start sm:justify-center">
      
      {/* Current User Add Story */}
      <div className="flex flex-col items-center space-y-1 min-w-[72px] cursor-pointer group">
        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border group-hover:border-primary/50 transition-colors">
          <img 
            src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.username}`} 
            alt="Your story" 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-background flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Your story</span>
      </div>

      {stories.map((story) => (
        <motion.div 
          key={story.id} 
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center space-y-1 min-w-[72px] cursor-pointer"
        >
          <div className={cn("w-16 h-16 rounded-full overflow-hidden p-[2px]", 
            story.user?.role === 'owner' ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500' :
            story.user?.role === 'admin' ? 'bg-gradient-to-tr from-pink-500 to-orange-400' :
            'bg-gradient-to-tr from-yellow-400 to-fuchsia-600'
          )}>
            <img 
              src={story.user?.avatarUrl || `https://ui-avatars.com/api/?name=${story.user?.username}`} 
              alt={story.user?.username} 
              className="w-full h-full object-cover rounded-full border-2 border-background"
            />
          </div>
          <span className="text-xs text-foreground truncate w-16 text-center">
            {story.user?.username}
          </span>
        </motion.div>
      ))}

    </div>
  );
}
