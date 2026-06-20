import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Compass, MessageCircle, Heart, PlusSquare, PlaySquare, Menu, LogOut, Shield, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Sidebar({ onCreatePost }: { onCreatePost: () => void }) {
  const { currentUser, toggleTheme, isDark, logout, unreadNotifications } = useAppStore();

  const NAV_ITEMS = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Search', path: '/search' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: PlaySquare, label: 'Reels', path: '/reels' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadNotifications },
  ];

  const adminModItems = [];
  if (currentUser?.role === 'owner' || currentUser?.role === 'admin' || currentUser?.role === 'moderator') {
    adminModItems.push({ icon: Shield, label: 'Moderation', path: '/mod' });
  }
  if (currentUser?.role === 'owner' || currentUser?.role === 'admin') {
    adminModItems.push({ icon: ShieldAlert, label: 'Admin', path: '/admin' });
  }

  return (
    <aside className="hidden md:flex flex-col w-[80px] xl:w-64 h-screen fixed left-0 top-0 border-r border-border py-6 px-3 xl:px-4 z-50 bg-background">
      
      <div className="mb-10 px-2 xl:px-3 flex items-center justify-center xl:justify-start">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl xl:hidden">
          S
        </div>
        <h1 className="hidden xl:block text-2xl font-bold tracking-tighter text-white bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-500 uppercase">
          SocialSphere
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium relative",
              isActive ? "font-bold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <div className="relative">
              <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {item.badge ? (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </div>
            <span className="hidden xl:block">{item.label}</span>
          </NavLink>
        ))}

        {adminModItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium relative text-orange-500 hover:bg-orange-500/10",
              isActive ? "font-bold" : ""
            )}
          >
            <div className="relative">
              <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
            <span className="hidden xl:block">{item.label}</span>
          </NavLink>
        ))}

        <button 
          onClick={onCreatePost}
          className="w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <PlusSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="hidden xl:block">Create</span>
        </button>

        <NavLink
          to={`/profile/${currentUser?.username}`}
          className={({ isActive }) => cn(
            "flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium",
            isActive ? "font-bold text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <div className="w-6 h-6 rounded-full overflow-hidden border border-muted-foreground group-hover:border-foreground">
            <img src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser?.username}`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <span className="hidden xl:block">Profile</span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-2">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <div className="w-6 h-6 rounded-full border-2 border-current opacity-70 group-hover:opacity-100 flex items-center justify-center">
            {isDark ? <span className="block w-3 h-3 bg-current rounded-full" /> : <span className="block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin duration-3000" />}
          </div>
          <span className="hidden xl:block">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <button onClick={logout} className="w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 group font-medium text-red-500 hover:bg-red-500/10">
          <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="hidden xl:block">Logout</span>
        </button>
      </div>
    </aside>
  );
}
