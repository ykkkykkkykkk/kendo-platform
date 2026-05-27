const isProd = () => process.env.NODE_ENV === 'production';

export function serverError(res, e, label = '') {
  console.error(`[ServerError${label ? ' ' + label : ''}]`, e.message);
  res.status(500).json({
    error: isProd() ? 'Internal Server Error' : e.message,
  });
}
