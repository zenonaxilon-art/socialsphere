export type Role = "owner" | "admin" | "moderator" | "verified_user" | "regular_user";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  postCount: number;
  communityCount: number;
  joinedAt: string;
  isOnline: boolean;
  role: Role;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savedCount: number;
  createdAt: string;
  user?: UserProfile;
  isLiked?: boolean;
}

export interface Story {
  id: string;
  userId: string;
  imageUrl: string;
  createdAt: string;
  expiresAt: string;
  user?: UserProfile;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  likesCount: number;
  createdAt: string;
  user?: UserProfile;
}

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'follow' 
  | 'mention' 
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title?: string;
  message?: string;
  referenceId?: string;
  referenceType?: string;
  read: boolean;
  createdAt: string;
  actor?: UserProfile;
}
