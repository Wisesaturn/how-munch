import { skipToken, useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { uniq } from 'es-toolkit';

import { createClient } from '@/commons/api/supabase/client';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

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
            .is('deleted_at', null)
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
            .is('deleted_at', null)
            .not('store', 'is', null);

          if (error) throw error;
          return uniq((data ?? []).map((d) => d.store).filter(Boolean) as string[]);
        }
      : skipToken,
  });
}
