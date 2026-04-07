import { fetchWithAuth } from './client';
import type {
  BlogPost,
  BlogPostsResponse,
  CreateBlogPostPayload,
  UpdateBlogPostPayload,
} from '../types/blog';

export interface PresignResponse {
  uploadUrl: string;
  imageUrl: string;
  key: string;
}

export const blogApi = {
  presignImageUpload: async (
    filename: string,
    contentType: string,
    purpose: 'hero' | 'inline',
  ): Promise<PresignResponse> => {
    return fetchWithAuth<PresignResponse>('/blog/images', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, purpose }),
    });
  },

  list: async (): Promise<BlogPostsResponse> => {
    return fetchWithAuth<BlogPostsResponse>('/blog/posts?includeDrafts=true');
  },

  getBySlug: async (slug: string): Promise<BlogPost> => {
    const response = await fetchWithAuth<{ post: BlogPost }>(`/blog/posts/${slug}`);
    return response.post;
  },

  create: async (payload: CreateBlogPostPayload): Promise<BlogPost> => {
    const response = await fetchWithAuth<{ post: BlogPost }>('/blog/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.post;
  },

  update: async (id: string, payload: UpdateBlogPostPayload): Promise<BlogPost> => {
    const response = await fetchWithAuth<{ post: BlogPost }>(`/blog/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.post;
  },

  delete: async (id: string): Promise<void> => {
    await fetchWithAuth<{ message: string }>(`/blog/posts/${id}`, {
      method: 'DELETE',
    });
  },
};
