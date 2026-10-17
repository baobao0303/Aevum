export const DEFAULT_SELF_HOSTED_SERVER_NAME = 'Aevum';

export function getSelfHostedServerName(serverName?: string | null) {
  return serverName &&
    serverName !== DEFAULT_SELF_HOSTED_SERVER_NAME &&
    serverName !== 'Aevum Self-hosted'
    ? `${DEFAULT_SELF_HOSTED_SERVER_NAME} (${serverName})`
    : DEFAULT_SELF_HOSTED_SERVER_NAME;
}
