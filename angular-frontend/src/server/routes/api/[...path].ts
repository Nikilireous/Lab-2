import { defineEventHandler, getRequestURL, proxyRequest } from 'h3';
import { apiUrl } from '../../api-url';

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const target = `${apiUrl()}${url.pathname}${url.search}`;
  if (event.method !== 'QUERY') return proxyRequest(event, target);

  const chunks: Buffer[] = [];
  for await (const chunk of event.node.req) chunks.push(Buffer.from(chunk));
  return proxyRequest(event, target, { fetchOptions: { body: Buffer.concat(chunks) } });
});
