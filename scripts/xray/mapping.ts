import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatedPath = path.resolve(__dirname, '../../generated/xray-test-mapping.json');

type GeneratedMapping = Record<string, { key?: string; stableId?: string }>;

function loadGeneratedMapping(): GeneratedMapping {
  try {
    if (fs.existsSync(generatedPath)) {
      return JSON.parse(fs.readFileSync(generatedPath, 'utf8')) as GeneratedMapping;
    }
  } catch {
    /* ignore */
  }
  return {};
}

const generated = loadGeneratedMapping();

export const XRAY_TEST_MAPPING: Record<string, string> = {
  'tests/ui/create-and-submit-financing-request.spec.ts':
    process.env.XRAY_TEST_KEY_UI ||
    generated['tests/ui/create-and-submit-financing-request.spec.ts']?.key ||
    'FDF-29',
  'tests/api/reject-request-without-amount.spec.ts':
    process.env.XRAY_TEST_KEY_API ||
    generated['tests/api/reject-request-without-amount.spec.ts']?.key ||
    'FDF-30',
};

export function resolveXrayTestKey(filePath: string): string | undefined {
  const normalized = filePath.replace(/\\/g, '/');
  for (const [pattern, key] of Object.entries(XRAY_TEST_MAPPING)) {
    if (normalized.endsWith(pattern) || normalized.includes(pattern)) {
      return key;
    }
    // Match bare relative paths like "api/foo.spec.ts" or "foo.spec.ts"
    const bare = pattern.replace(/^tests\//, '');
    if (normalized.endsWith(bare) || normalized.endsWith(bare.split('/').pop() || '')) {
      return key;
    }
  }
  return undefined;
}
