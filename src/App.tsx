import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { CreatePostModal } from './components/CreatePostModal';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Reels } from './pages/Reels';
import { Auth } from './pages/Auth';
import { Notifications } from './pages/Notifications';
import { Explore } from './pages/Explore';
import { AdminPanel } from './pages/Admin';
import { ModerationPanel } from './pages/Moderation';
import { Settings } from './pages/Settings';
import { Search } from './pages/Search';
import { Messages } from './pages/Messages';
import { useAppStore } from './lib/store';

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDark, initialize, session, isLoading } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Ensuring document matches state
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary selection:text-primary-foreground">
        <Sidebar onCreatePost={() => setIsModalOpen(true)} />
        
        <main className="md:ml-[80px] xl:ml-64 min-h-screen bg-black/40">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/reels" element={<Reels />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/mod" element={<ModerationPanel />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <MobileNav onCreatePost={() => setIsModalOpen(true)} />
        
        <CreatePostModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </div>
    </BrowserRouter>
  );
}
