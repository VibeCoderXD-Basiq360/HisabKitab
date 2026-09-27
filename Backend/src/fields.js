const ID_PATTERN = /^\d{1,18}$/;

export function isId(value) {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

// A misspelt field ("color" for "colour") would otherwise be ignored, and the
// request would appear to succeed while changing nothing.
export function unknownFieldError(body, allowedFields) {
  const unknown = Object.keys(body).find((field) => !allowedFields.includes(field));
  if (unknown === undefined) return null;
  return { error: `Unknown field "${unknown}". Allowed: ${allowedFields.join(', ')}` };
}
