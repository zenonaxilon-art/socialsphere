import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Users, Activity, Flag, Trash, Eye, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function AdminPanel() {
  const { currentUser } = useAppStore();
  const [stats, setStats] = useState({ users: 0, posts: 0, reports: 0 });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin')) {
      fetchAdminData();
    }
  }, [currentUser]);

  const fetchAdminData = async () => {
    // For large tables count is better via Rpc or select count
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true });
    
    setStats({
      users: userCount || 0,
      posts: postCount || 0,
      reports: reportCount || 0,
    });

    const { data: userData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(20);
    if (userData) setUsers(userData);
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!window.confirm(`Change role to ${newRole}?`)) return;
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
    return <div className="p-8 text-center">You do not have permission to view this page.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0 p-4 pt-8 md:pt-12">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="w-8 h-8 text-red-500" />
        <h1 className="text-3xl font-bold">Admin Console</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-secondary p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Total Users</p>
            <p className="text-3xl font-bold">{stats.users}</p>
          </div>
        </div>
        <div className="bg-secondary p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Total Content</p>
            <p className="text-3xl font-bold">{stats.posts}</p>
          </div>
        </div>
        <div className="bg-secondary p-6 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Reports</p>
            <p className="text-3xl font-bold">{stats.reports}</p>
          </div>
        </div>
      </div>

      <div className="bg-secondary/30 rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-6 border-b border-border/50">
          <h2 className="text-xl font-bold">Recent Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="p-4 font-semibold text-muted-foreground text-sm">User</th>
                <th className="p-4 font-semibold text-muted-foreground text-sm">Role</th>
                <th className="p-4 font-semibold text-muted-foreground text-sm">Joined</th>
                <th className="p-4 font-semibold text-muted-foreground text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border/10 hover:bg-secondary/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} className="w-8 h-8 rounded-full border border-border" />
                      <div>
                        <p className="font-bold">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm">{user.role}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <select 
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className="bg-background border border-border rounded-lg text-sm px-3 py-1.5 focus:outline-none"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">Loading users...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
