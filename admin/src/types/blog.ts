export type BlogPostStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  heroImageUrl: string;
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  authorName: string;
  authorOrg: string;
  status: BlogPostStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostsResponse {
  posts: BlogPost[];
  nextCursor?: string;
  totalCount: number;
}

export interface CreateBlogPostPayload {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  heroImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  authorName?: string;
  authorOrg?: string;
  status: BlogPostStatus;
}

export interface UpdateBlogPostPayload {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  heroImageUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  authorName?: string;
  authorOrg?: string;
  status?: BlogPostStatus;
}
