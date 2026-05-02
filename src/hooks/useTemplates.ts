import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemplate,
  deleteTemplate,
  listTemplates,
  updateTemplate,
} from '../services/template.api';
import type {
  CreateTemplatePayload,
  ListTemplatesParams,
  UpdateTemplatePayload,
} from '../services/template.api';

export function useTemplates(params?: ListTemplatesParams) {
  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['templates', params],
    queryFn: () => listTemplates(params),
    staleTime: 60_000,
  });

  return {
    templates,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTemplatePayload }) =>
      updateTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
