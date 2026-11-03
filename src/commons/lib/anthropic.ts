import Anthropic from '@anthropic-ai/sdk';

/**
 * 서버 경로에서 쓰는 Anthropic 클라이언트를 만든다.
 * 워크스페이스에 묶이지 않은 키는 요청마다 `anthropic-workspace-id` 헤더가 있어야 해서,
 * `ANTHROPIC_WORKSPACE_ID`가 있으면 기본 헤더로 붙인다.
 */
export function createAnthropic(apiKey: string): Anthropic {
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic({
    apiKey,
    defaultHeaders: workspaceId ? { 'anthropic-workspace-id': workspaceId } : undefined,
  });
}
