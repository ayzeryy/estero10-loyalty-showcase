export const PROJECT_ID = 'estero10-loyalty-showcase';
export const API_PORT = '55321';

export function assertShowcaseUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== API_PORT || url.username || url.password ||
    url.pathname !== '/' || url.search || url.hash
  ) {
    throw new Error(`Only the isolated local showcase API on port ${API_PORT} is allowed.`);
  }
  return url;
}

export function assertShowcaseConfig(config) {
  if (!/^project_id\s*=\s*"estero10-loyalty-showcase"\s*$/m.test(config)) {
    throw new Error(`Expected local project ${PROJECT_ID}.`);
  }
  const api = config.match(/^\[api\][ \t]*\r?\n([\s\S]*?)(?=^\[|(?![\s\S]))/m)?.[1];
  if (!api || !/^port\s*=\s*55321\s*$/m.test(api)) {
    throw new Error('Expected showcase API port 55321.');
  }
}
