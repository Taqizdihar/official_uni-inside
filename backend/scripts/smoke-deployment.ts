export {};

const apiBase = process.env.DEPLOY_API_URL?.replace(/\/+$/, '');
const frontendBase = process.env.DEPLOY_FRONTEND_URL?.replace(/\/+$/, '');
const allowedOrigin = process.env.DEPLOY_ALLOWED_ORIGIN;

if (!apiBase || !frontendBase || !allowedOrigin) {
  console.error('Set DEPLOY_API_URL, DEPLOY_FRONTEND_URL, and DEPLOY_ALLOWED_ORIGIN before running the deployment smoke check.');
  process.exit(2);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function hasSensitiveMaterial(value: string) {
  return /-----BEGIN (?:CERTIFICATE|.*PRIVATE KEY)-----|(?:DB_PASSWORD|CLOUDINARY_API_SECRET|AUTH_TOKEN_PEPPER|ANALYTICS_HASH_PEPPER)\s*[:=]|"(?:password|token|secret|privateKey|dbHost|dbUser)"\s*:/i.test(value);
}

async function check(name: string, run: () => Promise<void>) {
  await run();
  console.info(`PASS ${name}`);
}

async function main() {
  await check('API liveness', async () => {
    const response = await fetch(`${apiBase}/health`);
    assert(response.ok, `health returned HTTP ${response.status}`);
    assert(response.headers.get('cache-control')?.includes('no-store'), 'health is cacheable');
    assert(!hasSensitiveMaterial(await response.text()), 'health response contains sensitive material');
  });
  await check('API readiness', async () => {
    const response = await fetch(`${apiBase}/ready`);
    assert(response.ok, `ready returned HTTP ${response.status}`);
    assert(response.headers.get('cache-control')?.includes('no-store'), 'readiness is cacheable');
    assert(!hasSensitiveMaterial(await response.text()), 'readiness response contains sensitive material');
  });
  await check('public API envelope', async () => {
    const response = await fetch(`${apiBase}/site`);
    assert(response.ok, `site returned HTTP ${response.status}`);
    const body = await response.text();
    assert(!hasSensitiveMaterial(body), 'public API response contains sensitive material');
    const envelope = JSON.parse(body) as { data?: unknown };
    assert(Object.hasOwn(envelope, 'data'), 'site response is not a data envelope');
  });
  await check('allowed-origin credentialed CORS preflight', async () => {
    const response = await fetch(`${apiBase}/auth/me`, { method: 'OPTIONS', headers: {
      Origin: allowedOrigin!, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token',
    } });
    assert(response.status === 204, `preflight returned HTTP ${response.status}`);
    assert(response.headers.get('access-control-allow-origin') === allowedOrigin, 'preflight did not echo the exact allowed origin');
    assert(response.headers.get('access-control-allow-credentials') === 'true', 'preflight omitted credential permission');
    assert(response.headers.get('vary')?.split(',').map(value => value.trim().toLowerCase()).includes('origin'), 'preflight omitted Vary: Origin');
    assert(response.headers.get('access-control-allow-methods')?.split(',').map(value => value.trim()).includes('POST'), 'preflight omitted POST');
    const headers = response.headers.get('access-control-allow-headers')?.toLowerCase() ?? '';
    assert(headers.includes('content-type') && headers.includes('x-csrf-token'), 'preflight omitted required request headers');
  });
  await check('disallowed-origin rejection', async () => {
    const response = await fetch(`${apiBase}/auth/login`, { method: 'POST', headers: {
      Origin: 'https://disallowed-smoke.invalid', 'Content-Type': 'application/json',
    }, body: '{}' });
    assert(response.status === 403, `disallowed origin returned HTTP ${response.status}`);
    assert(!response.headers.has('access-control-allow-origin'), 'disallowed origin received CORS access');
    assert(!hasSensitiveMaterial(await response.text()), 'origin rejection contains sensitive material');
  });
  for (const route of ['', '/admin/login']) await check(`frontend ${route || 'root'} route`, async () => {
    const response = await fetch(`${frontendBase}${route}`, { redirect: 'follow' });
    assert(response.ok, `${route || 'root'} returned HTTP ${response.status}`);
    assert(response.headers.get('content-type')?.includes('text/html'), `${route || 'root'} did not resolve to HTML`);
    assert(!hasSensitiveMaterial(await response.text()), 'frontend response contains obvious sensitive material');
  });
  console.info('Deployment smoke checks passed. No administrator login was attempted.');
}

main().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown smoke-check failure';
  console.error(`FAIL deployment smoke check: ${message.replace(/https?:\/\/[^\s)]+/g, '[URL]')}`);
  process.exitCode = 1;
});
