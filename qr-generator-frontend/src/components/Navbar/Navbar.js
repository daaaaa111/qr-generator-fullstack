import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './Navbar.css';
import logoLegend from '../../assets/logo.png'; 
import { PlusCircle, User, Grid, LogOut, LogIn, Clock, Link, Type } from 'react-feather';

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Kiểm tra xem có phải admin không
    const isAdmin = user?.role === 'admin'; 

    return (
        <nav className="navbar">
            <div className="nav-container">
                <NavLink to="/" className="nav-brand">
                    <img src={logoLegend} alt="Legend" className="brand-logo" />
                </NavLink>

                {user && (
                    <ul className="nav-menu">
                        <li className="nav-item">
                            <NavLink to="/" className={({ isActive }) => "nav-links" + (isActive ? " activated" : "")}>
                                <PlusCircle size={16}/> Tạo Mã QR
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/vcard" className={({ isActive }) => "nav-links" + (isActive ? " activated" : "")}>
                                <User size={16}/> vCard
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink to="/history" className={({ isActive }) => "nav-links" + (isActive ? " activated" : "")}>
                                <Clock size={16}/> Lịch sử
                            </NavLink>
                        </li>

                        {isAdmin && (
                            <li className="nav-item">
                                <NavLink to="/admin" className={({ isActive }) => "nav-links" + (isActive ? " activated" : "")}>
                                    <Grid size={16}/> Quản trị Hệ thống
                                </NavLink>
                            </li>
                        )}
                    </ul>
                )}

                <div className="nav-user-info">
                    {user ? (
                        <>
                            <div className="user-profile">
                                <img src={user.profile_picture || 'https://via.placeholder.com/40'} alt="Avt" className="nav-avatar" />
                                <div className="user-text">
                                    <span className="greeting">Xin chào,</span>
                                    <span className="username">{user.display_name}</span>
                                </div>
                            </div>
                            <button onClick={handleLogout} className="logout-btn"><LogOut size={18}/></button>
                        </>
                    ) : (
                        <NavLink to="/login" className="login-btn"><LogIn size={18}/> Đăng nhập</NavLink>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;