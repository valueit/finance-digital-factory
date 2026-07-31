import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const XRAY_AUTH_URL = 'https://xray.cloud.getxray.app/api/v2/authenticate';

export async function authenticateXray(): Promise<string> {
  const clientId = process.env.XRAY_CLIENT_ID;
  const clientSecret = process.env.XRAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('XRAY_CLIENT_ID and XRAY_CLIENT_SECRET are required');
  }

  const res = await fetch(XRAY_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Xray authentication failed (${res.status}): ${text}`);
  }

  const token = (await res.text()).replace(/^"|"$/g, '');
  return token;
}

async function main(): Promise<void> {
  if (process.env.DRY_RUN === 'true') {
    console.log('[xray:auth] DRY_RUN=true');
    console.log('[xray:auth] Would authenticate against Xray Cloud');
    console.log(`[xray:auth] XRAY_CLIENT_ID set: ${Boolean(process.env.XRAY_CLIENT_ID)}`);
    console.log(
      `[xray:auth] XRAY_CLIENT_SECRET set: ${Boolean(process.env.XRAY_CLIENT_SECRET)}`
    );
    return;
  }

  const token = await authenticateXray();
  console.log('[xray:auth] Authentication successful');
  console.log(`[xray:auth] Token length: ${token.length}`);
}

const isDirectRun = process.argv[1]?.includes('authenticate');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
