import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Download, Play, Save, Database, Type, Globe, Folder } from 'react-feather'; // ✅ Đã thêm Folder
import api from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';

const QR_LOGO = logoImg;

const LinkPage = () => {
    const { user } = useAuth();

    // --- STATE MỚI CHO BATCHES ---
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('new');

    // --- STATE KHÁC ---
    const [url, setUrl] = useState('');
    const [programName, setProgramName] = useState('Link công khai');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [message, setMessage] = useState('');

    // ✅ Load danh sách Tệp QR khi component được mount
    useEffect(() => {
        const loadBatches = async () => {
            try {
                const res = await api.get('/qrs/batches');
                setBatches(res.data);
            } catch (e) { console.error("Lỗi tải batches:", e); }
        };
        loadBatches();
    }, []);

    // --- HÀM TẠO QR (PREVIEW) ---
    const handlePreview = (e) => {
        e.preventDefault();
        if (!url) { setMessage('❌ Vui lòng nhập đường dẫn URL.'); return; }
        setLoading(true); setIsSaved(false); setMessage('');

        const nameToSend = programName || `Tệp QR Link ${new Date().toLocaleDateString()}`;

        const newQrCode = {
            program_name: nameToSend,
            custom_code: url,
            description: `Link tạo ngày ${new Date().toLocaleDateString()}`,
            qr_type: 'LINK' // ✅ Explicit Type
        };

        setResults([newQrCode]);
        setMessage('✨ Đã tạo mã xem trước.');
        setLoading(false);
    };

    // --- LƯU VÀO DATABASE (Gửi batchId) ---
    const handleSaveToDB = async () => {
        if (results.length === 0 || isSaved) return;
        setLoading(true);
        try {
            await api.post('/qrs/save-batch', {
                codes: results,
                // Gửi ID Tệp QR (hoặc null nếu là tạo mới)
                batchId: selectedBatchId === 'new' ? null : selectedBatchId,
                // Dùng tên chương trình làm tên Tệp QR mới
                batchName: selectedBatchId === 'new' ? programName || `Tệp QR Mới` : null
            });

            setIsSaved(true);
            setMessage('✅ Đã lưu Link này vào Database!');
            // Cập nhật lại danh sách Tệp QR
            const res = await api.get('/qrs/batches');
            setBatches(res.data);
        } catch (error) {
            setMessage(`❌ Lỗi lưu: ${error.response?.data?.error || 'Server Error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => { /* Code Export Excel giữ nguyên */ };

    return (
        <div className="home-container">
            <div className="generator-card">
                <div className="gen-content" style={{ display: 'block' }}>
                    <h2 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}><Globe size={20} /> Tạo Mã QR từ Đường Dẫn</h2>

                    <div className="vcard-layout" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>

                        {/* CỘT TRÁI: FORM */}
                        <div className="vcard-form form-container" style={{ flex: 1, minWidth: '350px' }}>
                            {/* <div className="batch-selection-box" style={{ background: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c0e0ff' }}>
                                <label style={{ fontWeight: 'bold', color: '#0056b3', display: 'flex', gap: '5px', marginBottom: '10px' }}><Folder size={18} /> Chọn Tệp QR (Lưu trữ)</label>
                                <select 
                                    value={selectedBatchId} 
                                    onChange={(e) => setSelectedBatchId(e.target.value)} 
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #b3d9ff', fontWeight: '500' }}>
                                    <option value="new">➕ Tạo Tệp QR Mới (Tự động đặt tên)</option>
                                    {batches.map(b => (<option key={b.id} value={b.id}>📂 {b.batch_name} ({b.qr_count} mã)</option>))}
                                </select>
                            </div> */}

                            <form onSubmit={handlePreview}>
                                <div className="form-group">
                                    <label>Đường dẫn URL (*)</label>
                                    <input type="url" placeholder="https://example.com/sanpham" value={url} onChange={(e) => setUrl(e.target.value)} required />
                                </div>
                                <br />
                                {/* <div className="form-group">
                                    <label>Tên Chương Trình / Ghi chú</label>
                                    <input type="text" placeholder="Ví dụ: Link trang chủ công ty" value={programName} onChange={(e) => setProgramName(e.target.value)} required />
                                </div> */}

                                {message && <p className={`status-msg ${message.includes('✅') ? 'success' : 'error'}`}>{message}</p>}

                                <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Đang tạo...' : <><Play size={18} /> Xem Trước</>}</button>
                            </form>
                        </div>

                        {/* CỘT PHẢI: PREVIEW */}
                        <div className="preview-section" style={{ flex: 1, minWidth: '300px' }}>
                            <div className="preview-header">
                                <h3>Kết quả</h3>
                                <div className="action-group">
                                    {results.length > 0 && (<><button onClick={handleExportExcel} className="excel-btn" disabled={loading}><Download size={18} /> Excel</button><button onClick={handleSaveToDB} className="save-db-btn" disabled={isSaved || loading}><Database size={18} /> {isSaved ? 'Đã Lưu' : 'Lưu DB'}</button></>)}
                                </div>
                            </div>

                            <div className="qr-preview-box" style={{ textAlign: 'center', background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                                {results.length > 0 ? (
                                    <>
                                        <QRCodeSVG value={results[0].custom_code} size={200} level="H" imageSettings={{ src: QR_LOGO, height: 40, width: 40, excavate: true }} />
                                        <p style={{ wordBreak: 'break-all', marginTop: '15px', fontSize: '0.9rem' }}>
                                            Mã: <strong>{results[0].program_name}</strong>
                                        </p>
                                    </>
                                ) : (
                                    <div className="empty-placeholder" style={{ height: '250px' }}><p>Mã QR sẽ hiện ở đây</p></div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinkPage;