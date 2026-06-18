export async function hashPin(pin) {
  const buf = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkPin(pin, storedHash) {
  const h = await hashPin(pin);
  return h === storedHash;
}
