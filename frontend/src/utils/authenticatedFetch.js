import axios from 'axios';

const wrapResponse = (response) => ({
  ok: response.status >= 200 && response.status < 300,
  status: response.status,
  headers: response.headers,
  json: async () => {
    if (response.data instanceof Blob) {
      const text = await response.data.text();
      return text ? JSON.parse(text) : {};
    }
    return response.data;
  },
  blob: async () => response.data instanceof Blob ? response.data : new Blob([response.data]),
});

// Compatibility bridge for older Fetch-based components. Every request still
// uses the shared Axios access-token header and automatic refresh interceptor.
export default async function authenticatedFetch(url, options = {}) {
  const { method = 'GET', headers, body } = options;
  let data = body;
  if (typeof body === 'string' && headers?.['Content-Type']?.includes('application/json')) {
    data = JSON.parse(body);
  }

  try {
    const response = await axios({
      url,
      method,
      headers,
      data,
      responseType: url.includes('/export') ? 'blob' : 'json',
    });
    return wrapResponse(response);
  } catch (error) {
    if (error.response) return wrapResponse(error.response);
    throw error;
  }
}
