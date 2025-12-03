import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// COMPONENT & ASSETS
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';
import CreateQrModal from '../components/CreateQrModal'; // Popup tạo mới

// EXCEL & UTILS
import ExcelJS from 'exceljs';
import { generateQrWithLogo } from '../utils/qrGenerator';

// ICONS
import {
    Trash2, ExternalLink, User, Package, Search, CheckSquare, Square,
    Download, Folder, Plus, ArrowLeft, Edit, Calendar, Clock, Copy,
    ArrowUp, ArrowDown, Filter, ChevronLeft, ChevronRight, Grid, List, X
} from 'react-feather';

import './ManagementPage.css';

const QR_LOGO = logoImg;
const ITEMS_PER_PAGE = 10;

// --- HÀM HỖ TRỢ ---
const sanitizeFilename = (name) => name ? name.replace(/[^a-z0-9\u00a0-\uffff\s-]/gi, '_').trim() : 'File';
const getCurrentDateTime = () => { const now = new Date(); return `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours()}${now.getMinutes()}`; };
const inferQrType = (code) => { if (!code) return 'TEXT'; if (code.length === 13 && /^\d+$/.test(code)) return 'EAN'; if (code.startsWith('http://') || code.startsWith('https://')) return 'LINK'; return 'TEXT'; };

function ManagementPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navigate = useNavigate();

    // --- STATE ---
    const [activeTab, setActiveTab] = useState('qrs');
    const [viewMode, setViewMode] = useState('batches');
    const [layout, setLayout] = useState('list');

    const [batches, setBatches] = useState([]);
    const [currentBatch, setCurrentBatch] = useState(null);
    const [dataList, setDataList] = useState([]);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const [sortBy, setSortBy] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterType, setFilterType] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    // --- FETCH DATA ---
    const fetchBatches = useCallback(async () => {
        setLoading(true);
        try { const res = await api.get('/qrs/batches'); setBatches(res.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = isAdmin ? '/admin/profiles' : '/profiles/my-profiles';
            const res = await api.get(endpoint);
            setDataList(res.data);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [isAdmin]);

    useEffect(() => {
        if (activeTab === 'qrs') { setViewMode('batches'); fetchBatches(); } else { fetchProfiles(); }
    }, [activeTab, fetchBatches, fetchProfiles]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, viewMode, searchTerm, filterType, sortBy, sortOrder]);

    // --- SORT & FILTER LOGIC ---
    const sortedBatches = useMemo(() => {
        let processed = [...batches];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            processed = processed.filter(b => String(b.id).includes(lower) || b.batch_name.toLowerCase().includes(lower));
        }
        return processed.sort((a, b) => {
            let aVal = a[sortBy]; let bVal = b[sortBy];
            if (['id', 'qr_count'].includes(sortBy)) { aVal = parseInt(aVal, 10) || 0; bVal = parseInt(bVal, 10) || 0; return sortOrder === 'asc' ? aVal - bVal : bVal - aVal; }
            if (['created_at', 'updated_at'].includes(sortBy)) { aVal = new Date(aVal).getTime() || 0; bVal = new Date(bVal).getTime() || 0; return sortOrder === 'asc' ? aVal - bVal : bVal - aVal; }
            if (typeof aVal === 'string') return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            return 0;
        });
    }, [batches, sortBy, sortOrder, searchTerm]);

    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let result = dataList.filter(item => {
            const creator = item.display_name || item.owner_name || '';
            if (!term) return true;
            if (activeTab === 'qrs') return String(item.id).includes(term) || item.program_name?.toLowerCase().includes(term) || item.custom_code?.includes(term) || creator.toLowerCase().includes(term);
            return String(item.profile_id).toLowerCase().includes(term) || item.first_name?.toLowerCase().includes(term) || item.company?.toLowerCase().includes(term) || creator.toLowerCase().includes(term);
        });

        if (activeTab === 'qrs' && filterType !== 'ALL') {
            result = result.filter(item => item.qr_type === filterType || inferQrType(item.custom_code) === filterType);
        }

        return result.sort((a, b) => {
            let key = sortBy;
            if (activeTab === 'profiles') {
                if (key === 'program_name') key = 'first_name';
                if (key === 'custom_code') key = 'email';
                if (key === 'id') key = 'profile_id';
            }
            let aVal = a[key]; let bVal = b[key];
            if (key === 'id' || key === 'qr_count') { aVal = parseInt(aVal, 10) || 0; bVal = parseInt(bVal, 10) || 0; return sortOrder === 'asc' ? aVal - bVal : bVal - aVal; }
            if (['created_at', 'updated_at'].includes(key)) { aVal = new Date(aVal).getTime() || 0; bVal = new Date(bVal).getTime() || 0; return sortOrder === 'asc' ? aVal - bVal : bVal - aVal; }
            if (!aVal) aVal = ""; if (!bVal) bVal = "";
            return sortOrder === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });
    }, [dataList, searchTerm, activeTab, filterType, sortBy, sortOrder]);

    // --- PAGINATION ---
    const currentDataSource = (activeTab === 'qrs' && viewMode === 'batches') ? sortedBatches : filteredData;
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentDisplayData = currentDataSource.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(currentDataSource.length / ITEMS_PER_PAGE);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // --- ACTIONS ---
    const toggleSortOrder = useCallback((criteria) => { if (sortBy === criteria) { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); } else { setSortBy(criteria); setSortOrder('desc'); } }, [sortBy, sortOrder]);
    const renderSortIcon = (column) => { if (sortBy !== column) return <span className="sort-placeholder" style={{ width: 14, display: 'inline-block' }}></span>; return sortOrder === 'asc' ? <ArrowUp size={14} className="sort-active" /> : <ArrowDown size={14} className="sort-active" />; };

    const handleOpenBatch = async (batch) => { setLoading(true); try { const res = await api.get(`/qrs/batches/${batch.id}`); setDataList(res.data.qrs); setCurrentBatch(batch); setSelectedIds(new Set()); setViewMode('list'); setFilterType('ALL'); } catch (e) { alert("Lỗi mở tệp"); } finally { setLoading(false); } };
    const handleBackToBatches = () => { setViewMode('batches'); setCurrentBatch(null); fetchBatches(); setFilterType('ALL'); setSearchTerm(''); };
    const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const handleSelectAll = () => {
        // Chọn TOÀN BỘ danh sách đã lọc (không chỉ trang hiện tại)
        const idKey = activeTab === 'qrs' ? 'id' : 'profile_id';
        const allIds = currentDataSource.map(item => item[idKey]);
        if (selectedIds.size === allIds.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(allIds));
    };
    const handleCopyCode = (code, id) => { navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); };
    const handleDelete = async (e, id) => { e.stopPropagation(); if (!window.confirm("Xóa vĩnh viễn?")) return; try { const endpoint = activeTab === 'qrs' ? (isAdmin ? `/admin/qrs/${id}` : `/qrs/${id}`) : `/profiles/${id}`; await api.delete(endpoint); if (viewMode === 'batches') fetchBatches(); else setDataList(prev => prev.filter(item => (activeTab === 'qrs' ? item.id : item.profile_id) !== id)); } catch (e) { alert("Lỗi xóa"); } };
    const handleEditProfile = (e, id) => { e.stopPropagation(); navigate(`/vcard?edit=${id}`); };
    const handleCreateNew = () => { if (viewMode === 'batches') { setCurrentBatch({ id: 'new', batch_name: 'Nhóm Mới' }); } setIsModalOpen(true); };

    const handleExportSelected = async () => {
        if (selectedIds.size === 0) return alert("Chưa chọn mục nào!");
        setIsExporting(true);
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Data');
            worksheet.columns = [{ header: 'STT', key: 'stt', width: 8 }, { header: 'Tên', key: 'name', width: 30 }, { header: 'Người tạo', key: 'creator', width: 20 }, { header: 'Chi tiết', key: 'desc', width: 30 }, { header: 'Mã/Link', key: 'code', width: 25 }, { header: 'QR', key: 'image', width: 30 }];
            const idKey = activeTab === 'qrs' ? 'id' : 'profile_id';
            const itemsToExport = currentDataSource.filter(item => selectedIds.has(item[idKey]));
            for (let i = 0; i < itemsToExport.length; i++) {
                const item = itemsToExport[i];
                const rowIndex = i + 2;
                const name = activeTab === 'qrs' ? item.program_name : `${item.first_name} ${item.last_name}`;
                const code = activeTab === 'qrs' ? item.custom_code : `${window.location.origin}/profile/${item.profile_id}`;
                const desc = activeTab === 'qrs' ? (item.description || '') : `${item.job_title} @ ${item.company}`;
                const creator = activeTab === 'qrs' ? (currentBatch?.creator_name || item.display_name || 'Tôi') : (item.owner_name || 'Tôi');
                const row = worksheet.addRow({ stt: i + 1, name: name, creator: creator, desc: desc, code: code });
                row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }; row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };
                const qrDataUrl = await generateQrWithLogo(code, QR_LOGO);
                if (qrDataUrl) { const imageId = workbook.addImage({ base64: qrDataUrl, extension: 'png' }); worksheet.addImage(imageId, { tl: { col: 5, row: rowIndex - 1 }, ext: { width: 100, height: 100 } }); }
                worksheet.getRow(rowIndex).height = 120;
            }
            const fileName = `${sanitizeFilename(currentBatch?.batch_name || 'Export')}_${getCurrentDateTime()}_SL${selectedIds.size}.xlsx`;
            const buffer = await workbook.xlsx.writeBuffer(); const blob = new Blob([buffer]); const url = window.URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', fileName); document.body.appendChild(link); link.click(); document.body.removeChild(link);
        } catch (e) { alert("Lỗi xuất Excel"); } finally { setIsExporting(false); }
    };

    // --- SUB-RENDER: DANH SÁCH QR (ITEMS) ---
    const renderQrList = () => (
        <>
            <div className="batch-header" style={{ marginBottom: 20 }}><h2>📂 {currentBatch?.batch_name}</h2></div>
            <div className={layout === 'list' ? 'list-layout' : 'grid-layout'}>
                {layout === 'list' && (
                    <div className="list-header items-header">
                        <div style={{ textAlign: 'right' }}>Trạng thái</div>
                        <div className="sortable-col center-text" onClick={() => toggleSortOrder('id')}>ID {renderSortIcon('id')}</div>
                        <div className="sortable-col" onClick={() => toggleSortOrder('program_name')}>Tên & Mô tả {renderSortIcon('program_name')}</div>
                        <div className="center-text">Người tạo</div>
                        <div className="sortable-col" onClick={() => toggleSortOrder('custom_code')}>Nội dung {renderSortIcon('custom_code')}</div>
                        <div className="center-text">QR</div>
                        <div className="sortable-col center-text" onClick={() => toggleSortOrder('created_at')}>Ngày tạo {renderSortIcon('created_at')}</div>
                        {/* <div className="header-checkbox" onClick={handleSelectAll}>{selectedIds.size > 0 && selectedIds.size === currentDataSource.length ? <CheckSquare size={18} color="#4a90e2" /> : <Square size={18} color="#555" />}</div> */}
                    </div>
                )}
                {currentDisplayData.map(item => {
                    const isSelected = selectedIds.has(item.id);
                    const creatorName = item.display_name || item.creator_name || 'Tôi';
                    return (
                        <div key={item.id} className={`data-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleSelect(item.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                            {/* ... Code render item QR giống cũ ... */}
                            <div className="card-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} style={{ zIndex: 2 }}>{isSelected ? <CheckSquare color="#4a90e2" /> : <Square color="#ddd" />}</div>
                            {layout === 'list' && <div className="batch-id-cell">#{item.id}</div>}
                            <div className="card-body-wrapper" style={{ display: layout === 'list' ? 'contents' : 'block' }}>
                                <div className="card-info-section"><h3 title={item.program_name}>{item.program_name}</h3><p className="sub-text">{item.description}</p>{layout === 'grid' && <div style={{ marginTop: '5px' }}><QRCodeSVG value={item.custom_code} size={120} level="H" imageSettings={{ src: QR_LOGO, height: 26, width: 26, excavate: true }} /></div>}</div>
                                {layout === 'list' && <div className="creator-cell center-text">{creatorName}</div>}
                                {layout === 'list' && <div className="card-code-section" title={item.custom_code}>{item.custom_code}</div>}
                                {layout === 'list' && <div className="list-qr-preview"><QRCodeSVG value={item.custom_code} size={40} level="L" imageSettings={{ src: QR_LOGO, height: 10, width: 10, excavate: true }} /></div>}
                                {layout === 'list' && <div className="list-date-col">{new Date(item.created_at).toLocaleDateString('vi-VN')}</div>}
                                {layout === 'grid' && <div className="qr-number-display">{item.custom_code}</div>}
                            </div>
                            <div className="action-buttons-group-list"><button className="action-btn delete-btn" onClick={(e) => handleDelete(e, item.id)}><Trash2 size={14} /></button></div>
                        </div>
                    );
                })}
            </div>
        </>
    );

    // --- SUB-RENDER: DANH SÁCH VCARD PROFILE ---
    const renderProfileList = () => (
        <div className={layout === 'list' ? 'list-layout' : 'grid-layout'}>
            {layout === 'list' && (
                <div className="list-header items-header">
                    <div className="header-checkbox" onClick={handleSelectAll}>{selectedIds.size > 0 && selectedIds.size === currentDataSource.length ? <CheckSquare size={18} color="#4a90e2" /> : <Square size={18} color="#555" />}</div>
                    <div className="sortable-col center-text" onClick={() => toggleSortOrder('profile_id')}>Mã Số {renderSortIcon('profile_id')}</div>
                    <div className="sortable-col" onClick={() => toggleSortOrder('first_name')}>Tên & Chức danh {renderSortIcon('first_name')}</div>
                    <div className="center-text">Người tạo</div>
                    <div className="sortable-col" onClick={() => toggleSortOrder('email')}>Liên hệ {renderSortIcon('email')}</div>
                    <div className="center-text">QR</div>
                    <div className="sortable-col center-text" onClick={() => toggleSortOrder('created_at')}>Ngày tạo {renderSortIcon('created_at')}</div>
                    <div style={{ textAlign: 'right' }}>Hành động</div>
                </div>
            )}
            {currentDisplayData.map(item => {
                const isSelected = selectedIds.has(item.profile_id);
                const displayName = `${item.last_name} ${item.first_name}`;
                const creatorName = item.owner_name || 'Tôi';
                const shortId = item.profile_id.substring(0, 8).toUpperCase();
                return (
                    <div key={item.profile_id} className={`data-card profile-style ${isSelected ? 'selected' : ''}`} onClick={() => toggleSelect(item.profile_id)}>
                        <div className="card-checkbox" onClick={(e) => { e.stopPropagation(); toggleSelect(item.profile_id); }}>{isSelected ? <CheckSquare color="#4a90e2" /> : <Square color="#ddd" />}</div>
                        {layout === 'list' && <div className="batch-id-cell" title={item.profile_id}>#{shortId}</div>}
                        <div className="card-body-wrapper" style={{ display: layout === 'list' ? 'contents' : 'block' }}>
                            <div className="card-info-section"><h3>{displayName}</h3><p className="sub-text">{item.job_title} @ {item.company}</p>{layout === 'grid' && <QRCodeSVG value={`${window.location.origin}/profile/${item.profile_id}`} size={100} level="H" />}</div>
                            {layout === 'list' && <div className="creator-cell center-text">{creatorName}</div>}
                            {layout === 'list' && <div className="card-code-section">{item.email}</div>}
                            {layout === 'list' && <div className="list-qr-preview"><QRCodeSVG value={`${window.location.origin}/profile/${item.profile_id}`} size={40} level="L" /></div>}
                            {layout === 'list' && <div className="list-date-col">{new Date(item.created_at).toLocaleDateString('vi-VN')}</div>}
                        </div>
                        <div className="action-buttons-group-list"><button className="action-btn edit-btn" onClick={(e) => handleEditProfile(e, item.profile_id)}><Edit size={14} /></button><button className="action-btn delete-btn" onClick={(e) => handleDelete(e, item.profile_id)}><Trash2 size={14} /></button></div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="management-container">
            <div className="page-header"><div><h1>{isAdmin ? 'Trung Tâm Quản Lý' : 'Quản Lý Dữ Liệu'}</h1><p>Xin chào, <strong>{user?.display_name}</strong></p></div>{(activeTab === 'profiles' || viewMode === 'list') && <div className="search-box"><Search size={18} /><input placeholder="Tìm kiếm..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></div>}</div>
            <div className="tabs-container"><button className={`tab-btn ${activeTab === 'qrs' ? 'active' : ''}`} onClick={() => setActiveTab('qrs')}><Package size={18} /> Kho Tệp QR</button><button className={`tab-btn ${activeTab === 'profiles' ? 'active' : ''}`} onClick={() => setActiveTab('profiles')}><User size={18} /> Danh thiếp vCard</button></div>

            <div className="sorting-toolbar">
                <div className="toolbar-left">
                    {activeTab === 'qrs' && viewMode === 'batches' ? (
                        <div className="toolbar-search-box"><Search size={16} className="search-icon" /><input placeholder="Tìm Tệp QR, ID..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></div>
                    ) : (
                        <div className="filter-group">
                            {activeTab === 'qrs' && <button className="outline-btn back-btn" onClick={handleBackToBatches} style={{ marginRight: '10px' }}><ArrowLeft size={16} /> Quay lại</button>}
                            {activeTab === 'qrs' && (<div className="filter-dropdown-wrapper"><select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }} className="filter-dropdown"><option value="ALL">Tất cả</option><option value="EAN">EAN-13</option><option value="LINK">Link</option><option value="TEXT">Văn bản</option></select></div>)}
                            <div className="action-buttons-row" style={{ marginLeft: '10px' }}>
                                <button className="outline-btn" onClick={handleSelectAll} disabled={currentDataSource.length === 0}>{selectedIds.size > 0 && selectedIds.size === currentDataSource.length ? <CheckSquare size={18} /> : <Square size={18} />} {selectedIds.size === currentDataSource.length ? ' Bỏ' : ' Tất cả'}</button>
                                <button className="primary-btn" onClick={handleExportSelected} disabled={selectedIds.size === 0 || isExporting}><Download size={18} /> Excel</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="toolbar-right">
                    {activeTab === 'qrs' && (<button className="primary-btn create-btn-toolbar" onClick={handleCreateNew}><Plus size={18} /> <span className="hide-on-mobile">{viewMode === 'batches' ? 'Tạo Nhóm Mới' : 'Thêm Mã'}</span></button>)}
                    <div className="layout-toggle"><button className={`icon-btn ${layout === 'list' ? 'active' : ''}`} onClick={() => setLayout('list')} title="Danh sách"><List size={18} /></button><button className={`icon-btn ${layout === 'grid' ? 'active' : ''}`} onClick={() => setLayout('grid')} title="Lưới"><Grid size={18} /></button></div>
                </div>
            </div>

            <div className="content-area">
                {loading ? <div className="loading-spinner">Đang tải...</div> : (
                    <>
                        {/* VIEW 1: BATCHES */}
                        {activeTab === 'qrs' && viewMode === 'batches' && (
                            <div className={layout === 'grid' ? "grid-layout" : "list-layout batches-list"}>
                                {/* ... (Phần render Batches giữ nguyên như cũ) ... */}
                                {layout === 'list' && (<div className="list-header batches-header"><div></div><div className="sortable-col center-text" onClick={() => toggleSortOrder('id')}>ID {renderSortIcon('id')}</div><div className="sortable-col" onClick={() => toggleSortOrder('batch_name')}>Tên Tệp {renderSortIcon('batch_name')}</div><div className="center-text">Người tạo</div><div className="sortable-col center-text" onClick={() => toggleSortOrder('qr_count')}>SL {renderSortIcon('qr_count')}</div><div className="sortable-col center-text" onClick={() => toggleSortOrder('created_at')}>Ngày tạo {renderSortIcon('created_at')}</div><div className="sortable-col center-text" onClick={() => toggleSortOrder('updated_at')}>Cập nhật {renderSortIcon('updated_at')}</div></div>)}
                                {currentDisplayData.map(b => (
                                    <div key={b.id} className="data-card" onClick={() => handleOpenBatch(b)} style={{ cursor: 'pointer', flexDirection: layout === 'grid' ? 'column' : 'row', alignItems: layout === 'grid' ? 'flex-start' : 'center' }}>
                                        <div className={layout === 'grid' ? "card-top-row" : "col-icon"} style={layout === 'grid' ? { display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '10px' } : {}}><div className="card-icon folder-icon"><Folder size={24} /></div>{layout === 'grid' && <span className="code-badge">SL: {b.qr_count}</span>}</div>
                                        {layout === 'list' && <div className="batch-id-cell">#{b.id}</div>}
                                        <div style={{ width: '100%', display: layout === 'list' ? 'contents' : 'block' }}>
                                            <h3 style={layout === 'grid' ? { fontSize: '1.1rem', margin: '0 0 10px 0' } : { fontSize: '1rem', margin: 0, fontWeight: '600' }}>{b.batch_name}</h3>
                                            {layout === 'list' && <div className="creator-cell center-text">{b.creator_name || 'Tôi'}</div>}
                                            {layout === 'list' && <div style={{ fontWeight: 'bold', color: '#4a90e2', textAlign: 'center' }}>{b.qr_count}</div>}
                                            <div className="meta-group" style={layout === 'grid' ? { fontSize: '0.8rem', color: '#666', display: 'flex', flexDirection: 'column', gap: '5px' } : { display: 'contents', fontSize: '0.9rem', color: '#666' }}><div style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: layout === 'list' ? 'center' : 'flex-start' }}>{layout === 'grid' && <Calendar size={14} />} {new Date(b.created_at).toLocaleDateString('vi-VN')}</div><div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: layout === 'grid' ? '#27ae60' : 'inherit', justifyContent: layout === 'list' ? 'center' : 'flex-start' }}>{layout === 'grid' && <Clock size={14} />} {b.updated_at ? new Date(b.updated_at).toLocaleDateString('vi-VN') : '-'}</div></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* VIEW 2 & 3: TÁCH BIỆT QR LIST VÀ PROFILE LIST */}
                        {activeTab === 'qrs' && viewMode === 'list' && renderQrList()}
                        {activeTab === 'profiles' && renderProfileList()}
                    </>
                )}
                {!loading && currentDisplayData.length === 0 && <div className="empty-state">Không tìm thấy dữ liệu.</div>}
            </div>

            <div className="pagination"><button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="page-btn"><ChevronLeft size={16} /></button><span className="page-info">Trang {currentPage} / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)} className="page-btn"><ChevronRight size={16} /></button></div>

            {isModalOpen && (
                <CreateQrModal batchId={currentBatch?.id || null} batchName={currentBatch?.batch_name || "Tạo Nhóm Mới"} onClose={() => setIsModalOpen(false)} onSuccess={() => { if (viewMode === 'list') handleOpenBatch(currentBatch); fetchBatches(); }} />
            )}
        </div>
    );
}

export default ManagementPage;