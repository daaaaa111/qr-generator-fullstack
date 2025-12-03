import api from './api';

export const qrService = {
  // Gọi API tạo EAN-13 mà chúng ta vừa viết ở Backend
  createEan13: (data) => {
    return api.post('/qrs/create-ean13', data);
  },

  getAll: () => {
    return api.get('/qrs');
  },

  exportExcel: (ids) => {
    return api.post('/qrs/export', { ids }, { responseType: 'blob' });
  }
};