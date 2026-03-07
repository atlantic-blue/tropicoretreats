import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Calendar, User, AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { fetchBlogPost } from '../api/fetchBlogPost';
import { BlogPost } from '../types/blog';
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function buildStructuredData(post: BlogPost): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.heroImageUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Person',
      name: post.authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Tropico Retreats',
    },
  };
}

const BlogPostLoadingSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse">
      <div className="h-[40vh] min-h-[320px] bg-gray-200" />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
        <div className="h-8 w-full bg-gray-200 rounded mb-4" />
        <div className="h-8 w-3/4 bg-gray-200 rounded mb-8" />
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
};

const BlogPostError: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-lg text-center">
        <div className="rounded-2xl bg-white p-12 shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h2 className="mt-4 font-serif text-xl font-semibold text-gray-900">
            {message === 'Blog post not found.' ? 'Post Not Found' : 'Something went wrong'}
          </h2>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link
            to="/blog"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
};

const BlogPostContent: React.FC<{ post: BlogPost }> = ({ post }) => {
  return (
    <>
      <SEO
        title={post.metaTitle || post.title}
        description={post.metaDescription || post.excerpt}
        canonicalUrl={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.ogImageUrl || post.heroImageUrl}
        structuredData={buildStructuredData(post)}
      />

      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[320px]">
        <div className="absolute inset-0">
          {post.heroImageUrl ? (
            <img src={post.heroImageUrl} alt={post.title} className="h-full w-full object-cover" />
          ) : (
            <img
              src="/public/assets/landing-page/hero.webp"
              alt={post.title}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="relative flex h-full items-end pb-12">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <h1 className="font-serif text-3xl font-bold text-white md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
              {post.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              {post.authorName && (
                <span className="flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  {post.authorName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <article className="py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link
            to="/blog"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <div
            className="text-gray-800 leading-relaxed [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-3 [&_h3]:font-serif [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-1.5 [&_a]:text-emerald-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-emerald-800 [&_strong]:font-bold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-[#C9A227] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-4 [&_pre]:bg-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4 [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4 [&_hr]:my-8 [&_hr]:border-gray-200 [&_table]:w-full [&_table]:my-4 [&_th]:text-left [&_th]:p-2 [&_th]:border-b-2 [&_th]:border-gray-200 [&_td]:p-2 [&_td]:border-b [&_td]:border-gray-100"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>
    </>
  );
};

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setErrorMessage('Blog post not found.');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function loadPost() {
      setIsLoading(true);
      setErrorMessage(null);

      const result = await fetchBlogPost(slug as string);

      if (isCancelled) {
        return;
      }

      if (result.success) {
        setPost(result.post);
      } else {
        setErrorMessage(result.message);
      }

      setIsLoading(false);
    }

    loadPost();

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-dvh w-full bg-[#F7F1EC] text-gray-900">
      {isLoading && <BlogPostLoadingSkeleton />}
      {errorMessage && !isLoading && <BlogPostError message={errorMessage} />}
      {post && !isLoading && !errorMessage && <BlogPostContent post={post} />}
    </div>
  );
};

export default BlogPostPage;
