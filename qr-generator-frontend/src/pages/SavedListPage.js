// src/pages/SavedListPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

function SavedListPage() {
    const [savedCodes, setSavedCodes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredSavedCodes, setFilteredSavedCodes] = useState([]);

    const fetchSavedCodes = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/qrs');
            setSavedCodes(response.data);
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đã lưu:', error);
        }
    };

    useEffect(() => {
        fetchSavedCodes();
    }, []);

    useEffect(() => {
        const results = savedCodes.filter(code =>
            code.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            code.custom_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredSavedCodes(results);
    }, [searchTerm, savedCodes]);

    return (
        <div className="saved-section">
            <div className="saved-section-header">
                <h1>Danh sách mã đã lưu trong Database ({filteredSavedCodes.length} mã)</h1>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc mã..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Tên Chương Trình</th>
                            <th>Mã EAN-13</th>
                            <th>Mã QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSavedCodes.map((qr, index) => (
                            <tr key={qr.id}>
                                <td>{index + 1}</td>
                                <td>{qr.program_name}</td>
                                <td><strong>{qr.custom_code}</strong></td>
                                <td><QRCodeSVG value={qr.custom_code} size={80} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default SavedListPage;