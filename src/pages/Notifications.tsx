import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, UserPlus, Bell, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export function Notifications() {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useAppStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'system': return <Info className="w-5 h-5 text-orange-500" />;
      case 'warning': return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default: return <Bell className="w-5 h-5 text-purple-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full min-h-screen bg-background pb-20 md:pb-0">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/40 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Notifications</h1>
        {unreadNotifications > 0 && (
          <button 
            onClick={markAllNotificationsRead}
            className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="divide-y divide-border/20">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              onClick={() => {
                if (!notification.read) {
                  markNotificationRead(notification.id);
                }
              }}
              className={cn(
                "p-4 flex items-start gap-4 hover:bg-secondary/20 transition-colors cursor-pointer group",
                !notification.read ? "bg-primary/5" : ""
              )}
            >
              <div className="relative pt-1 shrink-0">
                {notification.actor ? (
                  <Link to={`/profile/${notification.actor.username}`} className="block w-10 h-10 rounded-full overflow-hidden border border-border">
                    <img src={notification.actor.avatarUrl || `https://ui-avatars.com/api/?name=${notification.actor.username}`} alt="" className="w-full h-full object-cover" />
                  </Link>
                ) : (
                  <div className="w-10 h-10 rounded-full border border-border bg-secondary flex items-center justify-center">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                  {getIcon(notification.type)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  {notification.actor && (
                    <Link to={`/profile/${notification.actor.username}`} className="font-bold hover:underline mr-1">
                      {notification.actor.username}
                    </Link>
                  )}
                  <span className="text-muted-foreground">{notification.message || notification.title}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>

              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
