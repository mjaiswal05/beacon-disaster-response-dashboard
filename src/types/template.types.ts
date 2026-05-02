export type TemplateCategory = 'EVACUATION' | 'DISASTER_ALERT' | 'ALL_CLEAR' | 'RESOURCE_UPDATE' | 'GENERAL';
export type TemplateLanguage = 'en' | 'es' | 'fr' | 'zh';

export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  subject: string;
  body: string;
  variables: string[];
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: TemplateLanguage;
  subject: string;
  body: string;
  variables: string[];
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

export interface ListTemplatesParams {
  category?: TemplateCategory;
  language?: TemplateLanguage;
}
