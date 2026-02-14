import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IngredientInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('ingredients').insert(input).select().single();
      if (error) throw error;
      return data as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    },
  });
}

/** 장보기 항목 수정 (I-06) */
export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IngredientUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    },
  });
}

/** 장보기 항목 삭제 (I-06) */
export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('ingredients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    },
  });
}
