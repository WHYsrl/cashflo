const BASE = '/api';

async function request(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;
  const res = await fetch(`${BASE}${path}`, {
    ...restOptions,
    headers: { 'Content-Type': 'application/json', ...customHeaders }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Errore di rete');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Suppliers
  getSuppliers: () => request('/suppliers'),
  getSupplier: (id) => request(`/suppliers/${id}`),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  addCost: (supplierId, data) => request(`/suppliers/${supplierId}/costs`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCost: (supplierId, costId) => request(`/suppliers/${supplierId}/costs/${costId}`, { method: 'DELETE' }),

  // Extra Costs
  addExtraCost: (supplierId, data) => request(`/suppliers/${supplierId}/extra-costs`, { method: 'POST', body: JSON.stringify(data) }),
  updateExtraCost: (supplierId, extraId, data) => request(`/suppliers/${supplierId}/extra-costs/${extraId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExtraCost: (supplierId, extraId) => request(`/suppliers/${supplierId}/extra-costs/${extraId}`, { method: 'DELETE' }),

  // Payments
  getPayments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/payments${qs ? '?' + qs : ''}`);
  },
  createPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id, data) => request(`/payments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
  generateWhatsApp: (paymentIds) => request('/payments/whatsapp', { method: 'POST', body: JSON.stringify({ paymentIds }) }),

  // Documents
  getDocuments: () => request('/documents'),
  uploadDocument: (formData) => fetch(`${BASE}/documents/upload`, { method: 'POST', body: formData }).then(r => r.json()),
  updateDocument: (id, data) => request(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // AI
  parseDocument: (formData) => fetch(`${BASE}/ai/parse-document`, { method: 'POST', body: formData }).then(r => r.json()),
  parseText: (text, model) => request('/ai/parse-text', { method: 'POST', body: JSON.stringify({ text, model }) }),

  // Guests (auth required)
  guestAuth: (password) => request('/guests/auth', { method: 'POST', body: JSON.stringify({ password }) }),
  getGuests: (token) => request('/guests', { headers: { 'x-guest-auth': token } }),
  getGuest: (id, token) => request(`/guests/${id}`, { headers: { 'x-guest-auth': token } }),
  createGuest: (data, token) => request('/guests', { method: 'POST', body: JSON.stringify(data), headers: { 'x-guest-auth': token } }),
  updateGuest: (id, data, token) => request(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'x-guest-auth': token } }),
  deleteGuest: (id, token) => request(`/guests/${id}`, { method: 'DELETE', headers: { 'x-guest-auth': token } }),
  addCompanion: (guestId, data, token) => request(`/guests/${guestId}/companions`, { method: 'POST', body: JSON.stringify(data), headers: { 'x-guest-auth': token } }),
  deleteCompanion: (guestId, compId, token) => request(`/guests/${guestId}/companions/${compId}`, { method: 'DELETE', headers: { 'x-guest-auth': token } }),
  addFlight: (guestId, data, token) => request(`/guests/${guestId}/flights`, { method: 'POST', body: JSON.stringify(data), headers: { 'x-guest-auth': token } }),
  deleteFlight: (guestId, flightId, token) => request(`/guests/${guestId}/flights/${flightId}`, { method: 'DELETE', headers: { 'x-guest-auth': token } }),
  importGuestsUpload: (formData, token) => fetch(`${BASE}/guests/import/upload`, { method: 'POST', body: formData, headers: { 'x-guest-auth': token } }).then(r => r.json()),
  importGuestsConfirm: (importId, guests, token) => request(`/guests/import/${importId}/confirm`, { method: 'POST', body: JSON.stringify({ guests }), headers: { 'x-guest-auth': token } }),
  generateMeetGreetEmail: (guestIds, language, token) => request('/guests/email/meet-greet', { method: 'POST', body: JSON.stringify({ guestIds, language }), headers: { 'x-guest-auth': token } }),
  generateTransportEmail: (guestIds, language, direction, token) => request('/guests/email/transportation', { method: 'POST', body: JSON.stringify({ guestIds, language, direction }), headers: { 'x-guest-auth': token } }),
  generateRestaurantEmail: (guestIds, language, token) => request('/guests/email/restaurant', { method: 'POST', body: JSON.stringify({ guestIds, language }), headers: { 'x-guest-auth': token } }),
  generateHotelEmail: (guestIds, language, token) => request('/guests/email/hotel', { method: 'POST', body: JSON.stringify({ guestIds, language }), headers: { 'x-guest-auth': token } }),
  translateGuestFields: (token) => request('/guests/translate-fields', { method: 'POST', body: '{}', headers: { 'x-guest-auth': token } }),
  getGuestInsights: (language, token) => request('/guests/insights', { method: 'POST', body: JSON.stringify({ language }), headers: { 'x-guest-auth': token } }),
  checkFlights: (language, token) => request('/guests/flight-check', { method: 'POST', body: JSON.stringify({ language }), headers: { 'x-guest-auth': token } }),
  exportGuestsUrl: (token) => `${BASE}/guests/export?token=${encodeURIComponent(token)}`,
  exportTransportUrl: (token) => `${BASE}/guests/export-transport?token=${encodeURIComponent(token)}`,
  exportMeetGreetUrl: (token) => `${BASE}/guests/export-meet-greet?token=${encodeURIComponent(token)}`,
  bulkUpdateGuests: (formData, token) => fetch(`${BASE}/guests/import/bulk-update`, { method: 'POST', body: formData, headers: { 'x-guest-auth': token } }).then(r => r.json()),
};
