/** 가구 — 식비/재고를 공동 관리하는 그룹 단위 */
export interface Household {
  id: string;
  /** 가구 이름 (예: "우리집") */
  name: string;
  created_at: string;
  updated_at: string;
}

/** 가구 멤버 역할 — owner: 생성자, member: 초대된 멤버 */
export type HouseholdMemberRole = 'owner' | 'member';

/** 가구 멤버 — 가구에 소속된 유저 */
export interface HouseholdMember {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** auth.users ID */
  user_id: string;
  role: HouseholdMemberRole;
  created_at: string;
}
