import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Settings as SettingsIcon, LogOut, Camera, Shield, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { currentUser, logout, updateProfile } = useAppStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    username: currentUser?.username || '',
    displayName: currentUser?.displayName || '',
    bio: currentUser?.bio || '',
    website: '',
  });

  if (!currentUser) return <div className="p-8 text-center">Please login</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      let avatarUrl = currentUser.avatarUrl;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${currentUser.id}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
          
        avatarUrl = publicUrl;
      }

      await updateProfile({
        username: formData.username,
        display_name: formData.displayName,
        bio: formData.bio,
        avatar_url: avatarUrl
      });
      
      alert('Profile updated successfully!');
    } catch (error: any) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="max-w-4xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0 p-4 pt-8 md:pt-12">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm", activeTab === 'profile' ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
          >
            <User className="w-5 h-5" /> Edit Profile
          </button>
          <button 
            onClick={() => setActiveTab('privacy')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm", activeTab === 'privacy' ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
          >
            <Shield className="w-5 h-5" /> Privacy & Security
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm", activeTab === 'notifications' ? "bg-primary text-primary-foreground" : "hover:bg-secondary")}
          >
            <Bell className="w-5 h-5" /> Notifications
          </button>
          
          <div className="pt-8 mb-4 border-t border-border mt-8">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-medium text-sm"
            >
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-secondary/30 rounded-2xl p-6 md:p-8 border border-border/50">
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-secondary border-4 border-background">
                  <img 
                    src={avatarFile ? URL.createObjectURL(avatarFile) : (currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${currentUser.username}`)} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-8 h-8 text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-xl">{currentUser.username}</h3>
                  <p className="text-muted-foreground text-sm">Update your profile photo and personal details.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Display Name</label>
                  <input 
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Website</label>
                  <input 
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Bio</label>
                  <textarea 
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    maxLength={150}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" 
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{formData.bio.length} / 150</p>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="font-bold text-xl mb-4">Privacy Options</h3>
              <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                <div>
                  <h4 className="font-semibold">Private Account</h4>
                  <p className="text-sm text-muted-foreground mr-4">When your account is private, only people you approve can see your photos and videos.</p>
                </div>
                <div className="w-12 h-6 bg-secondary rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-muted-foreground rounded-full" />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="font-bold text-xl mb-4">Notification Settings</h3>
              {['Likes', 'Comments', 'New Followers', 'Direct Messages'].map(n => (
                <div key={n} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                  <h4 className="font-semibold">{n}</h4>
                  <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full text-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
