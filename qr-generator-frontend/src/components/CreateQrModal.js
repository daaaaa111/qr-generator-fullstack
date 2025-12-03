import React, { useState } from 'react';
import { X, Package, Link as LinkIcon, Type, Play, Save, RefreshCw } from 'react-feather';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import logoImg from '../assets/logo.png'; // Import Logo
import './CreateQrModal.css';

const QR_LOGO = logoImg;

// --- HÀM HỖ TRỢ ---
const generateRandom = (len) => {
    let r = ''; const c = '0123456789';
    for (let i=0; i<len; i++) r += c.charAt(Math.floor(Math.random()*c.length));
    return r;
};
const calculateChecksum = (code) => {
    let s = 0;
    for (let i=0; i<12; i++) s += (i%2===0) ? parseInt(code[i]) : parseInt(code[i])*3;
    return (10 - (s%10)) % 10;
};

const CreateQrModal = ({ batchId, batchName, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('EAN'); 
    const [loading, setLoading] = useState(false);
    
    // State Dữ liệu
    const [quantity, setQuantity] = useState(1);
    const [previewData, setPreviewData] = useState(null);
    const [description, setDescription] = useState('');

    // Form Inputs
    const [eanData, setEanData] = useState({ prefix: '893', dn: '', sp: '', name: '' });
    const [isManual, setIsManual] = useState({ dn: true, sp: true });
    const [content, setContent] = useState(''); 
    const [commonName, setCommonName] = useState('');

    // --- 1. XỬ LÝ TẠO PREVIEW ---
    const handlePreview = (e) => {
        e.preventDefault();
        setPreviewData(null);

        const qty = parseInt(quantity) || 1;
        if (qty > 100) return alert("Tối đa 100 mã/lần.");

        let sampleCode = '';
        let sampleName = '';
        let type = '';

        if (activeTab === 'EAN') {
            if (!eanData.prefix || eanData.prefix.length !== 3) return alert("Prefix phải 3 số");
            const dn = isManual.dn ? eanData.dn : generateRandom(5);
            const sp = isManual.sp ? eanData.sp : generateRandom(4);
            
            if (isManual.dn && dn.length !== 5) return alert("Mã DN phải 5 số");
            if (isManual.sp && sp.length !== 4) return alert("Mã SP phải 4 số");

            const raw = `${eanData.prefix}${dn}${sp}`;
            sampleCode = `${raw}${calculateChecksum(raw)}`;
            sampleName = eanData.name || `SP Mới (${batchName})`;
            type = 'EAN';
        } else {
            if (!content) return alert("Vui lòng nhập nội dung");
            sampleCode = content;
            sampleName = commonName || (activeTab === 'LINK' ? 'Link Mới' : 'Văn bản Mới');
            type = activeTab;
        }

        setPreviewData({
            sampleCode,
            sampleName,
            type,
            quantity: qty,
            description,
            params: { 
                prefix: eanData.prefix,
                dn: isManual.dn ? eanData.dn : null, 
                sp: isManual.sp ? eanData.sp : null,
                rawName: sampleName
            }
        });
    };

    // --- 2. XỬ LÝ LƯU ---
    const handleSave = async () => {
        if (!previewData) return;
        setLoading(true);

        const codesToSave = [];
        const qty = previewData.quantity;
        const { type, params } = previewData;

        try {
            for (let i = 0; i < qty; i++) {
                let finalCode = '';
                let finalName = qty > 1 ? `${params.rawName} #${i + 1}` : params.rawName;

                if (type === 'EAN') {
                    const currentDN = params.dn || generateRandom(5);
                    let currentSP;
                    if (params.sp) {
                        const startVal = parseInt(params.sp);
                        currentSP = (startVal + i).toString().padStart(4, '0');
                    } else {
                        currentSP = generateRandom(4);
                    }
                    const rawString = `${params.prefix}${currentDN}${currentSP}`;
                    finalCode = `${rawString}${calculateChecksum(rawString)}`;
                } else {
                    finalCode = previewData.sampleCode;
                }

                codesToSave.push({
                    program_name: finalName,
                    custom_code: finalCode,
                    qr_type: type,
                    description: description
                });
            }

            await api.post('/qrs/save-batch', { codes: codesToSave, batchId: batchId });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.error || "Lỗi lưu trữ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content qr-modal">
                <div className="modal-header">
                    <h3>Thêm vào: <span className="highlight">{batchName}</span></h3>
                    <button onClick={onClose} className="close-btn"><X size={24}/></button>
                </div>

                <div className="modal-tabs">
                    <button className={`m-tab ${activeTab==='EAN'?'active':''}`} onClick={()=>{setActiveTab('EAN'); setPreviewData(null)}}> <Package size={16}/> EAN-13 </button>
                    <button className={`m-tab ${activeTab==='LINK'?'active':''}`} onClick={()=>{setActiveTab('LINK'); setPreviewData(null)}}> <LinkIcon size={16}/> Link </button>
                    <button className={`m-tab ${activeTab==='TEXT'?'active':''}`} onClick={()=>{setActiveTab('TEXT'); setPreviewData(null)}}> <Type size={16}/> Văn bản </button>
                </div>

                <div className="modal-body">
                    {/* FORM NHẬP */}
                    <div className="input-section">
                        {activeTab === 'EAN' ? (
                            <div className="ean-form">
                                <input className="m-input full" placeholder="Tên sản phẩm" value={eanData.name} onChange={e=>setEanData({...eanData, name: e.target.value})}/>
                                
                                <textarea className="m-input full" rows="2" placeholder="Mô tả / Chi tiết" value={description} onChange={e=>setDescription(e.target.value)}/>

                                <div className="row-3">
                                    <div className="col-small">
                                        <label className="mini-label">Prefix</label>
                                        <input className="m-input" placeholder="893" maxLength={3} value={eanData.prefix} onChange={e=>setEanData({...eanData, prefix: e.target.value})}/>
                                    </div>
                                    
                                    <div className="col-mid">
                                        <div className="label-row">
                                            <span className="mini-label">Mã DN (5)</span>
                                            {/* Nút Gạt Toggle */}
                                            <label className="switch-label">
                                                <input type="checkbox" className="switch-input" checked={isManual.dn} onChange={()=>setIsManual({...isManual, dn: !isManual.dn})}/>
                                                <span className="switch-slider-small"></span>
                                            </label>
                                        </div>
                                        <input className={`m-input ${!isManual.dn ? 'disabled' : ''}`} placeholder="12345" maxLength={5} disabled={!isManual.dn} value={isManual.dn ? eanData.dn : ''} onChange={e=>setEanData({...eanData, dn: e.target.value})}/>
                                    </div>

                                    <div className="col-mid">
                                        <div className="label-row">
                                            <span className="mini-label">Mã SP (4)</span>
                                            <label className="switch-label">
                                                <input type="checkbox" className="switch-input" checked={isManual.sp} onChange={()=>setIsManual({...isManual, sp: !isManual.sp})}/>
                                                <span className="switch-slider-small"></span>
                                            </label>
                                        </div>
                                        <input className={`m-input ${!isManual.sp ? 'disabled' : ''}`} placeholder="0001" maxLength={4} disabled={!isManual.sp} value={isManual.sp ? eanData.sp : ''} onChange={e=>setEanData({...eanData, sp: e.target.value})}/>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="generic-form">
                                <input className="m-input full" placeholder="Tên hiển thị" value={commonName} onChange={e=>setCommonName(e.target.value)}/>
                                <textarea className="m-input full" rows="2" placeholder="Mô tả thêm..." value={description} onChange={e=>setDescription(e.target.value)}/>
                                {activeTab === 'LINK' ? (
                                    <input className="m-input full" placeholder="https://example.com" value={content} onChange={e=>setContent(e.target.value)}/>
                                ) : (
                                    <textarea className="m-input full" rows="3" placeholder="Nội dung văn bản..." value={content} onChange={e=>setContent(e.target.value)}/>
                                )}
                            </div>
                        )}

                        <div className="quantity-row">
                            <label>Số lượng:</label>
                            <input type="number" min="1" max="100" value={quantity} onChange={e=>setQuantity(e.target.value)}/>
                            <span>{activeTab==='EAN' && quantity>1 ? '(Tự tăng)' : ''}</span>
                        </div>
                        
                        <button className="preview-btn" onClick={handlePreview}><Play size={16}/> Xem mẫu</button>
                    </div>

                    {/* PREVIEW */}
                    <div className="preview-box">
                        {previewData ? (
                            <div className="qr-result">
                                {/* QR Code với Logo */}
                                <QRCodeSVG 
                                    value={previewData.sampleCode} 
                                    size={120} 
                                    level="H"
                                    imageSettings={{ src: QR_LOGO, height: 28, width: 28, excavate: true }}
                                />
                                <div className="summary-text">
                                    <p>📦 <strong>Sẽ tạo:</strong> <span style={{color:'#27ae60'}}>{previewData.quantity} mã</span></p>
                                    <p>🏷️ <strong>Mẫu:</strong> <span className="code-tag">{previewData.sampleCode}</span></p>
                                    {previewData.description && <p className="desc-preview">"{previewData.description}"</p>}
                                </div>
                                <button className="save-btn" onClick={handleSave} disabled={loading}>
                                    {loading ? 'Đang lưu...' : <><Save size={16}/> Xác nhận Lưu</>}
                                </button>
                            </div>
                        ) : (
                            <div className="empty-preview"><RefreshCw size={30}/><p>Nhập thông tin để xem mẫu</p></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateQrModal;