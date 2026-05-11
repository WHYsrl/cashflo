const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
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
};
