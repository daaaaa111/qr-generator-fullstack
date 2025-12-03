import React, { useState } from 'react';
import { X, Save } from 'react-feather';
import api from '../services/api';
import './CreateQrModal.css'; // Tận dụng lại CSS của modal tạo

const EditQrModal = ({ qrData, onClose, onSuccess }) => {
    const [name, setName] = useState(qrData.program_name || '');
    const [desc, setDesc] = useState(qrData.description || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/qrs/${qrData.id}`, {
                programName: name,
                description: desc
            });
            onSuccess();
            onClose();
        } catch (error) {
            alert("Lỗi khi cập nhật.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content qr-modal" style={{height: 'auto'}}>
                <div className="modal-header">
                    <h3>Chỉnh sửa thông tin</h3>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>
                <div className="modal-body" style={{flexDirection:'column'}}>
                    <div className="input-section" style={{width:'100%'}}>
                        <label style={{fontWeight:'bold', marginBottom:5, display:'block'}}>Tên chương trình</label>
                        <input className="m-input full" value={name} onChange={e => setName(e.target.value)} />
                        
                        <label style={{fontWeight:'bold', marginBottom:5, display:'block', marginTop:10}}>Mô tả / Chi tiết</label>
                        <textarea className="m-input full" rows="4" value={desc} onChange={e => setDesc(e.target.value)} />
                        
                        <button className="save-btn" onClick={handleSave} disabled={loading} style={{width:'100%', justifyContent:'center'}}>
                            {loading ? 'Đang lưu...' : <><Save size={16}/> Lưu Thay Đổi</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditQrModal;