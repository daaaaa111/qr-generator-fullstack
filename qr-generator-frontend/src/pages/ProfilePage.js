import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Phone, Mail, MapPin, Globe, UserPlus, Facebook, Twitter, Instagram, Linkedin, GitHub, ArrowRight } from 'react-feather';
import './ProfilePage.css';

const DEFAULT_AVATAR = "https://via.placeholder.com/150?text=Avatar";

// Hàm hỗ trợ URL
const ensureProtocol = (url) => {
    if (!url) return '';
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return url;
    return url.match(/^https?:\/\//) ? url : `https://${url}`;
};

// Map icon mạng xã hội
const getSocialIcon = (type) => {
    switch (type) {
        case 'facebook': return <Facebook size={20} />;
        case 'twitter': return <Twitter size={20} />;
        case 'instagram': return <Instagram size={20} />;
        case 'linkedin': return <Linkedin size={20} />;
        case 'github': return <GitHub size={20} />;
        default: return <Globe size={20} />;
    }
};

const ProfilePage = () => {
    const { id } = useParams(); // Lấy ID từ URL
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get(`/profiles/${id}`); // API lấy profile public
                setProfile(res.data);
            } catch (err) {
                setError("Không tìm thấy hồ sơ hoặc đường dẫn không hợp lệ.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    // --- CHỨC NĂNG TẠO FILE VCF (LƯU DANH BẠ) ---
    const downloadVCard = () => {
        if (!profile) return;

        // Cấu trúc file vCard (.vcf)
        const vCardData = [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `FN:${profile.last_name} ${profile.first_name}`,
            `N:${profile.first_name};${profile.last_name};;;`,
            profile.company ? `ORG:${profile.company}` : '',
            profile.job_title ? `TITLE:${profile.job_title}` : '',
            profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : '',
            profile.email ? `EMAIL;TYPE=WORK:${profile.email}` : '',
            profile.website ? `URL:${profile.website}` : '',
            profile.address ? `ADR;TYPE=WORK:;;${profile.address};;;;` : '',
            'END:VCARD'
        ].filter(Boolean).join('\n');

        const blob = new Blob([vCardData], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${profile.first_name}_${profile.last_name}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 50, color: '#666' }}>Đang tải thông tin...</div>;
    if (error) return <div style={{ textAlign: 'center', padding: 50, color: '#e74c3c' }}>{error}</div>;
    if (!profile) return null;

    // Xác định theme (Mặc định là legend nếu không có)
    const themeClass = `theme-${profile.theme || 'legend'}`;
    const activeColor = profile.theme === 'corporate' ? '#2c3e50' : '#d4af37'; // Màu icon tùy theme

    return (
        <div className="profile-page-wrapper">
            <div className={`profile-card ${themeClass}`}>

                {/* HEADER */}
                <div className="profile-header-bg">
                    <div className="profile-avatar-container">
                        <img
                            src={profile.avatar_base64 || DEFAULT_AVATAR}
                            alt="Avatar"
                            className="profile-avatar-img"
                        />
                    </div>
                </div>

                {/* BODY */}
                <div className="profile-body">
                    <h1 className="profile-name">{profile.last_name} {profile.first_name}</h1>
                    <p className="profile-job">
                        {profile.job_title}
                        {profile.company && <span> @ {profile.company}</span>}
                    </p>

                    {/* NÚT LƯU */}
                    <button className="save-contact-btn" onClick={downloadVCard}>
                        <UserPlus size={20} /> Lưu Danh Bạ
                    </button>

                    {/* LIST THÔNG TIN */}
                    <div className="info-list">
                        {profile.phone && (
                            <a href={`tel:${profile.phone}`} className="info-item">
                                <div className="info-icon"><Phone size={18} /></div>
                                <div className="info-text"><small>Điện thoại</small><span>{profile.phone}</span></div>
                            </a>
                        )}

                        {profile.email && (
                            <a href={`mailto:${profile.email}`} className="info-item">
                                <div className="info-icon"><Mail size={18} /></div>
                                <div className="info-text"><small>Email</small><span>{profile.email}</span></div>
                            </a>
                        )}

                        {profile.website && (
                            <a href={ensureProtocol(profile.website)} target="_blank" rel="noreferrer" className="info-item">
                                <div className="info-icon"><Globe size={18} /></div>
                                <div className="info-text"><small>Website</small><span>{profile.website}</span></div>
                            </a>
                        )}

                        {profile.address && (
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(profile.address)}`} target="_blank" rel="noreferrer" className="info-item">
                                <div className="info-icon"><MapPin size={18} /></div>
                                <div className="info-text"><small>Địa chỉ</small><span>{profile.address}</span></div>
                            </a>
                        )}

                        {/* SOCIAL LINKS */}
                        {profile.links && Object.entries(profile.links).map(([key, url]) => {
                            if (!url) return null;
                            return (
                                <a key={key} href={ensureProtocol(url)} target="_blank" rel="noreferrer" className="info-item">
                                    <div className="info-icon">{getSocialIcon(key)}</div>
                                    <div className="info-text"><small>Mạng xã hội</small><span>{key.charAt(0).toUpperCase() + key.slice(1)}</span></div>
                                    <ArrowRight size={16} style={{ color: '#666' }} />
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="profile-footer">
                    Powered by LegendQR
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;