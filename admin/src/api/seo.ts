import { fetchWithAuth } from './client';

export interface SeoSetting {
  path: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SeoSettingsResponse {
  settings: SeoSetting[];
}

export interface UpsertSeoPayload {
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
  keywords?: string;
}

export const seoApi = {
  list: async (): Promise<SeoSettingsResponse> => {
    return fetchWithAuth<SeoSettingsResponse>('/seo/settings');
  },

  upsert: async (path: string, payload: UpsertSeoPayload): Promise<{ setting: SeoSetting }> => {
    const encodedPath = encodeURIComponent(path);
    return fetchWithAuth<{ setting: SeoSetting }>(`/seo/settings/${encodedPath}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
