export type PostType = "text" | "link" | "image";
export type SortOrder = "new" | "hot" | "top";
export type MemberRole = "member" | "moderator" | "admin";

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  banner_url: string;
  avatar_url: string;
  is_public: boolean;
  member_count: number;
  post_count: number;
  is_member: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  link_url: string;
  image_url: string;
  type: PostType;
  score: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  is_removed: boolean;
  user_vote: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string;
  author_id: string;
  author_name: string;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  depth: number;
  is_deleted: boolean;
  user_vote: number;
  children: Comment[];
  created_at: string;
}
