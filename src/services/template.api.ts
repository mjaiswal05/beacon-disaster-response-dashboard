import type {
  CreateTemplatePayload,
  ListTemplatesParams,
  Template,
  UpdateTemplatePayload,
} from "../types/template.types";
import { request } from "../utils/request";

export type {
  CreateTemplatePayload,
  ListTemplatesParams,
  Template,
  TemplateCategory,
  TemplateLanguage,
  UpdateTemplatePayload
} from "../types/template.types";

const NOTIF = "/api/notification/v1";

export async function listTemplates(params?: ListTemplatesParams): Promise<Template[]> {
  const data = await request.get<{ success: boolean; data: Template[] }>(`${NOTIF}/templates`, {
    params: params as Record<string, string | number | boolean> | undefined,
  });
  return data.data;
}

export async function getTemplateById(id: string): Promise<Template> {
  return request.get<Template>(`${NOTIF}/templates/${encodeURIComponent(id)}`);
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<Template> {
  return request.post<Template>(`${NOTIF}/templates`, payload);
}

export async function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<Template> {
  return request.put<Template>(`${NOTIF}/templates/${encodeURIComponent(id)}`, payload);
}

export async function deleteTemplate(id: string): Promise<void> {
  await request.del(`${NOTIF}/templates/${encodeURIComponent(id)}`);
}
