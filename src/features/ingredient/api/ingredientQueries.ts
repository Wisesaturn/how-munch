import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { uniq } from 'es-toolkit';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/** query key factory */
const ingredientKeys = {
  all: ['ingredients'] as const,
  list: (householdId: string, year: number, month: number) =>
    [...ingredientKeys.all, 'list', householdId, year, month] as const,
  stores: (householdId: string) => [...ingredientKeys.all, 'stores', householdId] as const,
};

/** 월별 장보기 내역 조회 (I-01) */
export function useIngredientsQuery(householdId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ingredientKeys.list(householdId ?? '', year, month),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();
          const target = new Date(year, month - 1);
          const start = format(startOfMonth(target), 'yyyy-MM-dd');
          const end = format(endOfMonth(target), 'yyyy-MM-dd');

          const { data, error } = await supabase
            .from('ingredients')
            .select('*')
            .eq('household_id', householdId)
            .gte('date', start)
            .lte('date', end)
            .order('date', { ascending: false });

          if (error) throw error;
          return data as Ingredient[];
        }
      : skipToken,
  });
}

/** 구매처 목록 조회 — 자동완성용 (I-05) */
export function useStoreNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientKeys.stores(householdId ?? ''),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data, error } = await supabase
            .from('ingredients')
            .select('store')
            .eq('household_id', householdId)
            .not('store', 'is', null);

          if (error) throw error;
          return uniq((data ?? []).map((d) => d.store).filter(Boolean) as string[]);
        }
      : skipToken,
  });
}

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
