import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useBlogPosts, useDeleteBlogPost } from '../hooks/useBlog';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost } from '../types/blog';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || '';

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-10 bg-gray-200 rounded w-28 animate-pulse" />
      </div>
      <div className="bg-white rounded-lg shadow-sm border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b last:border-b-0">
            <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorMessage({ error }: { error: Error }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-medium text-red-800">Error loading blog posts</h3>
        <p className="text-sm text-red-600 mt-1">{error.message}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BlogPost['status'] }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Published
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Draft
    </span>
  );
}

function DeleteConfirmation({
  postTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  postTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900">Delete Post</h3>
        <p className="text-sm text-gray-600 mt-2">
          Are you sure you want to delete &quot;{postTitle}&quot;? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BlogPostCard({
  post,
  onDelete,
}: {
  post: BlogPost;
  onDelete: (post: BlogPost) => void;
}) {
  return (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={`/blog/${post.slug}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 line-clamp-2">
            {post.title}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">/{post.slug}</p>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={post.status} />
            <span className="text-xs text-gray-400">{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {post.status === 'published' && FRONTEND_URL && (
            <a
              href={`${FRONTEND_URL}/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50"
              title="View on site"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Link
            to={`/blog/${post.slug}`}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(post)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BlogPostRow({
  post,
  onDelete,
}: {
  post: BlogPost;
  onDelete: (post: BlogPost) => void;
}) {
  return (
    <tr className="border-b last:border-b-0 hover:bg-gray-50">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{post.title}</span>
          <span className="text-xs text-gray-500 mt-0.5">/{post.slug}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={post.status} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {format(new Date(post.createdAt), 'MMM d, yyyy')}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {post.status === 'published' && FRONTEND_URL && (
            <a
              href={`${FRONTEND_URL}/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors rounded-md hover:bg-emerald-50"
              title="View on site"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <Link
            to={`/blog/${post.slug}`}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-md hover:bg-blue-50"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete(post)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function BlogListPage() {
  const { getAccessToken } = useAuth();
  const { data, isLoading, isError, error } = useBlogPosts();
  const deletePost = useDeleteBlogPost();
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  const handleDeleteConfirm = () => {
    if (!postToDelete) return;

    deletePost.mutate(postToDelete.id, {
      onSuccess: () => setPostToDelete(null),
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  const posts = data?.posts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <Link
          to="/blog/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500">No blog posts yet. Create your first post to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          {/* Mobile: card layout */}
          <div className="md:hidden">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} onDelete={setPostToDelete} />
            ))}
          </div>

          {/* Desktop: table layout */}
          <table className="min-w-full hidden md:table">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <BlogPostRow key={post.id} post={post} onDelete={setPostToDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {postToDelete && (
        <DeleteConfirmation
          postTitle={postToDelete.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPostToDelete(null)}
          isDeleting={deletePost.isPending}
        />
      )}
    </div>
  );
}
