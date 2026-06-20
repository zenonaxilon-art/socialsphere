import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Shield, Flag, Trash, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function ModerationPanel() {
  const { currentUser } = useAppStore();
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin' || currentUser.role === 'moderator')) {
      fetchReports(activeTab);
    }
  }, [currentUser, activeTab]);

  const fetchReports = async (statusFilter: string) => {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(username, avatar_url)')
      .eq('status', statusFilter)
      .order('created_at', { ascending: false });
    
    if (data) setReports(data);
  };

  const handleResolve = async (id: string, action: string) => {
    try {
      await supabase.from('reports').update({ status: action }).eq('id', id);
      setReports(reports.filter(r => r.id !== id));
      
      // Optionally create a mod log
      if (currentUser?.id) {
         await supabase.from('moderation_logs').insert({
            actor_id: currentUser.id,
            action: `Report ${action}`,
            details: `Report ID: ${id}`
         });
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  if (!currentUser || !['owner', 'admin', 'moderator'].includes(currentUser.role || '')) {
    return <div className="p-8 text-center">You do not have permission to view this page.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0 p-4 pt-8 md:pt-12">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border/50 pb-px">
        {['pending', 'resolved', 'dismissed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 font-semibold text-sm capitalize transition-colors border-b-2",
              activeTab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center p-12 bg-secondary/20 rounded-2xl border border-border/50">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-bold">Queue is empty</p>
            <p className="text-muted-foreground">No reports matching this filter.</p>
          </div>
        ) : (
          reports.map(report => (
            <div key={report.id} className="bg-secondary/30 border border-border/50 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold uppercase text-xs tracking-wider text-red-500">{report.target_type} Report</span>
                    <p className="text-sm text-muted-foreground">
                      Reported by <span className="font-bold text-foreground">{report.reporter?.username || 'Unknown'}</span> • {formatDistanceToNow(new Date(report.created_at))} ago
                    </p>
                  </div>
                </div>
                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleResolve(report.id, 'dismissed')} className="p-2 border border-border rounded-xl hover:bg-secondary text-muted-foreground transition-colors" title="Dismiss">
                      <X className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleResolve(report.id, 'resolved')} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold transition-colors text-sm">
                      Take Action
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-background border border-border rounded-xl p-4">
                <p className="font-semibold mb-1">Reason: {report.reason}</p>
                {report.details && (
                  <p className="text-muted-foreground text-sm">{report.details}</p>
                )}
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="truncate">Target ID: {report.target_id}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
