import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { userType, studentSession, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);

  const [className, setClassName] = useState('XII RPL 1');
  const [schoolName, setSchoolName] = useState('Class Admin');

  useEffect(() => {
    setClassName(localStorage.getItem('className') || 'XII RPL 1');
    setSchoolName(localStorage.getItem('schoolName') || 'Class Admin');
  }, []);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    setIsSubmittingPassword(true);
    const { error } = await supabase
      .from('students')
      .update({ password: newPassword })
      .eq('id', studentSession.id);
      
    setIsSubmittingPassword(false);

    if (error) {
      setToastMessage(`Gagal merubah password: ${error.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      setShowPasswordModal(false);
      setNewPassword('');
      setToastMessage('Password berhasil diubah!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Utility to check if student has access to a menu
  const hasAccess = (menuId) => {
    if (userType === 'admin') return true;
    if (userType === 'student') {
      if (menuId === 'dashboard') return true; // Always allow dashboard
      const roles = studentSession?.role ? studentSession.role.split(',') : [];
      return roles.includes(menuId);
    }
    return false;
  };

  const getLinkClass = (path) => {
    const isActive = location.pathname.startsWith(path);
    return isActive
      ? "flex items-center px-lg py-md gap-md text-primary dark:text-inverse-primary border-l-4 border-primary dark:border-inverse-primary font-bold bg-primary-container/10 scale-[0.99] duration-150"
      : "flex items-center px-lg py-md gap-md text-on-surface-variant dark:text-surface-variant font-medium border-l-4 border-transparent hover:bg-surface-container dark:hover:bg-surface-container-highest transition-colors";
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex font-body-md">
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* SideNavBar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-[280px] z-50 flex flex-col border-r border-outline-variant dark:border-outline bg-surface dark:bg-inverse-surface py-lg flex-shrink-0 transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="px-lg mb-xl flex justify-between items-start">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-primary dark:text-inverse-primary">{className}</h1>
            <p className="font-label-md text-label-md text-on-surface-variant">
              {userType === 'student' ? studentSession?.name : schoolName}
            </p>
          </div>
          <button 
            className="md:hidden p-1 text-on-surface-variant hover:bg-surface-variant/50 rounded-full flex items-center justify-center"
            onClick={() => setShowMobileMenu(false)}
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="close">close</span>
          </button>
        </div>
        
        <nav className="flex-1 flex flex-col gap-sm">
          {hasAccess('dashboard') && (
            <Link to="/dashboard" className={getLinkClass('/dashboard')}>
              <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
              <span className="font-label-md text-label-md">Dashboard</span>
            </Link>
          )}
          {hasAccess('students') && (
            <Link to="/students" className={getLinkClass('/students')}>
              <span className="material-symbols-outlined" data-icon="group">group</span>
              <span className="font-label-md text-label-md">Students</span>
            </Link>
          )}
          {hasAccess('attendance') && (
            <Link to="/attendance" className={getLinkClass('/attendance')}>
              <span className="material-symbols-outlined" data-icon="fact_check">fact_check</span>
              <span className="font-label-md text-label-md">Attendance</span>
            </Link>
          )}
          {hasAccess('class_fund') && (
            <Link to="/class-fund" className={getLinkClass('/class-fund')}>
              <span className="material-symbols-outlined" data-icon="payments">payments</span>
              <span className="font-label-md text-label-md">Class Fund</span>
            </Link>
          )}
          {hasAccess('reports') && (
            <Link to="/reports" className={getLinkClass('/reports')}>
              <span className="material-symbols-outlined" data-icon="assessment">assessment</span>
              <span className="font-label-md text-label-md">Reports</span>
            </Link>
          )}
        </nav>

        {userType === 'admin' && (
          <div className="mt-auto px-lg mb-md">
            <Link to="/settings" className={getLinkClass('/settings')}>
              <span className="material-symbols-outlined" data-icon="settings">settings</span>
              <span className="font-label-md text-label-md">Pengaturan</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopNavBar */}
        <header className="full-width sticky top-0 z-30 bg-surface/80 dark:bg-inverse-surface/80 border-b border-outline-variant dark:border-outline backdrop-blur-md shadow-sm">
          <div className="flex justify-between items-center px-lg h-[64px] w-full">
            <div className="flex items-center gap-2">
              <button 
                className="md:hidden p-sm -ml-2 text-on-surface-variant dark:text-surface-variant hover:bg-surface-variant/50 dark:hover:bg-inverse-surface/50 rounded-full flex items-center justify-center"
                onClick={() => setShowMobileMenu(true)}
              >
                <span className="material-symbols-outlined" data-icon="menu">menu</span>
              </button>
              <div className="font-title-lg text-title-lg font-bold text-on-surface dark:text-inverse-on-surface line-clamp-1">
                  {userType === 'student' ? studentSession?.name : schoolName}
              </div>
            </div>
            
            <div className="flex items-center gap-md">

              <div className="relative" ref={dropdownRef}>
                <button 
                  className="w-10 h-10 rounded-full bg-surface-variant dark:bg-inverse-surface-variant flex items-center justify-center text-on-surface-variant dark:text-inverse-on-surface-variant hover:bg-outline-variant/50 dark:hover:bg-outline/50 transition-colors border-2 border-transparent hover:border-primary/20 overflow-hidden"
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                >
                  {userType === 'student' && studentSession?.photo_url && !imgError ? (
                    <img 
                      src={studentSession.photo_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl">account_circle</span>
                  )}
                </button>
                
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-surface dark:bg-inverse-surface rounded-md shadow-lg py-1 border border-outline-variant dark:border-outline z-50">
                    {userType === 'admin' && (
                      <>
                        <button 
                          className="w-full text-left px-4 py-2 text-sm text-on-surface dark:text-inverse-on-surface hover:bg-surface-variant/50 dark:hover:bg-inverse-surface-variant/50 flex items-center gap-2 whitespace-nowrap"
                          onClick={() => {
                            setShowSettingsDropdown(false);
                            navigate('/settings');
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]" data-icon="manage_accounts">manage_accounts</span>
                          Account Settings
                        </button>
                        <hr className="my-1 border-outline-variant dark:border-outline" />
                      </>
                    )}
                    {userType === 'student' && (
                      <>
                        <button 
                          className="w-full text-left px-4 py-2 text-sm text-on-surface dark:text-inverse-on-surface hover:bg-surface-variant/50 dark:hover:bg-inverse-surface-variant/50 flex items-center gap-2 whitespace-nowrap"
                          onClick={() => {
                            setShowSettingsDropdown(false);
                            navigate('/profile');
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]" data-icon="person">person</span>
                          Profil Saya
                        </button>
                        <hr className="my-1 border-outline-variant dark:border-outline" />
                        <button 
                          className="w-full text-left px-4 py-2 text-sm text-on-surface dark:text-inverse-on-surface hover:bg-surface-variant/50 dark:hover:bg-inverse-surface-variant/50 flex items-center gap-2 whitespace-nowrap"
                          onClick={() => {
                            setShowSettingsDropdown(false);
                            setShowPasswordModal(true);
                          }}
                        >
                          <span className="material-symbols-outlined text-[20px]" data-icon="key">key</span>
                          Ganti Password
                        </button>
                        <hr className="my-1 border-outline-variant dark:border-outline" />
                      </>
                    )}
                    <button 
                      className="w-full text-left px-4 py-2 text-sm text-error hover:bg-error/10 dark:hover:bg-error/20 flex items-center gap-2 transition-colors"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        handleLogout();
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]" data-icon="logout">logout</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop overflow-y-auto max-w-max-width mx-auto w-full flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          
          {/* Footer */}
          <footer className="mt-8 pt-6 pb-2 text-center border-t border-outline-variant/30">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Administrasi Kelas v2.0 Copyright &copy; 2026 Guru TKJ, All Rights Reserved
            </p>
          </footer>
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-margin-mobile z-50">
          <div className="bg-surface dark:bg-inverse-surface rounded-xl shadow-lg w-full max-w-[448px] overflow-hidden animate-fade-in-up">
            <div className="p-lg md:p-xl">
              <h2 className="font-title-lg text-title-lg font-bold text-on-surface dark:text-inverse-on-surface mb-2">Ganti Password Login</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-md">Masukkan password baru Anda di bawah ini.</p>
              
              <form onSubmit={handlePasswordChange}>
                <div className="space-y-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface dark:text-inverse-on-surface mb-1.5">Password Baru</label>
                    <input 
                      type="text" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSubmittingPassword}
                      className="w-full bg-surface-container-lowest dark:bg-inverse-surface border border-outline-variant dark:border-outline rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface dark:text-inverse-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all h-12"
                      placeholder="Masukkan password baru..."
                    />
                  </div>
                </div>

                <div className="mt-xl flex gap-3 justify-end">
                  <button 
                    type="button" 
                    disabled={isSubmittingPassword}
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                    }}
                    className="px-4 py-2.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant/50 transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingPassword || !newPassword.trim()}
                    className="px-6 py-2.5 rounded-lg font-label-md text-label-md bg-primary hover:bg-on-primary-fixed-variant text-on-primary transition-colors disabled:opacity-50"
                  >
                    {isSubmittingPassword ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div 
        className={`fixed bottom-margin-mobile left-1/2 -translate-x-1/2 px-lg py-md rounded-lg shadow-lg flex items-center gap-sm transform transition-all duration-300 z-50 ${toastMessage.includes('Gagal') ? 'bg-error text-on-error' : 'bg-inverse-surface text-inverse-on-surface'} ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'
        }`}
      >
        <span className="material-symbols-outlined filled-icon" data-icon={toastMessage.includes('Gagal') ? 'error' : 'check_circle'}>
          {toastMessage.includes('Gagal') ? 'error' : 'check_circle'}
        </span>
        <span className="font-body-md text-body-md">{toastMessage}</span>
      </div>
    </div>
  );
}
