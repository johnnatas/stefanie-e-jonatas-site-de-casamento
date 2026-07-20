const LITERAL_BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"];

export function isBlockedHost(hostname: string): boolean {
  if (LITERAL_BLOCKED_HOSTS.includes(hostname)) {
    return true;
  }
  if (/^10\./.test(hostname)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) {
    return true;
  }
  if (/^192\.168\./.test(hostname)) {
    return true;
  }
  if (/^169\.254\./.test(hostname)) {
    return true;
  }
  return false;
}
