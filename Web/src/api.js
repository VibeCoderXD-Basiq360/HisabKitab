// The only place the app calls fetch. Requests go to the same site, so the
// session cookie is sent without being handled here.
export async function api(method, path, body) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // A reply that is not JSON (e.g. the backend is down) must still become a
  // readable error, not a parsing crash.
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error ?? 'Something went wrong');
    error.status = response.status;
    throw error;
  }
  return payload;
}
