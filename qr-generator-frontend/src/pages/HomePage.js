import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';

// COMPONENTS & ASSETS
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';

// ICONS
import {
    Download, Play, Settings, Database, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
    Folder, Package, Link as LinkIcon, Type, Box
} from 'react-feather';
import './HomePage.css';

const QR_LOGO = logoImg;

// --- HÀM HỖ TRỢ ---
const generateRandom = (length) => {
    let result = ''; const chars = '0123456789';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
};

const calculateEan13Checksum = (code12) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(code12[i]);
        sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const remainder = sum % 10;
    return (10 - remainder) % 10;
};

const sanitizeFilename = (name) => {
    if (!name) return 'File';
    return name.replace(/[^a-z0-9\u00a0-\uffff\s-]/gi, '_').trim();
};

const getCurrentDateTime = () => {
    const now = new Date();
    return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}`;
};

const HomePage = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    // --- STATE DỮ LIỆU ---
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('new');
    const [qrType, setQrType] = useState('EAN');

    const [formData, setFormData] = useState({
        prefix: '893',
        manufacturerCode: '',
        productCode: '0001',
        content: '',
        quantity: 1,
        programName: '',
        description: ''
    });

    const [isManualDN, setIsManualDN] = useState(true);
    const [isManualSP, setIsManualSP] = useState(true);
    const [showName, setShowName] = useState(true);
    const [showDescription, setShowDescription] = useState(false);

    const [results, setResults] = useState([]);
    const [isSaved, setIsSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [message, setMessage] = useState('');

    // Load Batch
    useEffect(() => {
        const loadBatches = async () => {
            try {
                const res = await api.get('/qrs/batches');
                setBatches(res.data);
                const urlBatchId = searchParams.get('batchId');
                if (urlBatchId) handleBatchChange(urlBatchId, res.data);
            } catch (e) { console.error(e); }
        };
        loadBatches();
    }, [searchParams]);

    const handleBatchChange = (val, batchList = batches) => {
        const batchId = val === 'new' ? 'new' : Number(val);
        setSelectedBatchId(batchId);
        if (batchId !== 'new') {
            const found = batchList.find(b => b.id === batchId);
            if (found) {
                setFormData(prev => ({ ...prev, programName: found.batch_name }));
                if (qrType === 'EAN') {
                    const nextCount = parseInt(found.qr_count) + 1;
                    setFormData(prev => ({ ...prev, productCode: nextCount.toString().padStart(4, '0') }));
                    setIsManualSP(true);
                }
            }
        } else {
            setFormData(prev => ({ ...prev, productCode: '0001', programName: '' }));
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();
        setLoading(true); setMessage(''); setResults([]); setIsSaved(false);

        if (qrType === 'EAN') {
            if (!formData.prefix || formData.prefix.length !== 3) { setLoading(false); return alert("Mã quốc gia (Prefix) phải 3 số."); }
            if (isManualDN && (!formData.manufacturerCode || formData.manufacturerCode.length !== 5)) { setLoading(false); return alert("Mã Doanh Nghiệp phải 5 số."); }
            if (isManualSP && (!formData.productCode || formData.productCode.length !== 4)) { setLoading(false); return alert("Mã Sản Phẩm phải 4 số."); }
        } else {
            if (!formData.content) { setLoading(false); return alert("Vui lòng nhập nội dung."); }
        }

        const qty = parseInt(formData.quantity) || 1;
        const startSpCode = isManualSP ? parseInt(formData.productCode) : 0;
        const tempResults = [];

        let defaultName = `Nhóm mã ${new Date().toLocaleDateString('vi-VN')}`;
        if (qrType === 'LINK') defaultName = 'Link Công khai';
        if (qrType === 'TEXT') defaultName = 'Văn bản';

        const batchNameDisplay = showName && formData.programName ? formData.programName : defaultName;

        setTimeout(() => {
            try {
                for (let i = 0; i < qty; i++) {
                    let fullCode = '';
                    if (qrType === 'EAN') {
                        let currentDN = isManualDN ? formData.manufacturerCode : generateRandom(5);
                        let currentSP = isManualSP ? (startSpCode + i).toString().padStart(4, '0') : generateRandom(4);
                        const rawString = `${formData.prefix}${currentDN}${currentSP}`;
                        const checksum = calculateEan13Checksum(rawString);
                        fullCode = `${rawString}${checksum}`;
                    } else {
                        fullCode = formData.content;
                    }

                    const currentItemName = (qty > 1 && qrType === 'EAN') ? `${batchNameDisplay} #${i + 1}` : batchNameDisplay;

                    tempResults.push({
                        program_name: currentItemName,
                        description: showDescription ? formData.description : '',
                        custom_code: fullCode,
                        qr_type: qrType
                    });
                }
                setResults(tempResults);
                setMessage(`✨ Đã tạo ${tempResults.length} mã xem trước.`);
            } catch (error) { setMessage('❌ Có lỗi khi tạo mã.'); }
            finally { setLoading(false); }
        }, 300);
    };

    const handleSaveToDB = async () => {
        if (results.length === 0) return;
        setLoading(true);
        try {
            await api.post('/qrs/save-batch', {
                codes: results,
                batchId: selectedBatchId === 'new' ? null : selectedBatchId,
                batchName: selectedBatchId === 'new' ? formData.programName || `Bộ sưu tập ${qrType}` : null
            });
            setIsSaved(true);
            setMessage('✅ Đã lưu thành công!');
            const res = await api.get('/qrs/batches');
            setBatches(res.data);
            if (selectedBatchId === 'new') setSelectedBatchId('new');
        } catch (error) {
            setMessage(`❌ Lỗi lưu: ${error.response?.data?.error || 'Server Error'}`);
        } finally { setLoading(false); }
    };

    const handleExportExcel = async () => {
        if (results.length === 0) return;
        setIsExporting(true);
        try {
            const response = await api.post('/qrs/export-excel', { codes: results }, { responseType: 'blob' });
            const rawName = formData.programName || `QR_${qrType}`;
            const fileName = `${sanitizeFilename(rawName)}_${getCurrentDateTime()}_SL${results.length}.xlsx`;
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) { alert("Lỗi xuất file."); }
        finally { setIsExporting(false); }
    };

    return (
        <div className="home-container">
            <div className="welcome-card">
                <div className="welcome-text">
                    <h1>Xin chào, {user?.display_name}! 👋</h1>
                    <p>Không gian sáng tạo mã QR & Định danh sản phẩm</p>
                </div>
                <div className="welcome-avatar"><img src={user?.profile_picture || 'https://via.placeholder.com/80'} alt="Avatar" /></div>
            </div>

            <div className="generator-card">
                <div className="gen-content">
                    {/* CỘT TRÁI: THIẾT LẬP */}
                    <div className="form-section">
                        <h2 className="section-title"><Settings size={20} /> Thiết lập thông tin</h2>

                        {/* Tabs */}
                        <div className="qr-type-tabs">
                            <button className={`type-tab ${qrType === 'EAN' ? 'active' : ''}`} onClick={() => { setQrType('EAN'); setResults([]); setIsSaved(false); }}><Package size={18} /> Mã SP (EAN-13)</button>
                            <button className={`type-tab ${qrType === 'LINK' ? 'active' : ''}`} onClick={() => { setQrType('LINK'); setResults([]); setIsSaved(false); }}><LinkIcon size={18} /> Đường dẫn (Link)</button>
                            <button className={`type-tab ${qrType === 'TEXT' ? 'active' : ''}`} onClick={() => { setQrType('TEXT'); setResults([]); setIsSaved(false); }}><Type size={18} /> Văn bản (Text)</button>
                        </div>

                        {/* Chọn Bộ sưu tập */}
                        {/* <div className="batch-selection-box">
                            <div className="batch-label"><Folder size={18}/> Lưu vào Bộ sưu tập</div>
                            <select value={selectedBatchId} onChange={(e) => handleBatchChange(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #ccc'}}>
                                <option value="new">➕ Tạo Bộ sưu tập Mới</option>
                                {batches.map(b => (<option key={b.id} value={b.id}>📂 {b.batch_name} ({b.qr_count} mã)</option>))}
                            </select>
                            {selectedBatchId !== 'new' && (<small style={{display:'block', marginTop:'8px', color:'#d97706'}}>👉 Hệ thống sẽ đếm tiếp từ: <b>{formData.productCode}</b></small>)}
                        </div> */}

                        <form onSubmit={handleCreate}>
                            {qrType === 'EAN' && (
                                <div className="ean-structure-box">
                                    <label className="structure-label">Cấu trúc EAN-13</label>

                                    <div className="form-row-3">
                                        {/* Cột 1: Prefix */}
                                        <div className="form-group col-prefix">
                                            {/* Label tĩnh để đồng bộ chiều cao */}
                                            <div className="label-mini">
                                                <span className="mini-label">Mã QG</span>
                                            </div>
                                            <input type="text" maxLength={3} className="input-highlight" value={formData.prefix} onChange={e => setFormData({ ...formData, prefix: e.target.value })} placeholder="893" />
                                        </div>

                                        {/* Cột 2: Mã DN */}
                                        <div className="form-group col-dn">
                                            <div className="label-mini">
                                                <span className="mini-label">Mã DN</span> {/* Ghi tắt */}

                                                <label className="switch-label" title={isManualDN ? "Đang bật: Tự nhập" : "Đang tắt: Ngẫu nhiên"}>
                                                    <input
                                                        type="checkbox"
                                                        className="switch-input"
                                                        checked={isManualDN}
                                                        onChange={() => setIsManualDN(!isManualDN)}
                                                    />
                                                    <span className="switch-slider"></span>
                                                </label>
                                            </div>
                                            <input type="text" maxLength={5} value={isManualDN ? formData.manufacturerCode : ''} onChange={e => setFormData({ ...formData, manufacturerCode: e.target.value })} disabled={!isManualDN} className={!isManualDN ? 'disabled-input' : ''} placeholder={!isManualDN ? 'Ngẫu nhiên...' : '12345'} />
                                        </div>

                                        {/* Cột 3: Mã SP */}
                                        <div className="form-group col-sp">
                                            <div className="label-mini">
                                                <span className="mini-label">Mã SP</span> {/* Ghi tắt */}

                                                <label className="switch-label" title={isManualSP ? "Đang bật: Tự nhập" : "Đang tắt: Ngẫu nhiên"}>
                                                    <input
                                                        type="checkbox"
                                                        className="switch-input"
                                                        checked={isManualSP}
                                                        onChange={() => setIsManualSP(!isManualSP)}
                                                    />
                                                    <span className="switch-slider"></span>
                                                </label>
                                            </div>
                                            <input type="text" maxLength={4} value={isManualSP ? formData.productCode : ''} onChange={e => setFormData({ ...formData, productCode: e.target.value })} disabled={!isManualSP} className={!isManualSP ? 'disabled-input' : ''} placeholder={!isManualSP ? 'Ngẫu nhiên...' : '0001'} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {qrType !== 'EAN' && (
                                <div className="form-group">
                                    <label>{qrType === 'LINK' ? 'Đường dẫn Website (URL)' : 'Nội dung Văn bản'}</label>
                                    {qrType === 'LINK' ? <input type="url" className="w-full p-3 border rounded-lg" placeholder="https://trungnguyenlegend.com" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required /> : <textarea className="w-full p-3 border rounded-lg" rows="3" placeholder="Nhập nội dung..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required />}
                                </div>
                            )}

                            <div className="expandable-section">
                                <div className="expand-header" onClick={() => setShowName(!showName)}><div className="expand-title">{showName ? <ToggleRight color="#d97706" /> : <ToggleLeft color="#ccc" />}<span>Tên hiển thị</span></div>{showName ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                {showName && <div className="expand-content fade-in"><input type="text" className="w-full p-3 border rounded-lg" placeholder={qrType === 'EAN' ? "Ví dụ: Cà phê G7" : "Tên gợi nhớ..."} value={formData.programName} onChange={e => setFormData({ ...formData, programName: e.target.value })} /></div>}
                                <div className="expand-header" onClick={() => setShowDescription(!showDescription)} style={{ marginTop: '10px' }}><div className="expand-title">{showDescription ? <ToggleRight color="#d97706" /> : <ToggleLeft color="#ccc" />}<span>Ghi chú thêm</span></div>{showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                                {showDescription && <div className="expand-content fade-in"><textarea className="w-full p-3 border rounded-lg" rows="2" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>}
                            </div>

                            <div className="form-group mt-20"><label>Số lượng (Bản sao)</label><div className="quantity-control"><input type="number" min="1" max="100" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} /><span className="hint">{qrType === 'EAN' ? 'mã (tự tăng)' : 'bản'}</span></div></div>
                            {message && <p className={`status-msg ${message.includes('✅') ? 'success' : 'error'}`}>{message}</p>}
                            <button type="submit" className="submit-btn" disabled={loading}>{loading ? 'Đang xử lý...' : <><Play size={18} /> Xem trước mẫu</>}</button>
                        </form>
                    </div>

                    {/* CỘT PHẢI: KẾT QUẢ */}
                    <div className="preview-section">
                        <div className="preview-header">
                            <h3><Box size={20} style={{ marginRight: 5 }} /> Kết quả ({results.length})</h3>
                            <div className="action-group" style={{ display: 'flex', gap: '10px' }}>
                                {results.length > 0 && (<><button onClick={handleExportExcel} className="excel-btn" disabled={isExporting}><Download size={18} /> Tải Excel</button><button onClick={handleSaveToDB} className="save-db-btn" disabled={isSaved || loading}><Database size={18} /> {isSaved ? 'Đã Lưu' : 'Lưu ngay'}</button></>)}
                            </div>
                        </div>
                        <div className="results-container">
                            {results.length === 0 ? <div className="empty-placeholder"><p>Vui lòng nhập thông tin bên trái để tạo mã</p></div> : (
                                <div className="qr-list">
                                    {results.map((qr, idx) => {
                                        const isAutoName = qr.program_name.startsWith('Tệp QR') || qr.program_name.startsWith('Link') || qr.program_name.startsWith('Văn bản') || qr.program_name.startsWith('Nhóm mã');
                                        return (
                                            <div key={idx} className="qr-item">
                                                {!isAutoName && <div className="qr-program-title" title={qr.program_name}>{qr.program_name}</div>}
                                                {qr.description && <div className="qr-program-desc" title={qr.description}>{qr.description}</div>}
                                                <div style={{ marginTop: '5px', marginBottom: '5px' }}>
                                                    <QRCodeSVG value={qr.custom_code} size={140} level="H" imageSettings={{ src: QR_LOGO, height: 34, width: 34, excavate: true }} />
                                                </div>
                                                <div className="qr-number-display">{qr.custom_code}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;