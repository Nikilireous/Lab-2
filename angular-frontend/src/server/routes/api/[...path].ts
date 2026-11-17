import { defineEventHandler, getRequestURL, proxyRequest } from 'h3';

// Same-origin browser requests go to the existing Java API.
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const backend = process.env['API_URL'] || 'http://127.0.0.1:8000';
  return proxyRequest(event, `${backend}${url.pathname}${url.search}`);
});
