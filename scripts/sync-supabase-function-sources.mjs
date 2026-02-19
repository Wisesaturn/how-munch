#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DESCRIPTION_BY_NAME = {
  handle_new_user: {
    role: 'Auth 신규 사용자가 생성될 때 profiles 기본 행을 자동 생성합니다.',
    flow: [
      'auth.users INSERT 트리거에서 호출됩니다.',
      '새 user_id 기준으로 profiles 기본 데이터를 삽입합니다.',
    ],
  },
  handle_updated_at: {
    role: '테이블 갱신 시 updated_at을 현재 시각으로 동기화합니다.',
    flow: [
      'UPDATE 트리거에서 호출됩니다.',
      'new.updated_at = now()로 설정 후 NEW를 반환합니다.',
    ],
  },
  is_household_member: {
    role: '현재 인증 사용자가 특정 household 멤버인지 판별합니다.',
    flow: [
      'household_members 존재 여부를 조회합니다.',
      'RLS/보호 함수에서 공통 권한 체크로 사용합니다.',
    ],
  },
  join_household: {
    role: '초대 코드로 household 가입을 처리합니다.',
    flow: [
      '초대 코드 유효성과 사용 가능 횟수를 검증합니다.',
      '멤버십 추가, 초대 사용 횟수 증가, profile household 연결을 트랜잭션으로 처리합니다.',
    ],
  },
  ensure_current_user_household_member: {
    role: '현재 사용자의 household 멤버십을 보정합니다.',
    flow: [
      'profiles.household_id를 기준으로 membership 유무를 점검합니다.',
      '누락된 경우 household_members에 멤버 레코드를 보정 생성합니다.',
    ],
  },
  get_invite_household: {
    role: '초대 코드에 연결된 household 공개 정보를 조회합니다.',
    flow: [
      'invite 코드 기준으로 household를 조인 조회합니다.',
      '유효 여부와 함께 미리보기 용 데이터를 반환합니다.',
    ],
  },
  delete_my_account: {
    role: '현재 인증 사용자 계정 관련 데이터를 안전하게 정리합니다.',
    flow: [
      '본인 uid 기준 연관 데이터 정리/삭제를 수행합니다.',
      '최종적으로 auth 계정 삭제 워크플로우를 완료합니다.',
    ],
  },
  refresh_fridge_item_total_count: {
    role: '배치 합계를 기반으로 fridge_items.total_count/max_count를 재계산합니다.',
    flow: [
      '활성 배치들의 quantity 합계를 집계합니다.',
      'fridge_items 집계 컬럼을 최신 상태로 업데이트합니다.',
    ],
  },
  sync_fridge_item_total_count_from_batches: {
    role: 'fridge_item_batches 변경 이벤트를 감지해 재고 합계를 동기화합니다.',
    flow: [
      'INSERT/UPDATE/DELETE 트리거에서 호출됩니다.',
      '영향받은 fridge_item_id 대상으로 refresh 함수를 호출합니다.',
    ],
  },
  backfill_consume_meal_batch_usage: {
    role: '과거 데이터 마이그레이션용으로 meal usage를 배치 단위로 역산 기록합니다.',
    flow: [
      '요청 amount를 배치 FIFO 순으로 소진합니다.',
      'meal_batch_usages 기록과 배치 quantity 차감을 함께 수행합니다.',
    ],
  },
  handle_create_notification_preferences: {
    role: '사용자 생성 시 notification_preferences 기본값을 초기화합니다.',
    flow: [
      '신규 사용자 트리거에서 호출됩니다.',
      '사용자별 알림 설정 기본 행을 upsert/insert 합니다.',
    ],
  },
  generate_expiry_soon_notifications: {
    role: '유통기한 임박 재고를 스캔하여 알림 레코드를 생성합니다.',
    flow: [
      '대상 날짜 기준 임박 배치를 집계합니다.',
      '중복 방지 조건으로 notifications를 생성하고 생성 건수를 반환합니다.',
    ],
  },
  get_pending_push_notifications: {
    role: '푸시 전송 대기 중인 알림 목록을 조회합니다.',
    flow: [
      '전송 대상/상태 조건으로 후보를 필터링합니다.',
      'limit 기반으로 우선순위 순서 데이터를 반환합니다.',
    ],
  },
  mark_notifications_push_sent: {
    role: '푸시 전송 완료된 알림의 push_sent_at 상태를 마킹합니다.',
    flow: [
      '입력된 notification id 배열을 대상으로 업데이트합니다.',
      '중복 마킹을 피하면서 sent 상태만 갱신합니다.',
    ],
  },
  deactivate_push_subscription_by_endpoint: {
    role: '문제 endpoint 푸시 구독을 비활성화합니다.',
    flow: [
      'endpoint 일치 레코드를 조회합니다.',
      '활성 플래그/갱신 시각을 업데이트합니다.',
    ],
  },
  soft_delete_fridge_item: {
    role: '냉장고 아이템을 소프트 삭제하며 연관 배치 정리를 수행합니다.',
    flow: [
      '권한과 식단 사용 여부를 검증합니다.',
      '삭제 시각을 기록하고 연관 배치 정합성을 함께 맞춥니다.',
    ],
  },
  soft_delete_fridge_batch: {
    role: '냉장고 배치를 소프트 삭제합니다.',
    flow: [
      '식단 사용 중 배치인지 검증합니다.',
      '삭제 처리 후 아이템 총량 동기화를 수행합니다.',
    ],
  },
  soft_delete_ingredient: {
    role: '장보기 항목을 소프트 삭제합니다.',
    flow: ['권한/대상 존재를 검증합니다.', 'deleted_at을 설정해 논리 삭제합니다.'],
  },
  create_household_with_owner: {
    role: 'household 생성과 owner 멤버 연결을 원자적으로 처리합니다.',
    flow: [
      'household 생성 후 현재 유저를 owner로 등록합니다.',
      'profiles.household_id를 새 household로 갱신합니다.',
    ],
  },
  leave_household: {
    role: '현재 사용자의 household 탈퇴를 처리합니다.',
    flow: [
      'household_members에서 본인 멤버십을 제거합니다.',
      'profiles.household_id를 null로 정리합니다.',
    ],
  },
  add_ingredient_with_fridge: {
    role: '장보기 항목 생성과 냉장고 아이템/첫 배치를 한 트랜잭션으로 생성합니다.',
    flow: [
      'ingredient를 생성하고 category_id를 정규화합니다.',
      '연결 fridge_item + batch를 만들고 링크 컬럼을 업데이트합니다.',
    ],
  },
  update_ingredient_with_fridge: {
    role: '장보기 항목 수정 시 연결 냉장고 재고를 정합성 있게 동기화합니다.',
    flow: [
      'ingredient 업데이트 후 연결 item/batch 존재 상태를 분기 처리합니다.',
      '식단 사용량보다 작은 수량 설정을 차단하고 배치 수량을 재계산합니다.',
    ],
  },
  upsert_meal_with_usage: {
    role: '식단 저장 시 dish/ingredient와 배치 사용량 차감을 원자적으로 처리합니다.',
    flow: [
      '기존 meal usage를 롤백한 뒤 새 dishes/ingredients를 재저장합니다.',
      'FIFO 배치 차감 후 부족 시 도메인 예외를 발생시킵니다.',
    ],
  },
  delete_meal_with_usage_restore: {
    role: '식단 삭제 시 차감됐던 배치 사용량을 복원합니다.',
    flow: [
      'meal_batch_usages를 순회하며 batch quantity를 되돌립니다.',
      '복원 후 meal 레코드를 삭제합니다.',
    ],
  },
  create_fridge_item_with_batch: {
    role: '냉장고 아이템과 첫 배치를 동시에 생성합니다.',
    flow: [
      'category_id를 정규화하고 item을 생성합니다.',
      '입력 수량으로 첫 batch를 생성하고 item을 반환합니다.',
    ],
  },
  update_fridge_batch_guarded: {
    role: '배치 수정 시 식단 사용량/출처 정책을 검증하는 guarded 업데이트입니다.',
    flow: [
      '장보기 연동 배치 수량 직접 수정 금지 규칙을 검증합니다.',
      '사용 중 수량 하한을 지킨 뒤 변경값을 반영합니다.',
    ],
  },
  delete_ingredient_with_cleanup: {
    role: '장보기 삭제 시 연결된 냉장고 리소스를 함께 정리합니다.',
    flow: [
      '연결 batch/item 상태를 확인해 soft delete를 연쇄 수행합니다.',
      '마지막에 ingredient를 soft delete합니다.',
    ],
  },
  resolve_ingredient_category_id: {
    role: '카테고리 코드 문자열을 카테고리 UUID로 해석합니다.',
    flow: [
      'household 기본/커스텀 카테고리를 조회합니다.',
      '유효한 id를 반환하거나 fallback 정책을 적용합니다.',
    ],
  },
  reassign_items_to_other_category_before_delete: {
    role: '카테고리 삭제 전에 연관 아이템을 기타 카테고리로 재배치합니다.',
    flow: [
      '삭제 대상 카테고리를 참조하는 행을 탐색합니다.',
      '기타 카테고리로 FK를 재할당해 삭제 제약을 충족합니다.',
    ],
  },
  sync_category_reference_columns: {
    role: '카테고리 전환 마이그레이션 시 구/신 참조 컬럼 값을 동기화합니다.',
    flow: [
      'category_id와 레거시 category code를 상호 변환합니다.',
      '트리거/배치 실행으로 컬럼 간 정합성을 유지합니다.',
    ],
  },
  sync_items_category_code_after_category_update: {
    role: '카테고리 변경 시 관련 아이템의 category code를 후속 동기화합니다.',
    flow: [
      '카테고리 업데이트 이벤트를 감지합니다.',
      '연관 ingredients/fridge_items의 code 참조를 맞춥니다.',
    ],
  },
  normalize_ingredient_category_id: {
    role: '입력 category_id를 household 기준 유효한 값으로 정규화합니다.',
    flow: [
      'null/invalid 입력을 기본 기타 카테고리로 보정합니다.',
      '유효한 category_id를 반환하여 RPC 내부에서 공통 사용합니다.',
    ],
  },
};

function listMigrationFiles() {
  return execSync('ls supabase/migrations/*.sql | sort', { encoding: 'utf8' })
    .trim()
    .split('\n');
}

function extractCreateStatement(sql, name) {
  const re = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${name}\\s*\\(`, 'gi');
  let match;
  let start = -1;

  while ((match = re.exec(sql))) {
    start = match.index;
  }

  if (start < 0) return null;

  const firstDollar = sql.indexOf('$$', start);
  const secondDollar = firstDollar >= 0 ? sql.indexOf('$$', firstDollar + 2) : -1;
  const semicolon = secondDollar >= 0 ? sql.indexOf(';', secondDollar + 2) : -1;

  if (firstDollar < 0 || secondDollar < 0 || semicolon < 0) return null;

  return sql.slice(start, semicolon + 1).trim();
}

function resolveLatestFunctions(migrationFiles) {
  const latestByName = new Map();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const re = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-zA-Z0-9_]+)\s*\(/gim;
    let match;

    while ((match = re.exec(content))) {
      latestByName.set(match[1], { file });
    }
  }

  return latestByName;
}

function buildHeader(name, sourcePath) {
  const meta = DESCRIPTION_BY_NAME[name] ?? {
    role: '역할 설명이 필요한 함수입니다. SQL 본문을 기준으로 동작을 확인해 주세요.',
    flow: ['입력값/권한을 검증합니다.', '도메인 목적에 맞는 데이터 변경을 수행합니다.'],
  };

  return [
    `-- Function: public.${name}`,
    `-- Source: ${sourcePath}`,
    `-- 역할: ${meta.role}`,
    '-- 동작:',
    ...meta.flow.map((step, index) => `-- ${index + 1}. ${step}`),
    '',
  ].join('\n');
}

function writeFunctionFiles(latestByName) {
  const outDir = path.join('supabase', 'sql', 'functions', 'public');
  fs.mkdirSync(outDir, { recursive: true });

  const rows = [];
  for (const [name, info] of [...latestByName.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const content = fs.readFileSync(info.file, 'utf8');
    const createStatement = extractCreateStatement(content, name);

    if (!createStatement) {
      throw new Error(`Could not extract function public.${name} from ${info.file}`);
    }

    const header = buildHeader(name, info.file);
    const targetFile = path.join(outDir, `${name}.sql`);
    fs.writeFileSync(targetFile, `${header}${createStatement}\n`);

    rows.push({ name, file: targetFile, source: info.file });
  }

  return rows;
}

function writeIndexReadme(rows) {
  const lines = [];
  lines.push('# Supabase SQL Functions');
  lines.push('');
  lines.push('이 디렉토리는 현재 마이그레이션 기준 최신 `public` 함수 정의를 함수 단위 파일로 분리한 참조 소스입니다.');
  lines.push('');
  lines.push('## 파일 목록');
  lines.push('');
  lines.push('| Function | File | Latest Source Migration |');
  lines.push('| --- | --- | --- |');

  for (const row of rows) {
    lines.push(`| \`public.${row.name}\` | \`${row.file}\` | \`${row.source}\` |`);
  }

  lines.push('');

  fs.mkdirSync(path.join('supabase', 'sql', 'functions'), { recursive: true });
  fs.writeFileSync(path.join('supabase', 'sql', 'functions', 'README.md'), lines.join('\n'));
}

function main() {
  const migrationFiles = listMigrationFiles();
  const latestByName = resolveLatestFunctions(migrationFiles);
  const rows = writeFunctionFiles(latestByName);
  writeIndexReadme(rows);

  process.stdout.write(`Generated ${rows.length} function files in supabase/sql/functions/public\\n`);
}

main();
