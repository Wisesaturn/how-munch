#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="${ROOT_DIR}/output/test-runner"
TEST_LOG="${TMP_DIR}/test-output.log"
COMPILE_LOG="${TMP_DIR}/compile-output.log"
START_TS="$(date +%s)"
TEST_STRICT="${TEST_STRICT:-1}"
TEST_VERBOSE="${TEST_VERBOSE:-0}"
HAS_FAILURE=0

COLOR_BLUE='\033[1;34m'
COLOR_GREEN='\033[1;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[1;31m'
COLOR_RESET='\033[0m'

print_step() {
  echo -e "${COLOR_BLUE}$1${COLOR_RESET}"
}

print_success() {
  echo -e "${COLOR_GREEN}$1${COLOR_RESET}"
}

print_warn() {
  echo -e "${COLOR_YELLOW}$1${COLOR_RESET}"
}

print_error() {
  echo -e "${COLOR_RED}$1${COLOR_RESET}"
}

print_divider() {
  printf '%s\n' "------------------------------------------------------------"
}

finish_with_status() {
  local status="${1}"
  if [[ "${status}" -eq 0 ]]; then
    return 0
  fi

  if [[ "${TEST_STRICT}" == "1" ]]; then
    exit "${status}"
  fi
  return 0
}

print_test_report() {
  local pass_count="${1}"
  local fail_count="${2}"
  local total_count="${3}"
  local suite_count="${4}"
  local duration_ms="${5}"
  local test_log_path="${6}"

  print_divider
  print_step "Test Report"
  echo "Suites : ${suite_count}"
  echo "Tests  : ${total_count}"
  echo -e "Pass   : ${COLOR_GREEN}${pass_count}${COLOR_RESET}"
  echo -e "Fail   : ${COLOR_RED}${fail_count}${COLOR_RESET}"
  echo "Time   : ${duration_ms}ms"
  print_divider

  print_step "Detailed Cases"
  while IFS= read -r line; do
    if [[ "${line}" =~ ^[[:space:]]+ok[[:space:]][0-9]+[[:space:]]-[[:space:]](.+)$ ]]; then
      echo -e "${COLOR_GREEN}[PASS]${COLOR_RESET} ${BASH_REMATCH[1]}"
      continue
    fi
    if [[ "${line}" =~ ^[[:space:]]+not\ ok[[:space:]][0-9]+[[:space:]]-[[:space:]](.+)$ ]]; then
      echo -e "${COLOR_RED}[FAIL]${COLOR_RESET} ${BASH_REMATCH[1]}"
      continue
    fi
  done < "${test_log_path}"
  print_divider
}

cleanup() {
  rm -rf "${TMP_DIR}"
}

trap cleanup EXIT

TEST_FILES=()
if command -v rg >/dev/null 2>&1; then
  while IFS= read -r file; do
    TEST_FILES+=("${file}")
  done < <(
    cd "${ROOT_DIR}" &&
      rg --files \
        -g "*.test.ts" \
        -g "!node_modules/**" \
        -g "!.next/**" \
        -g "!output/**"
  )
else
  while IFS= read -r file; do
    file="${file#./}"
    TEST_FILES+=("${file}")
  done < <(
    cd "${ROOT_DIR}" &&
      find . \
        -path "./node_modules" -prune -o \
        -path "./.next" -prune -o \
        -path "./output" -prune -o \
        -type f -name "*.test.ts" -print | sort
  )
fi

if [[ ${#TEST_FILES[@]} -eq 0 ]]; then
  print_warn "실행할 .test.ts 파일이 없습니다."
  exit 0
fi

mkdir -p "${TMP_DIR}"
print_divider
print_step "TypeScript Test Runner"
echo "프로젝트: ${ROOT_DIR}"
echo "테스트 파일 수: ${#TEST_FILES[@]}"
printf '%s\n' "${TEST_FILES[@]}" | sed 's/^/- /'
print_divider

print_step "[1/3] TypeScript 테스트 파일 컴파일"
if ! pnpm exec tsc \
  "${TEST_FILES[@]}" \
  --outDir "${TMP_DIR}" \
  --module nodenext \
  --moduleResolution nodenext \
  --target es2022 \
  --types node \
  --esModuleInterop \
  --skipLibCheck false >"${COMPILE_LOG}" 2>&1; then
  print_error "컴파일 실패:"
  cat "${COMPILE_LOG}"
  HAS_FAILURE=1
  finish_with_status 1
  exit 0
fi

EMITTED_TEST_FILES=()
while IFS= read -r file; do
  EMITTED_TEST_FILES+=("${file}")
done < <(find "${TMP_DIR}" -type f -name "*.test.js" | sort)

if [[ ${#EMITTED_TEST_FILES[@]} -eq 0 ]]; then
  print_error "컴파일된 테스트 JS 파일을 찾지 못했습니다."
  HAS_FAILURE=1
  finish_with_status 1
  exit 0
fi

print_step "[2/3] 테스트 실행"
set +e
node --test "${EMITTED_TEST_FILES[@]}" >"${TEST_LOG}" 2>&1
TEST_EXIT_CODE=$?
set -e

print_step "[3/3] 결과 요약"
PASS_COUNT="$(awk '/^# pass / { print $3 }' "${TEST_LOG}")"
FAIL_COUNT="$(awk '/^# fail / { print $3 }' "${TEST_LOG}")"
TOTAL_COUNT="$(awk '/^# tests / { print $3 }' "${TEST_LOG}")"
SUITE_COUNT="$(awk '/^# suites / { print $3 }' "${TEST_LOG}")"
DURATION_MS="$(awk '/^# duration_ms / { print $3 }' "${TEST_LOG}")"

print_test_report \
  "${PASS_COUNT:-0}" \
  "${FAIL_COUNT:-0}" \
  "${TOTAL_COUNT:-0}" \
  "${SUITE_COUNT:-0}" \
  "${DURATION_MS:-0}" \
  "${TEST_LOG}"

if [[ ${TEST_EXIT_CODE} -ne 0 ]]; then
  HAS_FAILURE=1
  print_divider
  print_error "Failed Cases"
  awk '
    function flush_case() {
      if (case_name == "") return;
      print "\033[1;31m• 실패 케이스:\033[0m " case_name;
      if (location != "") print "  \033[1;34m파일 위치\033[0m   : " location;
      if (expected != "") print "  \033[1;33m기대값\033[0m      : " expected;
      if (actual != "") print "  \033[1;35m실제값\033[0m      : " actual;
      if (operator != "") print "  \033[1;36m비교 연산자\033[0m : " operator;
      print "";
      case_name=""; location=""; expected=""; actual=""; operator="";
    }

    /^    not ok [0-9]+ - / {
      flush_case();
      case_name = $0;
      sub(/^    not ok [0-9]+ - /, "", case_name);
      has_failed = 1;
      next;
    }

    /^      location: / {
      location = $0;
      sub(/^      location: /, "", location);
      next;
    }
    /^      expected: / {
      expected = $0;
      sub(/^      expected: /, "", expected);
      next;
    }
    /^      actual: / {
      actual = $0;
      sub(/^      actual: /, "", actual);
      next;
    }
    /^      operator: / {
      operator = $0;
      sub(/^      operator: /, "", operator);
      next;
    }

    END {
      flush_case();
      if (!has_failed) {
        print "• 실패 요약을 찾지 못했습니다. TEST_VERBOSE=1 로 다시 실행해 전체 로그를 확인해 주세요.";
      }
    }
  ' "${TEST_LOG}"

  print_warn "Tip: 자세한 원본 TAP 로그가 필요하면 TEST_VERBOSE=1 pnpm test 로 실행하세요."
  if [[ "${TEST_VERBOSE}" == "1" ]]; then
    print_divider
    print_warn "원본 TAP 로그:"
    cat "${TEST_LOG}"
  fi
  finish_with_status "${TEST_EXIT_CODE}"
  exit 0
fi

END_TS="$(date +%s)"
ELAPSED_SECONDS=$((END_TS - START_TS))

if [[ "${HAS_FAILURE}" -eq 1 ]]; then
  print_warn "테스트 실패 (로컬 모드로 종료 코드는 0)"
  echo "총 소요 시간: ${ELAPSED_SECONDS}s"
  print_divider
  exit 0
fi

print_success "모든 테스트 통과 (${#EMITTED_TEST_FILES[@]} files)"
echo "총 소요 시간: ${ELAPSED_SECONDS}s"
print_divider
