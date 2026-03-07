import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronLeft, Save, Eye, Loader2, AlertCircle,
  Bold, Italic, Heading2, Heading3, List, ListOrdered, LinkIcon,
} from 'lucide-react';
import { useBlogPost, useCreateBlogPost, useUpdateBlogPost } from '../hooks/useBlog';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogPostStatus } from '../types/blog';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Strips Google Docs cruft from pasted HTML while keeping semantic tags.
 */
function cleanPastedHtml(html: string): string {
  const temp = document.createElement('div');
  temp.innerHTML = html;

  const ALLOWED_TAGS = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'STRONG', 'B', 'EM', 'I', 'U',
    'UL', 'OL', 'LI',
    'A', 'BR', 'BLOCKQUOTE', 'PRE', 'CODE',
    'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'IMG', 'HR', 'SUP', 'SUB', 'SPAN',
  ]);

  function clean(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (!ALLOWED_TAGS.has(element.tagName)) {
          // Unwrap: keep children, remove the tag
          while (element.firstChild) {
            node.insertBefore(element.firstChild, element);
          }
          node.removeChild(element);
        } else {
          // Strip all attributes except href on links and src on images
          const attrs = Array.from(element.attributes);
          for (const attr of attrs) {
            if (element.tagName === 'A' && attr.name === 'href') continue;
            if (element.tagName === 'IMG' && (attr.name === 'src' || attr.name === 'alt')) continue;
            element.removeAttribute(attr.name);
          }
          // Convert B to STRONG, I to EM for consistency
          if (element.tagName === 'B') {
            const strong = document.createElement('strong');
            strong.innerHTML = element.innerHTML;
            node.replaceChild(strong, element);
            clean(strong);
            continue;
          }
          if (element.tagName === 'I') {
            const em = document.createElement('em');
            em.innerHTML = element.innerHTML;
            node.replaceChild(em, element);
            clean(em);
            continue;
          }
          // Remove empty spans (Google Docs inserts many)
          if (element.tagName === 'SPAN') {
            while (element.firstChild) {
              node.insertBefore(element.firstChild, element);
            }
            node.removeChild(element);
            continue;
          }
          clean(element);
        }
      }
    }
  }

  clean(temp);
  return temp.innerHTML;
}

interface FormState {
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
  status: BlogPostStatus;
}

const INITIAL_FORM: FormState = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  heroImageUrl: '',
  metaTitle: '',
  metaDescription: '',
  ogImageUrl: '',
  authorName: '',
  authorOrg: '',
  status: 'draft',
};

function FormField({
  label,
  children,
  hint,
  charCount,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  charCount?: { current: number; max: number };
}) {
  const isOver = charCount ? charCount.current > charCount.max : false;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {charCount && (
          <span className={`text-xs ${isOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {charCount.current}/{charCount.max}
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      title={title}
      className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
    >
      {children}
    </button>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync value into editor only when it changes externally (initial load)
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const html = event.clipboardData.getData('text/html');
    if (html) {
      event.preventDefault();
      const cleaned = cleanPastedHtml(html);
      document.execCommand('insertHTML', false, cleaned);
      handleInput();
    }
    // If no HTML (plain text paste), let default behavior handle it
  };

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-0.5 px-2 py-1.5 border border-b-0 border-gray-300 rounded-t-md bg-gray-50">
        <ToolbarButton onClick={() => exec('bold')} title="Bold">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Italic">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="Heading 2">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="Heading 3">
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolbarButton onClick={insertLink} title="Insert link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full min-h-64 px-3 py-2 border border-gray-300 rounded-b-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-y-auto bg-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600"
        data-placeholder="Write your blog post content or paste from Google Docs..."
        suppressContentEditableWarning
      />
    </div>
  );
}

function ContentPreview({ content }: { content: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Preview</h3>
      </div>
      {content ? (
        <div
          className="text-sm text-gray-800 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline [&_strong]:font-bold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-3 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-3 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_img]:max-w-full [&_img]:rounded [&_hr]:my-6 [&_hr]:border-gray-200"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      ) : (
        <p className="text-sm text-gray-400 italic">Start writing to see a preview...</p>
      )}
    </div>
  );
}

function EditorForm({
  form,
  onChange,
  onSave,
  isSaving,
  isEditing,
  saveError,
}: {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onSave: (status: BlogPostStatus) => void;
  isSaving: boolean;
  isEditing: boolean;
  saveError: Error | null;
}) {
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const handleTitleChange = (value: string) => {
    onChange('title', value);
    if (!slugManuallyEdited && !isEditing) {
      onChange('slug', generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    onChange('slug', value);
  };

  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Post Details</h3>

        <FormField label="Title">
          <input
            type="text"
            value={form.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            className={inputClasses}
            placeholder="Enter post title"
            maxLength={200}
          />
        </FormField>

        <FormField label="Slug" hint="URL-friendly identifier">
          <input
            type="text"
            value={form.slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            className={inputClasses}
            placeholder="post-url-slug"
          />
        </FormField>

        <FormField label="Content">
          <RichTextEditor
            value={form.content}
            onChange={(html) => onChange('content', html)}
          />
        </FormField>

        <FormField label="Excerpt" hint="Brief summary (max 500 chars)">
          <textarea
            value={form.excerpt}
            onChange={(event) => onChange('excerpt', event.target.value)}
            className={inputClasses}
            placeholder="A brief summary of the post"
            maxLength={500}
            rows={3}
          />
        </FormField>

        <FormField label="Hero Image URL" hint="Must start with https://">
          <input
            type="url"
            value={form.heroImageUrl}
            onChange={(event) => onChange('heroImageUrl', event.target.value)}
            className={inputClasses}
            placeholder="https://example.com/image.jpg"
          />
        </FormField>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">SEO</h3>

        <FormField
          label="Meta Title"
          charCount={{ current: form.metaTitle.length, max: 70 }}
        >
          <input
            type="text"
            value={form.metaTitle}
            onChange={(event) => onChange('metaTitle', event.target.value)}
            className={`${inputClasses} ${form.metaTitle.length > 70 ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="SEO title"
            maxLength={70}
          />
        </FormField>

        <FormField
          label="Meta Description"
          charCount={{ current: form.metaDescription.length, max: 160 }}
        >
          <textarea
            value={form.metaDescription}
            onChange={(event) => onChange('metaDescription', event.target.value)}
            className={`${inputClasses} ${form.metaDescription.length > 160 ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="SEO description"
            maxLength={160}
            rows={2}
          />
        </FormField>

        <FormField label="OG Image URL" hint="Must start with https://">
          <input
            type="url"
            value={form.ogImageUrl}
            onChange={(event) => onChange('ogImageUrl', event.target.value)}
            className={inputClasses}
            placeholder="https://example.com/og-image.jpg"
          />
        </FormField>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Author</h3>

        <FormField label="Author Name" hint="Max 100 characters">
          <input
            type="text"
            value={form.authorName}
            onChange={(event) => onChange('authorName', event.target.value)}
            className={inputClasses}
            placeholder="Author name"
            maxLength={100}
          />
        </FormField>

        <FormField label="Author Organization" hint="Max 100 characters">
          <input
            type="text"
            value={form.authorOrg}
            onChange={(event) => onChange('authorOrg', event.target.value)}
            className={inputClasses}
            placeholder="Organization name"
            maxLength={100}
          />
        </FormField>
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error saving post</h3>
            <p className="text-sm text-red-600 mt-1">{saveError.message}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => onSave('draft')}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving && form.status === 'draft' ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => onSave('published')}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving && form.status === 'published' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Publish
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
            <div className="h-5 bg-gray-200 rounded w-24 animate-pulse" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
            ))}
            <div className="h-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse mb-4" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function buildFormFromPost(post: BlogPost | undefined): FormState {
  if (!post) return INITIAL_FORM;

  return {
    title: post.title,
    slug: post.slug,
    content: post.content,
    excerpt: post.excerpt ?? '',
    heroImageUrl: post.heroImageUrl ?? '',
    metaTitle: post.metaTitle ?? '',
    metaDescription: post.metaDescription ?? '',
    ogImageUrl: post.ogImageUrl ?? '',
    authorName: post.authorName ?? '',
    authorOrg: post.authorOrg ?? '',
    status: post.status,
  };
}

function BlogEditorLoaded({
  existingPost,
  isEditing,
}: {
  existingPost: BlogPost | undefined;
  isEditing: boolean;
}) {
  const navigate = useNavigate();
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();

  const [form, setForm] = useState<FormState>(() => buildFormFromPost(existingPost));

  const handleChange = useCallback((field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  }, []);

  const handleSave = useCallback((status: BlogPostStatus) => {
    const payload = {
      title: form.title,
      slug: form.slug,
      content: form.content,
      excerpt: form.excerpt || undefined,
      heroImageUrl: form.heroImageUrl || undefined,
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
      ogImageUrl: form.ogImageUrl || undefined,
      authorName: form.authorName || undefined,
      authorOrg: form.authorOrg || undefined,
      status,
    };

    if (isEditing && existingPost) {
      updatePost.mutate(
        { id: existingPost.id, payload },
        { onSuccess: () => navigate('/blog') },
      );
    } else {
      createPost.mutate(payload, {
        onSuccess: () => navigate('/blog'),
      });
    }
  }, [form, isEditing, existingPost, updatePost, createPost, navigate]);

  const isSaving = createPost.isPending || updatePost.isPending;
  const saveError = createPost.error || updatePost.error;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {isEditing ? 'Edit Post' : 'New Post'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EditorForm
          form={form}
          onChange={handleChange}
          onSave={handleSave}
          isSaving={isSaving}
          isEditing={isEditing}
          saveError={saveError}
        />
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ContentPreview content={form.content} />
        </div>
      </div>
    </div>
  );
}

export function BlogEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getAccessToken } = useAuth();
  const isEditing = !!slug;

  const { data: existingPost, isLoading, isError, error } = useBlogPost(slug ?? '');

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/blog" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Blog Posts
          </Link>
          <span className="text-gray-400">/</span>
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </nav>
        <LoadingSkeleton />
      </div>
    );
  }

  if (isEditing && isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-red-800">Error loading post</h3>
          <p className="text-sm text-red-600 mt-1">{error?.message}</p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm">
        <Link to="/blog" className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" />
          Blog Posts
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">
          {isEditing ? 'Edit Post' : 'New Post'}
        </span>
      </nav>

      <BlogEditorLoaded
        key={existingPost?.id ?? 'new'}
        existingPost={existingPost}
        isEditing={isEditing}
      />
    </div>
  );
}
