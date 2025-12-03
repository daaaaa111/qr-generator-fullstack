import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Navbar from './components/Navbar/Navbar';

// Import Pages
import LoginPage from './pages/LoginPage/LoginPage';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import ManagementPage from './pages/ManagementPage';
import VCardPage from './pages/VCardPage';
import LinkPage from './pages/LinkPage';
import TextPage from './pages/TextPage';
import AuthCallbackPage from './pages/AuthCallbackPage'; // Bỏ comment nếu bạn có file này
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route path="/profile/:id" element={<ProfilePage />} />

            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/vcard" element={<ProtectedRoute><VCardPage /></ProtectedRoute>} />
            <Route path="/link" element={<ProtectedRoute><LinkPage /></ProtectedRoute>} />
            <Route path="/text" element={<ProtectedRoute><TextPage /></ProtectedRoute>} />

            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <ManagementPage />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;