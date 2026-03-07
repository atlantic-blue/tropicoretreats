import env from '../env';
import { BlogPostResponse, BlogPost } from '../types/blog';

const TIMEOUT_MS = 15000;

interface FetchBlogPostResult {
  success: true;
  post: BlogPost;
}

interface FetchBlogPostError {
  success: false;
  message: string;
}

type FetchBlogPostResponse = FetchBlogPostResult | FetchBlogPostError;

export async function fetchBlogPost(slug: string): Promise<FetchBlogPostResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.api.contactUrl}/blog/posts/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          message: 'Blog post not found.',
        };
      }

      return {
        success: false,
        message: 'Failed to load blog post. Please try again later.',
      };
    }

    const result: BlogPostResponse = await response.json();

    return {
      success: true,
      post: result.data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timed out. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      message: 'Unable to connect. Please check your internet and try again.',
    };
  }
}
