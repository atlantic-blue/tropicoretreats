import { fetchWithAuth } from './client';
import type {
  BlogPost,
  BlogPostsResponse,
  CreateBlogPostPayload,
  UpdateBlogPostPayload,
} from '../types/blog';

interface BlogPostResponse {
  data: BlogPost;
}

interface BlogPostsListResponse {
  data: BlogPostsResponse;
}

export const blogApi = {
  list: async (): Promise<BlogPostsResponse> => {
    const response = await fetchWithAuth<BlogPostsListResponse>('/blog/posts');
    return response.data;
  },

  getBySlug: async (slug: string): Promise<BlogPost> => {
    const response = await fetchWithAuth<BlogPostResponse>(`/blog/posts/${slug}`);
    return response.data;
  },

  create: async (payload: CreateBlogPostPayload): Promise<BlogPost> => {
    const response = await fetchWithAuth<BlogPostResponse>('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  update: async (id: string, payload: UpdateBlogPostPayload): Promise<BlogPost> => {
    const response = await fetchWithAuth<BlogPostResponse>(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await fetchWithAuth<void>(`/blog/posts/${id}`, {
      method: 'DELETE',
    });
  },
};
