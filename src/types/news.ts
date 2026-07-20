export interface NewsItem {
  id: number;
  title: string;
  perex: string;
  body: string;
  published_at: string | null;
  is_published: boolean;
  created_by: number | null;
  created_at: string;
}

export interface NewsInput {
  title: string;
  perex: string;
  body: string;
  publish: boolean;
}
