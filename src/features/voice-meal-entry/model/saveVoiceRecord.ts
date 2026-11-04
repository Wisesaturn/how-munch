import { apiClient } from '@/commons/lib';

import { buildVoiceRecordPayload, type VoiceRecordPayloadInput } from '../lib';

/** @description 음성 기록을 한 번에 저장한다. 하나라도 실패하면 전부 취소되고 오류를 던진다 */
export async function saveVoiceRecord(input: VoiceRecordPayloadInput) {
  await apiClient.post('/api/assistant/save-record', buildVoiceRecordPayload(input));
}
