const SECRET_QUERY_PARAMS = /([?&](?:secret|token|access_token|api_key|apikey)=)[^&#]*/gi;

/** Removes secret-bearing query params (e.g. webhook `?secret=`) from a URL before logging. */
export const redactUrl = (url) => String(url || '').replace(SECRET_QUERY_PARAMS, '$1[REDACTED]');
