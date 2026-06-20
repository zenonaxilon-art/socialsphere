import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Compass, MessageCircle, Heart, PlusSquare, PlaySquare, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function MobileNav({ onCreatePost }: { onCreatePost: () => void }) {
  const { currentUser } = useAppStore();
  const location = useLocation();

  const NAV_ITEMS = [
    { icon: Home, path: '/' },
    { icon: Search, path: '/search' },
    { icon: PlusSquare, action: onCreatePost },
    { icon: PlaySquare, path: '/reels' },
    { icon: MessageCircle, path: '/messages' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card glass border-t border-border flex items-center justify-around z-50 md:hidden px-2 pb-safe">
      {NAV_ITEMS.map((item, idx) => {
        if (item.action) {
          return (
            <button 
              key={idx}
              onClick={item.action}
              className="p-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <item.icon className="w-6 h-6" />
            </button>
          );
        }
        return (
          <NavLink
            key={idx}
            to={item.path!}
            className={({ isActive }) => cn(
              "p-3 transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="w-6 h-6" />
          </NavLink>
        );
      })}
      
      <NavLink
        to={`/profile/${currentUser?.username}`}
        className={({ isActive }) => cn(
          "p-3 transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className={cn("w-6 h-6 rounded-full overflow-hidden border-2", location.pathname.includes('/profile') ? 'border-foreground' : 'border-transparent')}>
          <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.username}`} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </NavLink>
    </nav>
  );
}
