import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { type Profile } from '../model/types';

import { profileKeys } from './queryKey';

/** 내 프로필 조회 */
export function useProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: userId ? () => apiClient.get<Profile>('/api/profile') : skipToken,
  });
}
