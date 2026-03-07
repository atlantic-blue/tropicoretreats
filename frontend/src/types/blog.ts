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
  data: {
    posts: BlogPost[];
    nextCursor?: string;
    totalCount: number;
  };
}

export interface BlogPostResponse {
  data: BlogPost;
}
