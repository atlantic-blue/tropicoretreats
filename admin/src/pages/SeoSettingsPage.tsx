import { useEffect, useState } from 'react';
import { Search, Plus, Save, X, Loader2, AlertCircle, Globe } from 'lucide-react';
import { useSeoSettings, useUpsertSeoSetting } from '../hooks/useSeo';
import { setTokenGetter } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { SeoSetting, UpsertSeoPayload } from '../api/seo';

interface FormState {
  path: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  keywords: string;
}

const EMPTY_FORM: FormState = {
  path: '',
  metaTitle: '',
  metaDescription: '',
  ogTitle: '',
  ogDescription: '',
  ogImageUrl: '',
  keywords: '',
};

function formFromSetting(setting: SeoSetting): FormState {
  return {
    path: setting.path,
    metaTitle: setting.metaTitle,
    metaDescription: setting.metaDescription,
    ogTitle: setting.ogTitle ?? '',
    ogDescription: setting.ogDescription ?? '',
    ogImageUrl: setting.ogImageUrl ?? '',
    keywords: setting.keywords ?? '',
  };
}

function SeoForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  isNew,
  error,
}: {
  form: FormState;
  onChange: (field: keyof FormState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  isNew: boolean;
  error: Error | null;
}) {
  const inputClasses =
    'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {isNew ? 'New SEO Override' : `Edit: ${form.path}`}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {isNew && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page Path</label>
          <input
            type="text"
            value={form.path}
            onChange={(event) => onChange('path', event.target.value)}
            className={inputClasses}
            placeholder="/about or /blog/my-post"
          />
          <p className="text-xs text-gray-400 mt-1">Must start with /</p>
        </div>
      )}

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="block text-sm font-medium text-gray-700">Meta Title</label>
          <span
            className={`text-xs ${form.metaTitle.length > 70 ? 'text-red-500 font-medium' : 'text-gray-400'}`}
          >
            {form.metaTitle.length}/70
          </span>
        </div>
        <input
          type="text"
          value={form.metaTitle}
          onChange={(event) => onChange('metaTitle', event.target.value)}
          className={`${inputClasses} ${form.metaTitle.length > 70 ? 'border-red-300' : ''}`}
          placeholder="Page title for search engines"
          maxLength={70}
        />
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="block text-sm font-medium text-gray-700">Meta Description</label>
          <span
            className={`text-xs ${form.metaDescription.length > 160 ? 'text-red-500 font-medium' : 'text-gray-400'}`}
          >
            {form.metaDescription.length}/160
          </span>
        </div>
        <textarea
          value={form.metaDescription}
          onChange={(event) => onChange('metaDescription', event.target.value)}
          className={`${inputClasses} ${form.metaDescription.length > 160 ? 'border-red-300' : ''}`}
          placeholder="Page description for search engines"
          maxLength={160}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OG Title</label>
          <input
            type="text"
            value={form.ogTitle}
            onChange={(event) => onChange('ogTitle', event.target.value)}
            className={inputClasses}
            placeholder="Defaults to meta title"
            maxLength={70}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">OG Description</label>
          <input
            type="text"
            value={form.ogDescription}
            onChange={(event) => onChange('ogDescription', event.target.value)}
            className={inputClasses}
            placeholder="Defaults to meta description"
            maxLength={160}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">OG Image URL</label>
        <input
          type="url"
          value={form.ogImageUrl}
          onChange={(event) => onChange('ogImageUrl', event.target.value)}
          className={inputClasses}
          placeholder="https://images.tropicoretreat.com/og.webp"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
        <input
          type="text"
          value={form.keywords}
          onChange={(event) => onChange('keywords', event.target.value)}
          className={inputClasses}
          placeholder="retreats, caribbean, luxury"
          maxLength={500}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error.message}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={isSaving || !form.path || !form.metaTitle || !form.metaDescription}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function SettingsTable({
  settings,
  searchQuery,
  onEdit,
}: {
  settings: SeoSetting[];
  searchQuery: string;
  onEdit: (setting: SeoSetting) => void;
}) {
  const filtered = settings.filter(
    (setting) =>
      setting.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.metaTitle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (filtered.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          {searchQuery ? 'No overrides match your search.' : 'No SEO overrides yet.'}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          Click "Add Override" to set custom meta tags for a page.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Path
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Meta Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Meta Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
              Updated
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {filtered.map((setting) => (
            <tr key={setting.path} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-mono text-gray-900">{setting.path}</td>
              <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">
                {setting.metaTitle}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 max-w-[250px] truncate hidden md:table-cell">
                {setting.metaDescription}
              </td>
              <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                {new Date(setting.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onEdit(setting)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeoSettingsPage() {
  const { getAccessToken } = useAuth();
  const { data, isLoading, isError, error } = useSeoSettings();
  const upsertMutation = useUpsertSeoSetting();

  const [form, setForm] = useState<FormState | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setTokenGetter(getAccessToken);
  }, [getAccessToken]);

  const handleEdit = (setting: SeoSetting) => {
    setForm(formFromSetting(setting));
    setIsNew(false);
  };

  const handleNew = () => {
    setForm({ ...EMPTY_FORM });
    setIsNew(true);
  };

  const handleCancel = () => {
    setForm(null);
    upsertMutation.reset();
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((previous) => (previous ? { ...previous, [field]: value } : null));
  };

  const handleSave = () => {
    if (!form) return;

    const payload: UpsertSeoPayload = {
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      ogTitle: form.ogTitle || undefined,
      ogDescription: form.ogDescription || undefined,
      ogImageUrl: form.ogImageUrl || undefined,
      keywords: form.keywords || undefined,
    };

    upsertMutation.mutate(
      { path: form.path, payload },
      { onSuccess: () => setForm(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading settings</h3>
            <p className="text-sm text-red-600 mt-1">{error?.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const settings = data?.settings ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Override
        </button>
      </div>

      {form ? (
        <SeoForm
          form={form}
          onChange={handleChange}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={upsertMutation.isPending}
          isNew={isNew}
          error={upsertMutation.error}
        />
      ) : (
        <>
          {settings.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by path or title..."
              />
            </div>
          )}
          <SettingsTable settings={settings} searchQuery={searchQuery} onEdit={handleEdit} />
        </>
      )}
    </div>
  );
}
