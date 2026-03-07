import env from '../env';
import { BlogListResponse, BlogPost } from '../types/blog';

const TIMEOUT_MS = 15000;

interface FetchBlogPostsResult {
  success: true;
  posts: BlogPost[];
  totalCount: number;
  nextCursor?: string;
}

interface FetchBlogPostsError {
  success: false;
  message: string;
}

type FetchBlogPostsResponse = FetchBlogPostsResult | FetchBlogPostsError;

export async function fetchBlogPosts(): Promise<FetchBlogPostsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.api.contactUrl}/blog/posts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        message: 'Failed to load blog posts. Please try again later.',
      };
    }

    const result: BlogListResponse = await response.json();

    return {
      success: true,
      posts: result.data.posts,
      totalCount: result.data.totalCount,
      nextCursor: result.data.nextCursor,
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
