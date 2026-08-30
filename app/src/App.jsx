import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import ClassFund from './pages/ClassFund';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import StudentProfile from './pages/StudentProfile';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-[400px] w-full">
          <svg className="w-24 h-24 text-red-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"></path>
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Tidak Ada Koneksi</h1>
          <p className="text-gray-600 mb-8">Aplikasi ini membutuhkan koneksi internet. Silakan periksa jaringan WiFi atau data seluler Anda dan coba lagi.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-semibold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="students" element={<Students />} />
              <Route path="class-fund" element={<ClassFund />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
