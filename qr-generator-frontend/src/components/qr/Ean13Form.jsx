import React, { useState } from 'react';
import { qrService } from '../../services/qrService'; // Import service vừa tạo

const Ean13Form = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    manufacturerCode: '', // 5 số
    productCode: '',      // 4 số
    programName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Gọi API thông qua Service (Code cực gọn)
      const res = await qrService.createEan13(formData);
      onSuccess(res.data); // Truyền dữ liệu lên cha để hiển thị
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow bg-white">
      <h3 className="text-lg font-bold mb-4">Tạo mã EAN-13</h3>
      {error && <p className="text-red-500 mb-2">{error}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label>Tên chương trình</label>
          <input 
            type="text" 
            className="border p-2 w-full"
            value={formData.programName}
            onChange={e => setFormData({...formData, programName: e.target.value})}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label>Mã DN (5 số)</label>
            <input 
              type="text" 
              maxLength={5}
              className="border p-2 w-full"
              value={formData.manufacturerCode}
              onChange={e => setFormData({...formData, manufacturerCode: e.target.value})}
              placeholder="VD: 893..."
            />
          </div>
          <div className="flex-1">
            <label>Mã SP (4 số)</label>
            <input 
              type="text" 
              maxLength={4}
              className="border p-2 w-full"
              value={formData.productCode}
              onChange={e => setFormData({...formData, productCode: e.target.value})}
              placeholder="VD: 0001"
            />
          </div>
        </div>

        <button 
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
        >
          {loading ? 'Đang tạo...' : 'Tạo Mã QR'}
        </button>
      </form>
    </div>
  );
};

export default Ean13Form;