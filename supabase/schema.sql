-- Supabase Schema for SocialSphere

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  website text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  post_count integer DEFAULT 0,
  community_count integer DEFAULT 0,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_online boolean DEFAULT false,
  role text DEFAULT 'regular_user'::text
);

-- Table: followers
CREATE TABLE public.followers (
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- Table: posts
CREATE TABLE public.posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  images text[] DEFAULT '{}'::text[],
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  saved_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: likes
CREATE TABLE public.likes (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

-- Table: comments
CREATE TABLE public.comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: stories
CREATE TABLE public.stories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT timezone('utc'::text, now() + interval '1 day') NOT NULL
);

-- Table: story_views
CREATE TABLE public.story_views (
  story_id uuid REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (story_id, user_id)
);

-- Table: reels
CREATE TABLE public.reels (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_url text NOT NULL,
  content text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  saved_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Open for Demo, requires granular policy in prod)
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public posts are viewable by everyone." ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts." ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts." ON public.posts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own posts." ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Stories are viewable by everyone." ON public.stories FOR SELECT USING (true);
CREATE POLICY "Users can insert own stories." ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reels are viewable by everyone." ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users can insert own reels." ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone." ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments." ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Likes are viewable by everyone." ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can toggle own likes." ON public.likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Followers are viewable by everyone." ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can toggle own follows." ON public.followers FOR ALL USING (auth.uid() = follower_id);

-- Realtime Setup
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.likes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.reels;
alter publication supabase_realtime add table public.followers;
alter publication supabase_realtime add table public.profiles;

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id, 
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for verified status
create or replace function public.check_verification()
returns trigger as $$
begin
  if (new.followers_count >= 1000 and new.role = 'regular_user') then
    new.role := 'verified_user';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger update_verified_status
  before update on public.profiles
  for each row execute procedure public.check_verification();

-- ==========================================
-- ADDED: ROLE MANAGEMENT
-- ==========================================

CREATE TABLE public.roles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role_id)
);

CREATE TABLE public.permissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  permission_key text UNIQUE NOT NULL,
  description text
);

CREATE TABLE public.role_permissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  role_id uuid REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE public.audit_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ADDED: NOTIFICATIONS
-- ==========================================

CREATE TABLE public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  message text,
  reference_id uuid,
  reference_type text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.notification_settings (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  likes_enabled boolean DEFAULT true,
  comments_enabled boolean DEFAULT true,
  follows_enabled boolean DEFAULT true,
  mentions_enabled boolean DEFAULT true,
  messages_enabled boolean DEFAULT true,
  community_enabled boolean DEFAULT true,
  moderation_enabled boolean DEFAULT true,
  announcements_enabled boolean DEFAULT true
);

-- Trigger to create notification_settings when profile is created
create or replace function public.handle_new_notification_settings() 
returns trigger as $$
begin
  insert into public.notification_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_settings
  after insert on public.profiles
  for each row execute procedure public.handle_new_notification_settings();

-- ==========================================
-- ADDED: EXPLORE / SEARCH
-- ==========================================

CREATE TABLE public.search_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.trending_hashtags (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  hashtag text UNIQUE NOT NULL,
  usage_count integer DEFAULT 0,
  growth_rate float DEFAULT 0.0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.explore_analytics (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content_id uuid,
  content_type text NOT NULL,
  action_type text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enable
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explore_analytics ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Public roles viewable by everyone" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Public permissions viewable by everyone" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Public role_permissions viewable by everyone" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their notification settings" ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their notification settings" ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their search history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Trending hashtags viewable by everyone" ON public.trending_hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can record explore analytics" ON public.explore_analytics FOR INSERT WITH CHECK (true);

-- Function to check if a user has a specific permission
create or replace function public.has_permission(user_id uuid, check_permission text)
returns boolean as $$
declare
  has_perm boolean;
begin
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on ur.role_id = rp.role_id
    join public.permissions p on rp.permission_id = p.id
    where ur.user_id = $1 and p.permission_key = check_permission
  ) into has_perm;
  
  -- also check if they are owner since owner has all permissions implicitly
  if not has_perm then
    select exists (
      select 1
      from public.profiles
      where id = $1 and role = 'owner'
    ) into has_perm;
  end if;

  return has_perm;
end;
$$ language plpgsql security definer;

-- Function to check role
create or replace function public.has_role(user_id uuid, check_role text)
returns boolean as $$
begin
  -- check in profiles (legacy/fast check) or user_roles
  return exists (
    select 1 from public.profiles where id = $1 and role = check_role
  );
end;
$$ language plpgsql security definer;

-- Seed default roles and permissions
DO $$
DECLARE
  owner_role uuid;
  admin_role uuid;
  mod_role uuid;
  manage_platform uuid;
  manage_users uuid;
  moderate_content uuid;
BEGIN
  -- Insert roles
  INSERT INTO public.roles (name, description) VALUES 
    ('owner', 'Full platform access'),
    ('admin', 'Manage users and communities'),
    ('moderator', 'Review warnings and content')
  ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

  SELECT id INTO owner_role FROM public.roles WHERE name = 'owner';
  SELECT id INTO admin_role FROM public.roles WHERE name = 'admin';
  SELECT id INTO mod_role FROM public.roles WHERE name = 'moderator';

  -- Insert permissions
  INSERT INTO public.permissions (permission_key, description) VALUES
    ('manage_platform', 'Owner full access'),
    ('manage_users', 'Admin user management'),
    ('moderate_content', 'Moderator content access')
  ON CONFLICT (permission_key) DO UPDATE SET description = EXCLUDED.description;

  SELECT id INTO manage_platform FROM public.permissions WHERE permission_key = 'manage_platform';
  SELECT id INTO manage_users FROM public.permissions WHERE permission_key = 'manage_users';
  SELECT id INTO moderate_content FROM public.permissions WHERE permission_key = 'moderate_content';

  -- Bind permissions
  INSERT INTO public.role_permissions (role_id, permission_id) VALUES
    (admin_role, manage_users),
    (admin_role, moderate_content),
    (mod_role, moderate_content)
  ON CONFLICT DO NOTHING;
END $$;

-- ==========================================
-- ADDED: SEARCH HISTORY
-- ==========================================

CREATE TABLE public.search_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their search history" ON public.search_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- ADDED: MODERATION & REPORTS
-- ==========================================

CREATE TABLE public.reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid NOT NULL,
  target_type text NOT NULL, -- 'user', 'post', 'comment', 'reel', 'story', 'community'
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.warnings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.suspensions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.bans (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.moderation_logs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id uuid,
  target_type text,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Enable for Moderation
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Reports Policies
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Mods can view all reports" ON public.reports FOR SELECT USING (public.has_permission(auth.uid(), 'moderate_content'));
CREATE POLICY "Mods can update reports" ON public.reports FOR UPDATE USING (public.has_permission(auth.uid(), 'moderate_content'));

-- Warnings Policies
CREATE POLICY "Users can view own warnings" ON public.warnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mods can view all warnings" ON public.warnings FOR SELECT USING (public.has_permission(auth.uid(), 'moderate_content'));
CREATE POLICY "Mods can insert warnings" ON public.warnings FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'moderate_content'));

-- Suspensions Policies
CREATE POLICY "Users can view own suspensions" ON public.suspensions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mods can view all suspensions" ON public.suspensions FOR SELECT USING (public.has_permission(auth.uid(), 'moderate_content'));
CREATE POLICY "Mods can insert suspensions" ON public.suspensions FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'moderate_content'));

-- Bans Policies
CREATE POLICY "Users can view own bans" ON public.bans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Mods can view all bans" ON public.bans FOR SELECT USING (public.has_permission(auth.uid(), 'moderate_content'));
CREATE POLICY "Mods can insert bans" ON public.bans FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'moderate_content'));

-- Mod Logs Policies
CREATE POLICY "Mods can view logs" ON public.moderation_logs FOR SELECT USING (public.has_permission(auth.uid(), 'moderate_content'));
CREATE POLICY "Mods can insert logs" ON public.moderation_logs FOR INSERT WITH CHECK (public.has_permission(auth.uid(), 'moderate_content'));

-- Storage Policies for Avatars and Banners (Assume buckets are created by Supabase UI, but we add RLS here)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('banners', 'banners', true) on conflict do nothing;

create policy "Avatar images are publicly accessible." on storage.objects for select using ( bucket_id = 'avatars' );
create policy "Users can upload their own avatars." on storage.objects for insert with check ( bucket_id = 'avatars' and owner = auth.uid() );
create policy "Users can update their own avatars." on storage.objects for update using ( bucket_id = 'avatars' and owner = auth.uid() );
create policy "Users can delete their own avatars." on storage.objects for delete using ( bucket_id = 'avatars' and owner = auth.uid() );

create policy "Banner images are publicly accessible." on storage.objects for select using ( bucket_id = 'banners' );
create policy "Users can upload their own banners." on storage.objects for insert with check ( bucket_id = 'banners' and owner = auth.uid() );
create policy "Users can update their own banners." on storage.objects for update using ( bucket_id = 'banners' and owner = auth.uid() );
create policy "Users can delete their own banners." on storage.objects for delete using ( bucket_id = 'banners' and owner = auth.uid() );

-- ==========================================
-- ADDED: MESSAGING & GROUP CHATS
-- ==========================================

CREATE TABLE public.conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  is_group boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.conversation_participants (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_read_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  media_url text,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone
);

CREATE TABLE public.message_reactions (
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (message_id, user_id, reaction)
);

CREATE TABLE public.group_chats (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  avatar_url text,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.group_members (
  group_id uuid REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE public.group_invites (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid REFERENCES public.group_chats(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, invitee_id)
);

-- Realtime for messaging
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_participants;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.group_chats;
alter publication supabase_realtime add table public.group_members;
alter publication supabase_realtime add table public.group_invites;

-- RLS for Messaging
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING (exists(select 1 from public.conversation_participants where conversation_id = id and user_id = auth.uid()));
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants FOR SELECT USING (exists(select 1 from public.conversation_participants inner_cp where inner_cp.conversation_id = conversation_participants.conversation_id and inner_cp.user_id = auth.uid()));
CREATE POLICY "Users can join conversations" ON public.conversation_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own participant record" ON public.conversation_participants FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (exists(select 1 from public.conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid()));
CREATE POLICY "Users can send messages to their conversations" ON public.messages FOR INSERT WITH CHECK (exists(select 1 from public.conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid()) and sender_id = auth.uid());
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE USING (sender_id = auth.uid());
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (sender_id = auth.uid());

CREATE POLICY "Users can view reactions on messages in their conversations" ON public.message_reactions FOR SELECT USING (exists(select 1 from public.messages m join public.conversation_participants cp on m.conversation_id = cp.conversation_id where m.id = message_reactions.message_id and cp.user_id = auth.uid()));
CREATE POLICY "Users can react to messages in their conversations" ON public.message_reactions FOR INSERT WITH CHECK (exists(select 1 from public.messages m join public.conversation_participants cp on m.conversation_id = cp.conversation_id where m.id = message_reactions.message_id and cp.user_id = auth.uid()) and user_id = auth.uid());
CREATE POLICY "Users can remove their own reactions" ON public.message_reactions FOR DELETE USING (user_id = auth.uid());

-- Group Chat Policies
CREATE POLICY "Users can view groups they are in or invited to" ON public.group_chats FOR SELECT USING (
  exists(select 1 from public.group_members where group_id = id and user_id = auth.uid()) OR
  exists(select 1 from public.group_invites where group_id = id and invitee_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON public.group_chats FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Group admins and owners can update group" ON public.group_chats FOR UPDATE USING (exists(select 1 from public.group_members where group_id = id and user_id = auth.uid() and role in ('admin', 'owner')));
CREATE POLICY "Group owners can delete group" ON public.group_chats FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Users can view members of groups they are in" ON public.group_members FOR SELECT USING (exists(select 1 from public.group_members inner_gm where inner_gm.group_id = group_members.group_id and inner_gm.user_id = auth.uid()));
CREATE POLICY "Group admins/owners can add members" ON public.group_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR -- allowing self join for now (accepted invites)
  exists(select 1 from public.group_members inner_gm where inner_gm.group_id = group_members.group_id and inner_gm.user_id = auth.uid() and inner_gm.role in ('admin', 'owner'))
);
CREATE POLICY "Group admins/owners can update members" ON public.group_members FOR UPDATE USING (exists(select 1 from public.group_members inner_gm where inner_gm.group_id = group_members.group_id and inner_gm.user_id = auth.uid() and inner_gm.role in ('admin', 'owner')));
CREATE POLICY "Members can leave or admins can remove" ON public.group_members FOR DELETE USING (user_id = auth.uid() OR exists(select 1 from public.group_members inner_gm where inner_gm.group_id = group_members.group_id and inner_gm.user_id = auth.uid() and inner_gm.role in ('admin', 'owner')));

CREATE POLICY "Users can view their invites or invites for their groups" ON public.group_invites FOR SELECT USING (invitee_id = auth.uid() OR exists(select 1 from public.group_members where group_id = group_invites.group_id and user_id = auth.uid()));
CREATE POLICY "Group members can invite" ON public.group_invites FOR INSERT WITH CHECK (exists(select 1 from public.group_members where group_id = group_invites.group_id and user_id = auth.uid() and role in ('admin', 'owner')) and inviter_id = auth.uid());
CREATE POLICY "Invitee can update status" ON public.group_invites FOR UPDATE USING (invitee_id = auth.uid() OR exists(select 1 from public.group_members where group_id = group_invites.group_id and user_id = auth.uid() and role in ('admin', 'owner')));
CREATE POLICY "Inviter or invitee can delete" ON public.group_invites FOR DELETE USING (inviter_id = auth.uid() OR invitee_id = auth.uid() OR exists(select 1 from public.group_members where group_id = group_invites.group_id and user_id = auth.uid() and role in ('admin', 'owner')));

-- Add to Realtime
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.user_roles;

-- Notification Triggers
create or replace function public.notify_on_like()
returns trigger as $$
begin
  if new.user_id != (select user_id from public.posts where id = new.post_id) then
    insert into public.notifications (user_id, actor_id, type, title, message, reference_id, reference_type)
    values (
      (select user_id from public.posts where id = new.post_id),
      new.user_id,
      'like',
      'New Like',
      'liked your post',
      new.post_id,
      'post'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_post_liked
  after insert on public.likes
  for each row execute procedure public.notify_on_like();

create or replace function public.notify_on_comment()
returns trigger as $$
begin
  if new.user_id != (select user_id from public.posts where id = new.post_id) then
    insert into public.notifications (user_id, actor_id, type, title, message, reference_id, reference_type)
    values (
      (select user_id from public.posts where id = new.post_id),
      new.user_id,
      'comment',
      'New Comment',
      'commented on your post',
      new.post_id,
      'post'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_post_commented
  after insert on public.comments
  for each row execute procedure public.notify_on_comment();

create or replace function public.notify_on_follow()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, title, message, reference_id, reference_type)
  values (
    new.following_id,
    new.follower_id,
    'follow',
    'New Follower',
    'started following you',
    new.follower_id,
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_followed
  after insert on public.followers
  for each row execute procedure public.notify_on_follow();


