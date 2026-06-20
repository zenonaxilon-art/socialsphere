import React from 'react';
import { motion } from 'motion/react';
import { Heart, MessageCircle, Send, MoreHorizontal } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Reels() {
  const { posts } = useAppStore();
  // Using posts as reels since reels are missing
  const mockReels = posts.filter(p => p.images && p.images.length > 0);

  return (
    <div className="w-full h-screen overflow-y-scroll snap-y snap-mandatory bg-black text-white relative hide-scrollbar md:pb-0 pb-16">
      {mockReels.map((reel, idx) => (
        <div key={idx} className="w-full h-full md:h-screen snap-start relative flex items-center justify-center bg-black/95">
          {/* Reel Content */}
          <div className="relative w-full md:w-[450px] aspect-[9/16] md:h-auto md:max-h-[90vh] bg-secondary md:rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            <img 
              src={reel.images[0]} 
              className="w-full h-full object-cover" 
              alt="Reel content" 
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none" />
            
            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-24 md:bottom-20 flex flex-col items-center space-y-6 z-10">
              <button className="flex flex-col items-center group">
                <div className="p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors group-hover:scale-110">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-xs mt-1 drop-shadow-md">{reel.likesCount}</span>
              </button>
              <button className="flex flex-col items-center group">
                <div className="p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors group-hover:scale-110">
                  <MessageCircle className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-xs mt-1 drop-shadow-md">{reel.commentsCount}</span>
              </button>
              <button className="flex flex-col items-center group">
                <div className="p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors group-hover:scale-110">
                  <Send className="w-7 h-7 text-white" />
                </div>
                <span className="text-white font-semibold text-xs mt-1 drop-shadow-md">{reel.sharesCount}</span>
              </button>
              <button className="flex flex-col items-center group">
                <div className="p-3 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full transition-colors group-hover:scale-110">
                  <MoreHorizontal className="w-7 h-7 text-white" />
                </div>
              </button>
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/50 mt-4 shadow-lg cursor-pointer">
                <img src={reel.user?.avatarUrl || `https://ui-avatars.com/api/?name=${reel.user?.username}`} className="w-full h-full object-cover" />
              </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-4 left-4 right-20 z-10">
              <div className="flex items-center space-x-2 mb-3">
                <img src={reel.user?.avatarUrl || `https://ui-avatars.com/api/?name=${reel.user?.username}`} className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" />
                <span className="font-semibold text-white drop-shadow-md flex items-center gap-1">
                  {reel.user?.username}
                  {(reel.user?.role === 'owner' || reel.user?.role === 'admin' || reel.user?.followersCount! >= 1000) && (
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.996 22a9.996 9.996 0 100-19.992 9.996 9.996 0 000 19.992zm-2.852-6.52l-3.32-3.32 1.414-1.414 1.906 1.906 5.56-5.56 1.414 1.414-6.974 6.974z" /></svg>
                  )}
                </span>
                <button className="px-3 py-1 bg-transparent border border-white/50 text-white rounded-full text-xs font-semibold backdrop-blur-sm ml-2">Follow</button>
              </div>
              <p className="text-white text-sm drop-shadow-md line-clamp-2">{reel.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
