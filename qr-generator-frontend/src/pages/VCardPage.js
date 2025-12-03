import React, { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';

// COMPONENTS
import { QRCodeSVG } from 'qrcode.react';
import logoImg from '../assets/logo.png';

// ICONS
import {
    Facebook, Mail, GitHub, Linkedin, ThumbsUp, ChevronRight,
    X, RotateCw, RotateCcw, Twitter, Instagram, Globe, ChevronDown,
    Phone, User, Save, Edit3, Share2, Layout, MapPin, UploadCloud, Check,
    Image as ImageIcon
} from 'react-feather';

// CSS
import './VCardPage.css';

const QR_LOGO = logoImg;
const DEFAULT_AVATAR = "https://via.placeholder.com/150?text=Avatar";

const THEMES = [
    { id: 'legend', name: 'Legend Gold', color: '#d4af37', bg: '#1a1a1a', text: '#fff' },
    { id: 'coffee', name: 'Cà Phê', color: '#6f4e37', bg: '#fdfbf7', text: '#333' },
    { id: 'classic', name: 'Cổ Điển', color: '#2c3e50', bg: '#ffffff', text: '#333' },
    { id: 'ocean', name: 'Đại Dương', color: '#0077b6', bg: '#f0f9ff', text: '#333' },
];
// ICON SVG MÀU CHUẨN
const Icons = {
    Facebook: <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
    Twitter: <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>,
    Instagram: <svg width="20" height="20" viewBox="0 0 24 24"><radialGradient id="rg" r="150%" cx="30%" cy="107%"><stop stopColor="#fdf497" offset="0" /><stop stopColor="#fdf497" offset="0.05" /><stop stopColor="#fd5949" offset="0.45" /><stop stopColor="#d6249f" offset="0.6" /><stop stopColor="#285AEB" offset="0.9" /></radialGradient><path fill="url(#rg)" d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.315 1.347 20.646.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.584.016 4.849.072 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.849c-.053 1.17-.266 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.053-1.816-.249-2.238-.421-.56-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.422-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>,
    LinkedIn: <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077B5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
    GitHub: <svg width="20" height="20" viewBox="0 0 24 24" fill="#181717"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.419-1.305.763-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>,
    Mail: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
    Website: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a90e2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
};

const availableLinks = [
    { type: 'facebook', name: 'Facebook', icon: Icons.Facebook },
    { type: 'twitter', name: 'Twitter', icon: Icons.Twitter },
    { type: 'instagram', name: 'Instagram', icon: Icons.Instagram },
    { type: 'linkedin', name: 'LinkedIn', icon: Icons.LinkedIn },
    { type: 'github', name: 'GitHub', icon: Icons.GitHub },
    { type: 'email', name: 'Email', icon: Icons.Mail },
    { type: 'website', name: 'Website', icon: Icons.Website },
];

// --- HÀM HỖ TRỢ URL ---
const ensureProtocol = (url) => {
    if (!url) return '';
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return url;
    return url.match(/^https?:\/\//) ? url : `https://${url}`;
};

// --- HÀM CẮT ẢNH (CROPPER) ---
const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
});
function getRadianAngle(degreeValue) { return (degreeValue * Math.PI) / 180; }
const rotateSize = (width, height, rotation) => {
    const rotRad = Math.abs(getRadianAngle(rotation));
    return { width: Math.abs(width * Math.cos(rotRad)) + Math.abs(height * Math.sin(rotRad)), height: Math.abs(width * Math.sin(rotRad)) + Math.abs(height * Math.cos(rotRad)) };
};
async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const rotRad = getRadianAngle(rotation);
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);
    canvas.width = bBoxWidth; canvas.height = bBoxHeight;
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2); ctx.rotate(rotRad); ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL('image/jpeg');
}

const VCardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    const [loading, setLoading] = useState(false);

    // Data State
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '', email: '',
        company: '', jobTitle: '', website: '', address: '',
        avatar: '', themeId: 'legend'
    });
    const [links, setLinks] = useState({});
    const [backgroundImage, setBackgroundImage] = useState(''); // Ảnh bìa tùy chỉnh

    // UI State
    const [activeTab, setActiveTab] = useState('preview');
    const [savedProfileId, setSavedProfileId] = useState(null);

    // Cropper State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isSocialSectionOpen, setIsSocialSectionOpen] = useState(true);

    useEffect(() => {
        const initData = async () => {
            if (editId) {
                setLoading(true);
                try {
                    const res = await api.get(`/profiles/${editId}`);
                    const p = res.data;
                    setFormData({
                        firstName: p.first_name || '',
                        lastName: p.last_name || '',
                        phone: p.phone || '',
                        email: p.email || '',
                        company: p.company || '',
                        jobTitle: p.job_title || '',
                        website: p.website || '',
                        address: p.address || '',
                        avatar: p.avatar_base64 || '',
                        themeId: p.theme || 'legend'
                    });
                    setLinks(p.links || {});
                    // Nếu backend có trả về backgroundImage thì set vào đây (hiện tại giả sử chưa có nên để trống hoặc lấy từ avatar nếu muốn)
                    // setBackgroundImage(p.background_image || ''); 
                    setSavedProfileId(p.profile_id);
                } catch (e) { console.error(e); }
                finally { setLoading(false); }
            } else if (user) {
                const nameParts = (user.display_name || '').split(' ');
                const uLast = nameParts.length > 1 ? nameParts.shift() : '';
                const uFirst = nameParts.join(' ');
                setFormData(prev => ({
                    ...prev,
                    firstName: uFirst,
                    lastName: uLast,
                    email: user.email || '',
                    avatar: user.profile_picture || ''
                }));
            }
        };
        initData();
    }, [editId, user]);

    // HÀM LƯU
    const handleSaveProfile = async () => {
        if (!formData.firstName) return alert('Vui lòng nhập Tên.');
        setLoading(true);

        const profileData = {
            ...formData,
            avatarBase64: formData.avatar,
            links: links,
            theme: formData.themeId,
            // Gửi ảnh bìa lên nếu backend hỗ trợ (hiện tại backend chưa có cột này nên nó sẽ bị bỏ qua, nhưng frontend vẫn chạy ổn)
            backgroundImage: backgroundImage
        };

        try {
            let res;
            if (editId) {
                res = await api.put(`/profiles/${editId}`, profileData);
                alert("Cập nhật thành công!");
            } else {
                res = await api.post('/profiles', profileData);
                alert("Tạo mới thành công!");
            }
            setSavedProfileId(res.data.profile_id || editId);
            setActiveTab('qr');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Lỗi khi lưu hồ sơ.');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý ảnh đại diện
    const handleImageChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => { setImageSrc(reader.result); setIsModalOpen(true); });
            reader.readAsDataURL(e.target.files[0]); e.target.value = null;
        }
    };

    // Xử lý ảnh bìa (Background)
    const handleBackgroundChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBackgroundImage(reader.result);
                // Nếu muốn, có thể set theme về custom
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);
    const showCroppedImage = useCallback(async () => {
        try { const res = await getCroppedImg(imageSrc, croppedAreaPixels, rotation); setFormData(prev => ({ ...prev, avatar: res })); setIsModalOpen(false); } catch (e) { console.error(e); }
    }, [imageSrc, croppedAreaPixels, rotation]);
    const closeModal = () => { setIsModalOpen(false); setTimeout(() => { setImageSrc(''); setZoom(1); setRotation(0); }, 300); };

    const handleAddLink = (type) => { if (!links.hasOwnProperty(type)) setLinks(prev => ({ ...prev, [type]: '' })); };
    const handleLinkChange = (type, url) => { setLinks(prev => ({ ...prev, [type]: url })); };
    const handleRemoveLink = (type) => { setLinks(prev => { const newL = { ...prev }; delete newL[type]; return newL; }); };

    const getPublicUrl = () => savedProfileId ? `${window.location.origin}/profile/${savedProfileId}` : '';
    const activeTheme = THEMES.find(t => t.id === formData.themeId) || THEMES[0];

    return (
        <div className="vcard-page-container">
            <div className="vcard-header">
                <h1>{editId ? 'Chỉnh Sửa Danh Thiếp' : 'Tạo Danh Thiếp Mới'}</h1>
            </div>

            <div className="vcard-tabs">
                <button className={`vcard-tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}><Edit3 size={18} /> 1. Thiết kế</button>
                <button className={`vcard-tab-btn ${activeTab === 'qr' ? 'active' : ''}`} onClick={() => setActiveTab('qr')} disabled={!savedProfileId}><Share2 size={18} /> 2. Mã QR</button>
            </div>

            {activeTab === 'preview' && (
                <div className="vcard-layout">
                    {/* --- CỘT TRÁI: FORM --- */}
                    <div className="form-container vcard-form">
                        <div className="form-section">
                            <h3><Layout size={18} /> Giao diện & Hình nền</h3>

                            <div className="theme-selection-area">
                                {/* Chọn màu */}
                                <div className="theme-grid">
                                    {THEMES.map(t => (
                                        <div key={t.id} className={`theme-item ${formData.themeId === t.id ? 'active' : ''}`} onClick={() => { setFormData({ ...formData, themeId: t.id }); setBackgroundImage(''); }} style={{ backgroundColor: t.color }} title={t.name}>
                                            {formData.themeId === t.id && !backgroundImage && <Check size={16} color="white" />}
                                        </div>
                                    ))}
                                </div>

                                {/* Tải ảnh bìa */}
                                <div className="background-upload" style={{ marginTop: 15 }}>
                                    <label htmlFor="bg-upload" className="bg-upload-btn">
                                        <ImageIcon size={16} /> {backgroundImage ? 'Đổi ảnh bìa' : 'Tải ảnh bìa'}
                                    </label>
                                    <input id="bg-upload" type="file" accept="image/*" onChange={handleBackgroundChange} hidden />

                                    {backgroundImage && (
                                        <div className="bg-preview-small" onClick={() => setBackgroundImage('')} title="Xóa ảnh bìa, dùng màu theme">
                                            <img src={backgroundImage} alt="Bg" />
                                            <div className="remove-bg"><X size={12} /></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3><User size={18} /> Thông tin cá nhân</h3>
                            {/* Avatar căn giữa */}
                            <div className="form-group avatar-group-container">
                                <label>Ảnh đại diện</label>
                                <div className="avatar-upload-box">
                                    <img src={formData.avatar || DEFAULT_AVATAR} alt="Avatar" />
                                    <label htmlFor="imgUp" className="upload-btn">
                                        <UploadCloud size={16} /> Tải ảnh lên
                                        <input id="imgUp" type="file" accept="image/*" onChange={handleImageChange} hidden />
                                    </label>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label>Họ</label><input value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} /></div>
                                <div className="form-group"><label>Tên (*)</label><input value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label>Chức danh</label><input value={formData.jobTitle} onChange={e => setFormData({ ...formData, jobTitle: e.target.value })} /></div>
                            <div className="form-group"><label>Công ty</label><input value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} /></div>
                            <div className="form-group"><label>SĐT</label><input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                            <div className="form-group"><label>Email</label><input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} /></div>
                            <div className="form-group"><label>Địa chỉ</label><input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} /></div>
                        </div>

                        <div className="form-section">
                            <h3><ThumbsUp size={18} /> Mạng xã hội</h3>
                            <div className="available-links-grid">
                                {availableLinks.map(link => !links.hasOwnProperty(link.type) && (
                                    <button key={link.type} onClick={() => handleAddLink(link.type)} className="add-link-icon-btn">{link.icon} <span>{link.name}</span></button>
                                ))}
                            </div>
                            <div style={{ marginTop: 15 }}>
                                {Object.keys(links).map(type => {
                                    const info = availableLinks.find(l => l.type === type);
                                    return info ? (
                                        <div key={type} className="link-input-group"><span className="link-input-icon">{info.icon}</span><input value={links[type]} onChange={e => handleLinkChange(type, e.target.value)} placeholder={`Link ${info.name}...`} /><button onClick={() => handleRemoveLink(type)} className="remove-link-btn"><X size={16} /></button></div>
                                    ) : null;
                                })}
                            </div>
                        </div>

                        <button className="save-vcard-btn" onClick={handleSaveProfile} disabled={loading}>
                            {loading ? 'Đang lưu...' : <><Save size={18} /> Lưu Danh Thiếp</>}
                        </button>
                    </div>

                    {/* --- CỘT PHẢI: PREVIEW --- */}
                    <div className="preview-container">
                        <div className="sticky-wrapper">
                            <h4>Xem trước</h4>
                            <div className="mobile-mockup">
                                <div className="notch"></div>
                                <div className="screen" style={{ backgroundColor: activeTheme.bg, color: activeTheme.text }}>

                                    {/* HEADER DÙNG ẢNH BÌA HOẶC MÀU THEME */}
                                    <div
                                        className="card-header"
                                        style={{
                                            backgroundColor: activeTheme.color,
                                            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}
                                    >
                                        <div className="card-avatar-preview"><img src={formData.avatar || DEFAULT_AVATAR} alt="Avatar" /></div>
                                    </div>

                                    <div className="card-body">
                                        <h2 className="preview-name" style={{ color: activeTheme.text }}>{formData.lastName} {formData.firstName}</h2>
                                        <p className="preview-job" style={{ color: activeTheme.text }}>{formData.jobTitle} {formData.company && <span style={{ opacity: 0.7 }}>@ {formData.company}</span>}</p>
                                        <div className="preview-actions"><button style={{ borderColor: activeTheme.color, color: activeTheme.color }}>Lưu Danh Bạ</button></div>
                                        <div className="preview-list">
                                            {formData.phone && (
                                                <a href={`tel:${formData.phone}`} className="preview-item" style={{ textDecoration: 'none' }}>
                                                    <div className="icon" style={{ background: activeTheme.color }}><Phone size={14} color="#fff" /></div>
                                                    <div className="text" style={{ color: activeTheme.text }}><small>Điện thoại</small><span>{formData.phone}</span></div>
                                                </a>
                                            )}
                                            {formData.email && (
                                                <a href={`mailto:${formData.email}`} className="preview-item" style={{ textDecoration: 'none' }}>
                                                    <div className="icon" style={{ background: activeTheme.color }}><Mail size={14} color="#fff" /></div>
                                                    <div className="text" style={{ color: activeTheme.text }}><small>Email</small><span>{formData.email}</span></div>
                                                </a>
                                            )}
                                            {formData.address && (
                                                <a href={`http://googleusercontent.com/maps.google.com/6{encodeURIComponent(formData.address)}`} target="_blank" rel="noreferrer" className="preview-item" style={{ textDecoration: 'none' }}>
                                                    <div className="icon" style={{ background: activeTheme.color }}><MapPin size={14} color="#fff" /></div>
                                                    <div className="text" style={{ color: activeTheme.text }}><small>Địa chỉ</small><span>{formData.address}</span></div>
                                                </a>
                                            )}
                                            {Object.keys(links).length > 0 && (
                                                <div className="social-section">
                                                    <div className="social-header" onClick={() => setIsSocialSectionOpen(!isSocialSectionOpen)} style={{ borderBottom: `1px solid ${activeTheme.text}20` }}>
                                                        <div className="social-header-title" style={{ color: activeTheme.text }}><ThumbsUp size={16} /> Mạng xã hội</div>
                                                        <ChevronDown size={16} style={{ color: activeTheme.text }} />
                                                    </div>
                                                    {isSocialSectionOpen && (
                                                        <div className="social-content open">
                                                            {Object.entries(links).map(([type, url]) => {
                                                                if (!url) return null;
                                                                const info = availableLinks.find(l => l.type === type);
                                                                const safeUrl = ensureProtocol(url);
                                                                return info ? (
                                                                    <a key={type} href={safeUrl} target="_blank" rel="noopener noreferrer" className="social-link" style={{ background: `${activeTheme.color}15`, cursor: 'pointer' }}>
                                                                        <div className="social-icon" style={{ color: activeTheme.color }}>{info.icon}</div>
                                                                        <span style={{ color: activeTheme.text }}>{info.name}</span>
                                                                        <ChevronRight size={16} style={{ marginLeft: 'auto', color: activeTheme.text }} />
                                                                    </a>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="card-footer"><small style={{ color: activeTheme.text }}>Powered by LegendQR</small></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: KẾT QUẢ QR */}
            {activeTab === 'qr' && (
                <div className="qr-result-container" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: 40 }}>
                    <h2 style={{ color: '#27ae60' }}>Hồ sơ đã được lưu!</h2>
                    <div style={{ background: 'white', padding: 20, borderRadius: 10, boxShadow: '0 5px 15px rgba(0,0,0,0.1)', display: 'inline-block', margin: '20px 0' }}>
                        <QRCodeSVG value={getPublicUrl()} size={250} level="H" imageSettings={{ src: QR_LOGO, height: 50, width: 50, excavate: true }} />
                    </div>
                    <div style={{ padding: 15, background: '#f8f9fa', borderRadius: 8, border: '1px dashed #ccc' }}>
                        <a href={getPublicUrl()} target="_blank" rel="noreferrer" style={{ color: '#4a90e2', wordBreak: 'break-all', fontSize: '1.1rem' }}>{getPublicUrl()}</a>
                    </div>
                    <div style={{ marginTop: 30, display: 'flex', gap: 15, justifyContent: 'center' }}>
                        <button onClick={() => window.print()} className="upload-button">In Mã QR</button>
                        <button onClick={() => setActiveTab('preview')} className="upload-button">Sửa lại</button>
                        <button onClick={() => navigate('/admin')} className="upload-button" style={{ background: '#2c3e50', color: 'white' }}>Về trang Quản lý</button>
                    </div>
                </div>
            )}

            {/* MODAL CROP ẢNH */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header"><h2>Cắt ảnh</h2><button onClick={closeModal} className="close-btn"><X size={24} /></button></div>
                        <div className="cropper-container-new"><Cropper image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation} onCropComplete={onCropComplete} /></div>
                        <div className="controls-container"><input type="range" value={zoom} min={1} max={3} step={0.1} onChange={e => setZoom(e.target.value)} /><button onClick={showCroppedImage} className="save-btn-new">Cắt & Dùng</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VCardPage;