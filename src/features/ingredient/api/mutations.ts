import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { fridgeKeys } from '@/commons/model/queryKey';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/**
 * @description 장보기 도메인 DB 에러를 사용자 메시지로 변환합니다.
 */
function resolveIngredientError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('장보기 처리 중 오류가 발생했습니다.');
}

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IngredientInsert) => {
      const supabase = createClient();
      const count = input.count ?? 1;
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc('add_ingredient_with_fridge', {
        p_household_id: input.household_id,
        p_name: input.name,
        p_price: input.price ?? 0,
        p_store: input.store ?? null,
        p_category_id: input.category_id,
        p_count: count,
        p_unit: input.unit ?? 'count',
        p_date: date,
      });
      if (error) throw resolveIngredientError(error);

      return data as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 장보기 항목 수정 (I-06) */
export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IngredientUpdate & { id: string }) => {
      const supabase = createClient();
      const patch = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      const { data, error } = await supabase.rpc('update_ingredient_with_fridge', {
        p_ingredient_id: id,
        p_updates: patch,
      });
      if (error) throw resolveIngredientError(error);

      return data as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 장보기 항목 삭제 (I-06) */
export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error: deleteIngredientError } = await supabase.rpc(
        'delete_ingredient_with_cleanup',
        {
          p_ingredient_id: id,
        },
      );
      if (deleteIngredientError) throw resolveIngredientError(deleteIngredientError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
