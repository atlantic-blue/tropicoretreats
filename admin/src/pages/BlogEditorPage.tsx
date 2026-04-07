import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronLeft, Save, Eye, Loader2, AlertCircle,
  Bold, Italic, Heading2, Heading3, List, ListOrdered, LinkIcon, ImageIcon,
  Calendar, User, ExternalLink, Upload,
} from 'lucide-react';
import { useBlogPost, useCreateBlogPost, useUpdateBlogPost } from '../hooks/useBlog';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { blogApi } from '../api/blog';
import type { BlogPost, BlogPostStatus } from '../types/blog';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || '';

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
 * Converts Google Docs inline-style spans to semantic HTML tags,
 * then strips remaining cruft while keeping all formatting.
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
    'IMG', 'HR', 'SUP', 'SUB',
  ]);

  /**
   * Phase 1: Convert styled spans to semantic tags.
   * Google Docs uses <span style="font-weight:700"> instead of <strong>.
   */
  function convertStyledSpans(node: Node): void {
    const spans = Array.from(
      (node as Element).querySelectorAll?.('span') ?? []
    );
    for (const span of spans) {
      const style = span.style;
      let current: HTMLElement = span;

      // font-weight: bold / 700+
      const weight = style.fontWeight;
      if (weight === 'bold' || weight === 'bolder' || parseInt(weight) >= 600) {
        const strong = document.createElement('strong');
        strong.innerHTML = current.innerHTML;
        current.replaceWith(strong);
        current = strong;
      }

      // font-style: italic
      if (style.fontStyle === 'italic') {
        const em = document.createElement('em');
        em.innerHTML = current.innerHTML;
        current.replaceWith(em);
        current = em;
      }

      // text-decoration: underline
      if (style.textDecoration?.includes('underline')) {
        const u = document.createElement('u');
        u.innerHTML = current.innerHTML;
        current.replaceWith(u);
        current = u;
      }

      // text-decoration: line-through
      if (style.textDecoration?.includes('line-through')) {
        const s = document.createElement('s');
        s.innerHTML = current.innerHTML;
        current.replaceWith(s);
        current = s;
      }
    }
  }

  /**
   * Phase 2: Clean remaining nodes — unwrap unknown tags, strip attributes.
   */
  function clean(node: Node): void {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;

        // Convert B to STRONG, I to EM
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

        if (!ALLOWED_TAGS.has(element.tagName)) {
          // Unwrap: keep children, remove the tag
          while (element.firstChild) {
            node.insertBefore(element.firstChild, element);
          }
          node.removeChild(element);
          continue;
        }

        // Strip all attributes except href on links, src/alt on images
        const attrs = Array.from(element.attributes);
        for (const attr of attrs) {
          if (element.tagName === 'A' && attr.name === 'href') continue;
          if (element.tagName === 'IMG' && (attr.name === 'src' || attr.name === 'alt')) continue;
          element.removeAttribute(attr.name);
        }

        clean(element);
      }
    }
  }

  // Phase 1: convert styled spans to semantic tags
  convertStyledSpans(temp);
  // Phase 2: clean up everything else
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, imageUrl } = await blogApi.presignImageUpload(
        file.name,
        file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        'inline',
      );

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      const escapedUrl = imageUrl.replace(/"/g, '&quot;');
      const escapedAlt = alt.replace(/"/g, '&quot;');
      document.execCommand('insertHTML', false, `<img src="${escapedUrl}" alt="${escapedAlt}" />`);
      editorRef.current?.focus();
      handleInput();
    } catch (error) {
      alert(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border border-b-0 border-gray-300 rounded-t-md bg-gray-50">
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
        <ToolbarButton onClick={insertImage} title="Upload image">
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full min-h-64 px-3 py-2 border border-gray-300 rounded-b-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-y-auto bg-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_li]:mb-1 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_img]:max-w-full [&_img]:rounded [&_img]:my-2"
        data-placeholder="Write your blog post content or paste from Google Docs..."
        suppressContentEditableWarning
      />
    </div>
  );
}

function ContentPreview({ form }: { form: FormState }) {
  const hasHero = !!form.heroImageUrl || !!form.title;
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden h-full">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
        <Eye className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Preview</h3>
      </div>

      <div className="bg-[#F7F1EC] min-h-[400px]">
        {/* Hero Section */}
        {hasHero && (
          <section className="relative h-[200px]">
            <div className="absolute inset-0">
              {form.heroImageUrl ? (
                <img src={form.heroImageUrl} alt={form.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-800 to-emerald-600" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
            </div>
            <div className="relative flex h-full items-end pb-4">
              <div className="w-full px-4">
                {form.title && (
                  <h1 className="font-serif text-lg font-bold text-white leading-tight">
                    {form.title}
                  </h1>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {today}
                  </span>
                  {form.authorName && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {form.authorName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Content */}
        <div className="px-4 py-6">
          {form.content ? (
            <div
              className="text-sm text-gray-800 leading-relaxed [&_h1]:font-serif [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:font-serif [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3 [&_li]:mb-1 [&_a]:text-emerald-700 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-bold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-[#C9A227] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-3 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-3 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-3 [&_hr]:my-6 [&_hr]:border-gray-200"
              dangerouslySetInnerHTML={{ __html: form.content }}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">Start writing to see a preview...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, imageUrl } = await blogApi.presignImageUpload(
        file.name,
        file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        'hero',
      );

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      onChange(imageUrl);
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const inputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClasses} flex-1`}
          placeholder="https://images.tropicoretreat.com/..."
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      {value && (
        <img
          src={value}
          alt="Hero preview"
          className="w-full h-32 object-cover rounded-md border"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
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

        <FormField label="Hero Image" hint="Upload an image or paste a URL">
          <HeroImageUpload
            value={form.heroImageUrl}
            onChange={(value) => onChange('heroImageUrl', value)}
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
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

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
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Post' : 'New Post'}
        </h1>
        {isEditing && existingPost?.status === 'published' && FRONTEND_URL && (
          <a
            href={`${FRONTEND_URL}/blog/${existingPost.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on site
          </a>
        )}
      </div>

      {/* Mobile tab toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            mobileTab === 'editor'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Editor
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === 'preview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={mobileTab === 'preview' ? 'hidden lg:block' : ''}>
          <EditorForm
            form={form}
            onChange={handleChange}
            onSave={handleSave}
            isSaving={isSaving}
            isEditing={isEditing}
            saveError={saveError}
          />
        </div>
        <div className={`lg:sticky lg:top-6 lg:self-start ${mobileTab === 'editor' ? 'hidden lg:block' : ''}`}>
          <ContentPreview form={form} />
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
