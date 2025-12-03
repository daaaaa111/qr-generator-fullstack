import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// COMPONENTS
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';
import CreateQrModal from '../components/CreateQrModal';
import EditQrModal from '../components/EditQrModal';

// EXCEL
import ExcelJS from 'exceljs';
import { generateQrWithLogo } from '../utils/qrGenerator';

// ICONS
import {
    Search, Plus, Folder, Calendar, Clock, ArrowLeft,
    Edit, Trash2, ExternalLink, CheckSquare, Square,
    Download, Grid, List, X
} from 'react-feather';

// CSS (Dùng chung với trang quản lý)
import './ManagementPage.css';

const QR_LOGO = logoImg;

// --- HÀM HỖ TRỢ ---
const sanitizeFilename = (name) => name ? name.replace(/[^a-z0-9\u00a0-\uffff\s-]/gi, '_').trim() : 'File';
const getCurrentDateTime = () => { const now = new Date(); return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}`; };

const HistoryPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // --- STATE ---
    const [viewMode, setViewMode] = useState('batches'); // 'batches' | 'list'
    const [layout, setLayout] = useState('grid'); // 'grid' | 'list'

    const [batches, setBatches] = useState([]);
    const [currentBatch, setCurrentBatch] = useState(null);
    const [dataList, setDataList] = useState([]);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);

    // ============================================================
    // 1. FETCH DATA (LẤY DANH SÁCH TỆP CỦA USER)
    // ============================================================
    const fetchBatches = useCallback(async () => {
        setLoading(true);
        try {
            // API này trả về danh sách tệp của user hiện tại (hoặc tất cả nếu là admin gọi ở trang này)
            const endpoint = user?.role === 'admin' ? '/admin/qrs' : '/qrs/batches';
            // Lưu ý: Nếu bạn muốn dùng chung logic /qrs/batches cho cả admin/user thì dùng dòng dưới:
            // const res = await api.get('/qrs/batches'); 

            // Ở đây ta dùng đúng route batches chuẩn:
            const res = await api.get('/qrs/batches');
            setBatches(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    // ============================================================
    // 2. LOGIC MỞ TỆP & QUAY LẠI
    // ============================================================

    // Mở một Tệp để xem chi tiết
    const handleOpenBatch = async (batch) => {
        setLoading(true);
        try {
            const res = await api.get(`/qrs/batches/${batch.id}`);
            setDataList(res.data.qrs);

            setCurrentBatch(batch);
            setViewMode('list'); // Chuyển sang chế độ xem chi tiết
            setSelectedIds(new Set());
            setSearchTerm('');
        } catch (e) { alert("Không thể mở Tệp này."); }
        finally { setLoading(false); }
    };

    // Quay lại danh sách Tệp
    const handleBackToBatches = () => {
        setViewMode('batches');
        setCurrentBatch(null);
        setDataList([]); // Reset dataList
        fetchBatches();
    };

    // ============================================================
    // 3. LOGIC LỌC & TÌM KIẾM
    // ============================================================

    // Lọc danh sách Tệp (Batches)
    const filteredBatches = batches.filter(b =>
        b.batch_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Lọc danh sách Mã QR (Items) - Dùng dataList
    const filteredItems = dataList.filter(item =>
        item.program_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.custom_code?.includes(searchTerm)
    );

    const currentDisplayData = viewMode === 'batches' ? filteredBatches : filteredItems;

    // ============================================================
    // 4. ACTIONS (CHỌN, XÓA, EXCEL, SỬA)
    // ============================================================

    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const handleSelectAll = () => {
        if (selectedIds.size === currentDisplayData.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(currentDisplayData.map(item => item.id)));
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Bạn chắc chắn muốn xóa mã này?")) return;
        try {
            await api.delete(`/qrs/${id}`);
            setDataList(prev => prev.filter(item => item.id !== id));
        } catch (e) { alert("Lỗi xóa"); }
    };

    const handleExportSelected = async () => {
        if (selectedIds.size === 0) return alert("Chưa chọn mục nào!");
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('QR Codes');

            // Cấu hình cột
            worksheet.columns = [
                { header: 'STT', key: 'stt', width: 8 },
                { header: 'Tên / Ghi chú', key: 'name', width: 30 },
                { header: 'Mô tả chi tiết', key: 'desc', width: 25 },
                { header: 'Nội dung Mã', key: 'code', width: 25 },
                { header: 'Hình ảnh', key: 'image', width: 30 }
            ];

            // Lọc item từ dataList (thay vì qrList cũ)
            const itemsToExport = dataList.filter(item => selectedIds.has(item.id));

            for (let i = 0; i < itemsToExport.length; i++) {
                const item = itemsToExport[i];
                const rowIndex = i + 2;

                worksheet.addRow({
                    stt: i + 1,
                    name: item.program_name,
                    desc: item.description || '',
                    code: item.custom_code
                });

                // Căn giữa
                const row = worksheet.getRow(rowIndex);
                row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };

                // Vẽ ảnh QR
                const qrDataUrl = await generateQrWithLogo(item.custom_code, QR_LOGO);
                if (qrDataUrl) {
                    const imageId = workbook.addImage({ base64: qrDataUrl, extension: 'png' });
                    worksheet.addImage(imageId, { tl: { col: 4, row: rowIndex - 1 }, ext: { width: 100, height: 100 } });
                }
                row.height = 120;
            }

            const fileName = `${sanitizeFilename(currentBatch?.batch_name || 'My_QR')}_${getCurrentDateTime()}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.setAttribute('download', fileName); document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } catch (e) { alert("Lỗi xuất Excel"); }
        finally { setIsExporting(false); }
    };

    return (
        <div className="management-container">
            {/* HEADER */}
            <div className="page-header">
                <div>
                    <h1>Bộ sưu tập QR của bạn</h1>
                    <p>Xin chào, <strong>{user?.display_name}</strong></p>
                </div>
                <div className="search-box">
                    <Search size={18} />
                    <input
                        placeholder={viewMode === 'batches' ? "Tìm kiếm Tệp..." : "Tìm kiếm Mã trong tệp này..."}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="clear-search-btn"><X size={14} /></button>}
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="sorting-toolbar">
                <div className="toolbar-left">
                    {viewMode === 'list' ? (
                        <div className="filter-group">
                            <button className="outline-btn back-btn" onClick={handleBackToBatches} style={{ marginRight: '15px' }}>
                                <ArrowLeft size={16} /> Quay lại
                            </button>

                            <div className="action-buttons-row">
                                <button className="outline-btn" onClick={handleSelectAll} disabled={currentDisplayData.length === 0}>
                                    {selectedIds.size > 0 && selectedIds.size === currentDisplayData.length ? <CheckSquare size={18} /> : <Square size={18} />}
                                    {selectedIds.size === currentDisplayData.length ? ' Bỏ chọn' : ' Tất cả'}
                                </button>
                                <button className="primary-btn" onClick={handleExportSelected} disabled={selectedIds.size === 0 || isExporting}>
                                    <Download size={18} /> Excel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <span className="toolbar-label">Danh sách Nhóm Mã đã tạo</span>
                    )}
                </div>

                <div className="toolbar-right">
                    <div className="layout-toggle">
                        <button className={`icon-btn ${layout === 'list' ? 'active' : ''}`} onClick={() => setLayout('list')} title="Danh sách"><List size={18} /></button>
                        <button className={`icon-btn ${layout === 'grid' ? 'active' : ''}`} onClick={() => setLayout('grid')} title="Lưới"><Grid size={18} /></button>
                    </div>
                </div>
            </div>

            <div className="content-area">
                {loading ? <div className="loading-spinner">Đang tải dữ liệu...</div> : (
                    <>
                        {/* --- VIEW 1: DANH SÁCH TỆP (BATCHES) --- */}
                        {viewMode === 'batches' && (
                            <div className={layout === 'grid' ? "grid-layout" : "list-layout batches-list"}>
                                {layout === 'grid'
                                    ? <div className="data-card create-new-card" onClick={() => navigate('/')}><Plus size={30} /><h3>Tạo Nhóm Mới</h3></div>
                                    : <div className="data-card create-new-row" onClick={() => navigate('/')} style={{ justifyContent: 'center', color: '#4a90e2', fontWeight: 'bold', borderStyle: 'dashed', cursor: 'pointer' }}><Plus size={18} style={{ marginRight: 8 }} /> Tạo Nhóm Mã Mới</div>
                                }

                                {layout === 'list' && (<div className="list-header batches-header"><div></div><div className="center-text">ID</div><div>Tên Nhóm</div><div className="center-text">Số lượng</div><div className="center-text">Ngày tạo</div><div className="center-text">Cập nhật</div></div>)}

                                {filteredBatches.map(b => (
                                    <div key={b.id} className="data-card" onClick={() => handleOpenBatch(b)} style={{ cursor: 'pointer', flexDirection: layout === 'grid' ? 'column' : 'row', alignItems: layout === 'grid' ? 'flex-start' : 'center' }}>
                                        <div className={layout === 'grid' ? "card-top-row" : "col-icon"} style={layout === 'grid' ? { display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '10px' } : {}}>
                                            <div className="card-icon folder-icon"><Folder size={24} /></div>
                                            {layout === 'grid' && <span className="code-badge">SL: {b.qr_count}</span>}
                                        </div>
                                        {layout === 'list' && <div className="batch-id-cell">#{b.id}</div>}

                                        <div style={{ width: '100%', display: layout === 'list' ? 'contents' : 'block' }}>
                                            <h3 style={layout === 'grid' ? { fontSize: '1.1rem', margin: '0 0 10px 0' } : { fontSize: '1rem', margin: 0, fontWeight: '600' }}>{b.batch_name}</h3>
                                            {layout === 'list' && <div className="center-text" style={{ fontWeight: 'bold', color: '#4a90e2' }}>{b.qr_count}</div>}
                                            <div className="meta-group" style={layout === 'grid' ? { fontSize: '0.8rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '5px' } : { display: 'contents', fontSize: '0.9rem', color: '#666' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: layout === 'list' ? 'center' : 'flex-start' }}>{layout === 'grid' && <Calendar size={14} />} {new Date(b.created_at).toLocaleDateString('vi-VN')}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: layout === 'grid' ? '#27ae60' : 'inherit', justifyContent: layout === 'list' ? 'center' : 'flex-start' }}>{layout === 'grid' && <Clock size={14} />} {b.updated_at ? new Date(b.updated_at).toLocaleDateString('vi-VN') : '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* --- VIEW 2: CHI TIẾT MÃ TRONG TỆP --- */}
                        {viewMode === 'list' && (
                            <>
                                <div className="batch-header" style={{ marginBottom: 20 }}>
                                    <h2><Folder size={24} style={{ color: '#f59e0b' }} /> {currentBatch?.batch_name}</h2>
                                    <button className="primary-btn add-more-btn" onClick={() => setIsCreateOpen(true)}>
                                        <Plus size={16} /> Thêm vào nhóm này
                                    </button>
                                </div>

                                <div className={layout === 'list' ? 'list-layout' : 'grid-layout'}>
                                    {layout === 'list' && (
                                        <div className="list-header items-header">
                                            <div className="header-checkbox" onClick={handleSelectAll}>{selectedIds.size > 0 && selectedIds.size === currentDisplayData.length ? <CheckSquare size={18} color="#4a90e2" /> : <Square size={18} color="#555" />}</div>
                                            <div className="center-text">ID</div>
                                            <div>Tên & Ghi chú</div>
                                            <div>Nội dung Mã</div>
                                            <div className="center-text">QR</div>
                                            <div className="center-text">Ngày tạo</div>
                                            <div style={{ textAlign: 'right' }}>Hành động</div>
                                        </div>
                                    )}

                                    {filteredItems.map(item => {
                                        const isSelected = selectedIds.has(item.id);
                                        const isAutoName = item.program_name.startsWith('Tệp QR') || item.program_name.startsWith('SP trong');

                                        return (
                                            <div key={item.id} className={`data-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleSelect(item.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                                                <div className="card-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} style={{ zIndex: 2 }}>
                                                    {isSelected ? <CheckSquare color="#4a90e2" /> : <Square color="#ddd" />}
                                                </div>

                                                {layout === 'list' && <div className="batch-id-cell">#{item.id}</div>}

                                                <div className="card-body-wrapper" style={{ display: layout === 'list' ? 'contents' : 'block' }}>
                                                    <div className="card-info-section">
                                                        {!isAutoName && <h3 title={item.program_name}>{item.program_name}</h3>}
                                                        {item.description && <p className="sub-text">{item.description}</p>}
                                                        {layout === 'grid' && <div style={{ marginTop: '10px' }}><QRCodeSVG value={item.custom_code} size={120} level="H" imageSettings={{ src: QR_LOGO, height: 26, width: 26, excavate: true }} /></div>}
                                                    </div>

                                                    {layout === 'list' && <div className="card-code-section" title={item.custom_code}>{item.custom_code}</div>}

                                                    {layout === 'list' && (
                                                        <div className="list-qr-preview">
                                                            <QRCodeSVG value={item.custom_code} size={40} level="L" imageSettings={{ src: QR_LOGO, height: 10, width: 10, excavate: true }} />
                                                        </div>
                                                    )}

                                                    {layout === 'list' && <div className="list-date-col">{new Date(item.created_at).toLocaleDateString('vi-VN')}</div>}

                                                    {layout === 'grid' && <div className="qr-number-display">{item.custom_code}</div>}
                                                </div>

                                                <div className="action-buttons-group-list">
                                                    <button className="action-btn edit-btn" onClick={(e) => { e.stopPropagation(); setEditItem(item); }}><Edit size={14} /></button>
                                                    <button className="action-btn delete-btn" onClick={(e) => handleDelete(e, item.id)}><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* MODAL TẠO NHANH */}
            {isCreateOpen && currentBatch && (
                <CreateQrModal
                    batchId={currentBatch.id}
                    batchName={currentBatch.batch_name}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={() => {
                        handleOpenBatch(currentBatch); // Reload list item
                        fetchBatches(); // Reload list batch (cập nhật số lượng)
                    }}
                />
            )}

            {/* MODAL SỬA */}
            {editItem && (
                <EditQrModal
                    qrData={editItem}
                    onClose={() => setEditItem(null)}
                    onSuccess={() => handleOpenBatch(currentBatch)}
                />
            )}
        </div>
    );
};

export default HistoryPage;