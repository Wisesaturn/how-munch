/** 사용자 프로필 */
export interface Profile {
  id: number;
  /** auth.users ID */
  user_id: string;
  email: string;
  nickname: string;
  /** 소속 가구 ID (null이면 아직 가구 미가입) */
  household_id: string | null;
  created_at: string;
  updated_at: string;
}
