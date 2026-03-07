import React from 'react';
import { Link } from 'react-router';
import { Calendar, User, ImageOff } from 'lucide-react';
import { BlogPost } from '../../types/blog';

interface BlogCardProps {
  post: BlogPost;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const BlogCard: React.FC<BlogCardProps> = ({ post }) => {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group rounded-2xl bg-white shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        {post.heroImageUrl ? (
          <img
            src={post.heroImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-emerald-50">
            <ImageOff className="h-12 w-12 text-emerald-200" />
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(post.publishedAt)}
            </span>
          )}
          {post.authorName && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {post.authorName}
            </span>
          )}
        </div>

        <h3 className="font-serif text-xl font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-3 text-gray-600 leading-relaxed line-clamp-3">{post.excerpt}</p>
        )}

        <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-wider text-[#C9A227] group-hover:text-[#B8860B] transition-colors">
          Read More
        </span>
      </div>
    </Link>
  );
};

export default BlogCard;
