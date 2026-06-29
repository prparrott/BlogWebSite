export type Article = {
  id: number;
  slug: string;
  title: string;
  category: string;
  categories: string[];
  author: string;
  date: string;
  publishedAt: string | null;
  readTime: string;
  excerpt: string;
  body: string[];
  imageUrl: string | null;
};
