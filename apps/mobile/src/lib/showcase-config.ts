export function assertLocalShowcaseEndpoint(value: string): void {
  const url = new URL(value);
  const octets = url.hostname.split('.').map(Number);
  const privateNetwork = octets.length === 4 &&
    octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (octets[0] === 10 ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31));
  if (
    url.protocol !== 'http:' || url.port !== '55321' ||
    (!['localhost', '127.0.0.1'].includes(url.hostname) && !privateNetwork) ||
    url.username || url.password || url.pathname !== '/' || url.search || url.hash
  ) {
    throw new Error('La demo requiere Supabase local en el puerto 55321.');
  }
}
