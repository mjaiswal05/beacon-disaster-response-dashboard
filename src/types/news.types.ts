export type NewsCategory =
  | "general"
  | "business"
  | "entertainment"
  | "health"
  | "science"
  | "sports"
  | "technology";

export interface ArticleSource {
  id: string;
  name: string;
}

export interface Article {
  source: ArticleSource;
  author: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  published_at: string;
  content: string;
}

export interface ArticlesResponse {
  total_results: number;
  page: number;
  page_size: number;
  articles: Article[];
}

export interface NewsSource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  language: string;
  country: string;
}

export interface SourcesResponse {
  count: number;
  sources: NewsSource[];
}
