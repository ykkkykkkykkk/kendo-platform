const BASE      = '/api/admin';
const TOKEN_KEY = 'kendo_admin_token';

const headers = () => ({
  'Content-Type':  'application/json',
  'x-admin-token': localStorage.getItem(TOKEN_KEY) ?? '',
});

const req = (method, path, body) =>
  fetch(BASE + path, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

export const adminGet    = (path)       => req('GET',    path).then((r) => r.json());
export const adminPost   = (path, body) => req('POST',   path, body);
export const adminPut    = (path, body) => req('PUT',    path, body);
export const adminDelete = (path)       => req('DELETE', path);
