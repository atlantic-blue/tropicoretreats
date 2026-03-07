import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { fetchBlogPosts } from '../api/fetchBlogPosts';
import { BlogPost } from '../types/blog';
import BlogCard from './blog/BlogCard';
import BlogCardSkeleton from './blog/BlogCardSkeleton';

const SKELETON_COUNT = 6;

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await fetchBlogPosts();

      if (isCancelled) {
        return;
      }

      if (result.success) {
        setPosts(result.posts);
      } else {
        setErrorMessage(result.message);
      }

      setIsLoading(false);
    }

    loadPosts();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      <SEO
        title="Blog"
        description="Insights, travel tips, and stories from Tropico Retreats. Discover the best of Colombia for corporate retreats, team building, and wellness experiences."
        canonicalUrl="/blog"
        keywords="Colombia travel blog, corporate retreat tips, team building ideas, wellness retreat insights, Colombia destinations"
        ogType="website"
      />

      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[320px]">
        <div className="absolute inset-0">
          <img
            src="/public/assets/landing-page/hero.webp"
            alt="Tropico Retreats blog"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[#C9A227]">
              Stories & Insights
            </span>
            <h1 className="mt-3 font-serif text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Blog
            </h1>
            <p className="mx-auto mt-4 max-w-2xl px-4 text-lg text-white/90 md:text-xl">
              Travel tips, destination guides, and retreat inspiration from Colombia
            </p>
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
          {isLoading && (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                <BlogCardSkeleton key={index} />
              ))}
            </div>
          )}

          {errorMessage && !isLoading && (
            <div className="mx-auto max-w-lg text-center">
              <div className="rounded-2xl bg-white p-12 shadow-lg">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                <h2 className="mt-4 font-serif text-xl font-semibold text-gray-900">
                  Something went wrong
                </h2>
                <p className="mt-2 text-gray-600">{errorMessage}</p>
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && posts.length === 0 && (
            <div className="mx-auto max-w-lg text-center">
              <div className="rounded-2xl bg-white p-12 shadow-lg">
                <h2 className="font-serif text-xl font-semibold text-gray-900">No posts yet</h2>
                <p className="mt-2 text-gray-600">
                  Check back soon for stories and insights from Tropico Retreats.
                </p>
              </div>
            </div>
          )}

          {!isLoading && !errorMessage && posts.length > 0 && (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map(post => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
