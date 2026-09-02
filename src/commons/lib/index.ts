export { apiClient } from './http/apiClient';
export { type ApiResponse } from './http/apiTypes';
export { cn } from './cn';
export { createSafeContext } from './context';
export { DOMAIN_ERROR_CODE, DOMAIN_ERROR_MESSAGE, resolveDomainError } from './error/domainError';
export { ERROR_MSG } from './error/errorMessage';
export { extractFieldErrorMessage } from './error/extractFieldErrorMessage';
export {
  getCurrentPushSubscription,
  isNotificationSupported,
  registerNotificationServiceWorker,
  requestNotificationPermission,
  showSystemNotification,
  subscribePush,
  unsubscribePush,
  urlBase64ToUint8Array,
} from './notification';
export { parseSafeNumericInput } from './numericInput';
export {
  containsSearchText,
  isChoseongQuery,
  matchesSearchText,
  normalizeSearchText,
} from './search/hangulSearch';
export {
  createSynonymIndex,
  expandWithSynonyms,
  type SynonymGroup,
  type SynonymIndex,
} from './search/synonym';
export { uuid } from './uuid';
export { cva, type VariantProps } from 'class-variance-authority';
// apiResponse는 server-only (next/server 의존) → Route Handler에서 직접 import: '@/commons/lib/http/apiResponse'
// withAuth, AuthContext → '@/apps/route'
