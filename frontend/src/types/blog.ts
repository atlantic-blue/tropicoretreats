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
  status: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  posts: BlogPost[];
  nextCursor?: string;
}

export interface BlogPostResponse {
  post: BlogPost;
}
