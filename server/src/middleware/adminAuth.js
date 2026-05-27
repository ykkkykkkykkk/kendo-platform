export function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN)
    return res.status(401).json({ error: '관리자 권한이 없습니다.' });
  next();
}
