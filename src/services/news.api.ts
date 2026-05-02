import { request } from "../utils/request";
import type {
  ArticlesResponse,
  NewsCategory,
  SourcesResponse,
} from "../types/news.types";

const NEWS = "/api/communication/v1/news";

export interface HeadlinesParams {
  country?: string;
  category?: NewsCategory | "";
  sources?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

export async function getHeadlines(params: HeadlinesParams = {}): Promise<ArticlesResponse> {
  const p: Record<string, string | number | boolean> = {};
  if (params.category) p.category = params.category;
  if (params.country) p.country = params.country;
  if (params.sources) p.sources = params.sources;
  if (params.q) p.q = params.q;
  if (params.page) p.page = params.page;
  if (params.page_size) p.page_size = params.page_size;
  const result = await request.get<any>(NEWS + "/headlines", { params: p });
  return result.data ?? { articles: [], total_results: 0 };
}

export interface SearchArticlesParams {
  q: string;
  sources?: string;
  from?: string;
  to?: string;
  language?: string;
  sort_by?: "relevancy" | "popularity" | "publishedAt";
  page?: number;
  page_size?: number;
}

export async function searchArticles(params: SearchArticlesParams): Promise<ArticlesResponse> {
  const p: Record<string, string | number | boolean> = { q: params.q };
  if (params.sources) p.sources = params.sources;
  if (params.from) p.from = params.from;
  if (params.to) p.to = params.to;
  if (params.language) p.language = params.language;
  if (params.sort_by) p.sort_by = params.sort_by;
  if (params.page) p.page = params.page;
  if (params.page_size) p.page_size = params.page_size;
  const result = await request.get<any>(NEWS + "/search", { params: p });
  return result.data ?? { articles: [], total_results: 0 };
}

export async function getNewsSources(params: {
  category?: string;
  language?: string;
  country?: string;
} = {}): Promise<SourcesResponse> {
  const p: Record<string, string | number | boolean> = {};
  if (params.category) p.category = params.category;
  if (params.language) p.language = params.language;
  if (params.country) p.country = params.country;
  const result = await request.get<any>(NEWS + "/sources", { params: p });
  return result.data ?? { sources: [] };
}
