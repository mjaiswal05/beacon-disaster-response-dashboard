import { request } from "../utils/request";
import type {
  Community,
  Post,
  Comment,
  SortOrder,
  PostType,
} from "../types/socials.types";

const SOCIALS = "/api/communication/v1/socials";

// ── Communities ───────────────────────────────────────────────────────────────

export async function getCommunities(
  limit = 25,
  offset = 0,
  userId?: string,
): Promise<Community[]> {
  const params: Record<string, string | number | boolean> = { limit, offset };
  if (userId) params.user_id = userId;
  const result = await request.get<any>(SOCIALS + "/communities", { params });
  return result.data ?? [];
}

export async function getCommunity(
  slug: string,
  userId?: string,
): Promise<Community> {
  const params: Record<string, string | number | boolean> = {};
  if (userId) params.user_id = userId;
  const result = await request.get<any>(SOCIALS + "/communities/" + slug, { params });
  return result.data;
}

export async function createCommunity(payload: {
  slug: string;
  name: string;
  description: string;
  user_id: string;
}): Promise<Community> {
  const result = await request.post<any>(SOCIALS + "/communities", payload);
  return result.data;
}

export async function joinCommunity(
  communityId: string,
  userId: string,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/communities/" + communityId + "/join",
    { user_id: userId },
  );
}

export async function leaveCommunity(
  communityId: string,
  userId: string,
): Promise<void> {
  await request.del(
    SOCIALS + "/communities/" + communityId + "/members/" + userId,
  );
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export async function getPosts(
  communityId: string,
  sort: SortOrder = "hot",
  limit = 25,
  offset = 0,
): Promise<Post[]> {
  const result = await request.get<any>(
    SOCIALS + "/communities/" + communityId + "/posts",
    { params: { sort, limit, offset } },
  );
  return result.data ?? [];
}

export async function getPost(postId: string): Promise<Post> {
  const result = await request.get<any>(SOCIALS + "/posts/" + postId);
  return result.data;
}

export async function createPost(payload: {
  community_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  link_url: string;
  image_url: string;
  type: PostType;
}): Promise<Post> {
  const result = await request.post<any>(SOCIALS + "/posts", payload);
  return result.data;
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  await request.del(SOCIALS + "/posts/" + postId, {
    params: { user_id: userId },
  });
}

export async function votePost(
  postId: string,
  userId: string,
  value: 1 | -1,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/posts/" + postId + "/vote",
    { user_id: userId, value },
  );
}

export async function pinPost(
  postId: string,
  userId: string,
  pin: boolean,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/posts/" + postId + "/pin",
    { user_id: userId },
    { params: { pin } },
  );
}

export async function lockPost(
  postId: string,
  userId: string,
  lock: boolean,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/posts/" + postId + "/lock",
    { user_id: userId },
    { params: { lock } },
  );
}

export async function removePost(
  postId: string,
  userId: string,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/posts/" + postId + "/remove",
    { user_id: userId },
  );
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getComments(postId: string): Promise<Comment[]> {
  const result = await request.get<any>(
    SOCIALS + "/posts/" + postId + "/comments",
  );
  return result.data ?? [];
}

export async function addComment(
  postId: string,
  payload: {
    author_id: string;
    author_name: string;
    body: string;
    parent_comment_id?: string;
  },
): Promise<Comment> {
  const result = await request.post<any>(
    SOCIALS + "/posts/" + postId + "/comments",
    payload,
  );
  return result.data;
}

export async function deleteComment(
  commentId: string,
  userId: string,
): Promise<void> {
  await request.del(SOCIALS + "/comments/" + commentId, {
    params: { user_id: userId },
  });
}

export async function voteComment(
  commentId: string,
  userId: string,
  value: 1 | -1,
): Promise<void> {
  await request.post<any>(
    SOCIALS + "/comments/" + commentId + "/vote",
    { user_id: userId, value },
  );
}

// ── User ──────────────────────────────────────────────────────────────────────

export async function getUserPosts(
  userId: string,
  limit = 25,
  offset = 0,
): Promise<Post[]> {
  const result = await request.get<any>(
    SOCIALS + "/users/" + userId + "/posts",
    { params: { limit, offset } },
  );
  return result.data ?? [];
}

export async function getUserComments(
  userId: string,
  limit = 25,
  offset = 0,
): Promise<Comment[]> {
  const result = await request.get<any>(
    SOCIALS + "/users/" + userId + "/comments",
    { params: { limit, offset } },
  );
  return result.data ?? [];
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchPosts(
  q: string,
  limit = 25,
  offset = 0,
): Promise<Post[]> {
  const result = await request.get<any>(SOCIALS + "/search/posts", {
    params: { q, limit, offset },
  });
  return result.data ?? [];
}

export async function searchCommunities(
  q: string,
  limit = 25,
  offset = 0,
): Promise<Community[]> {
  const result = await request.get<any>(SOCIALS + "/search/communities", {
    params: { q, limit, offset },
  });
  return result.data ?? [];
}
