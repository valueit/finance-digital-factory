export const XRAY_TEST_MAPPING: Record<string, string> = {
  'tests/ui/create-and-submit-financing-request.spec.ts':
    process.env.XRAY_TEST_KEY_UI || 'FDF-TEST-UI',
  'tests/api/reject-request-without-amount.spec.ts':
    process.env.XRAY_TEST_KEY_API || 'FDF-TEST-API',
};

export function resolveXrayTestKey(filePath: string): string | undefined {
  const normalized = filePath.replace(/\\/g, '/');
  for (const [pattern, key] of Object.entries(XRAY_TEST_MAPPING)) {
    if (normalized.endsWith(pattern) || normalized.includes(pattern)) {
      return key;
    }
  }
  return undefined;
}
