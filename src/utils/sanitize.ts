export function sanitize(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    const dataRecord = data as Record<string, unknown>;
    delete dataRecord['_id'];
    delete dataRecord['access_token'];
    return dataRecord
  }
}