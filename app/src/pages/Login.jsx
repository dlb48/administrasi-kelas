import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { loginStudent, appSettings } = useAuth();
  
  const className = appSettings?.className || 'XII RPL 1';
  const schoolName = appSettings?.schoolName || 'Aplikasi Administrasi Kelas';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // First, try to login as Siswa (Student)
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('nisn', username)
      .eq('password', password)
      .maybeSingle();

    if (studentData) {
      // Login Siswa Success
      setIsLoading(false);
      setIsSuccess(true);
      setToastMessage('Login Siswa berhasil. Mengalihkan...');
      setShowToast(true);
      loginStudent(studentData);
      setTimeout(() => {
        setShowToast(false);
        navigate('/dashboard');
      }, 1500);
      return;
    }

    // If Siswa login fails, try Admin login
    const formattedEmail = username.includes('@') ? username : `${username}@kelas.com`;
    const { error: adminError } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    setIsLoading(false);

    if (adminError) {
      setIsSuccess(false);
      setToastMessage('Username/NISN atau Password salah.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else {
      setIsSuccess(true);
      setToastMessage('Login Admin berhasil. Mengalihkan...');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/dashboard');
      }, 1500);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center relative overflow-hidden font-body-md text-on-background">
      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[448px] px-margin-mobile md:px-0">
        {/* Login Card */}
        <div className="bg-surface/95 backdrop-blur-xl border border-outline-variant rounded-xl p-lg md:p-xl shadow-[0_20px_25px_-5px_rgb(0,0,0,0.1)]">
          {/* Header */}
          <div className="text-center mb-xl">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-md shadow-sm transition-colors bg-primary-container text-on-primary-container">
              <span className="material-symbols-outlined text-4xl filled-icon" data-icon="school">
                school
              </span>
            </div>
            <h1 className="font-headline-md text-headline-md text-on-surface mb-xs">{className}</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{schoolName}</p>
          </div>
          


          {/* Form */}
          <form className="space-y-md" onSubmit={handleLogin}>
            <div className="space-y-sm">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="username">
                Username / NISN
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" data-icon="person">person</span>
                <input 
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body-md text-body-md h-12" 
                  id="username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NISN" 
                  required 
                  type="text" 
                />
              </div>
            </div>
            
            <div className="space-y-sm">
              <label className="block font-label-md text-label-md text-on-surface" htmlFor="password">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" data-icon="lock">lock</span>
                <input 
                  className="w-full bg-surface border border-outline-variant rounded-lg pl-10 pr-10 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow font-body-md text-body-md h-12" 
                  id="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password" 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                />
                <button 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors" 
                  onClick={() => setShowPassword(!showPassword)} 
                  type="button"
                >
                  <span className="material-symbols-outlined" data-icon={showPassword ? "visibility_off" : "visibility"}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
            
            <div className="pt-sm">
              <button 
                className="w-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-title-lg text-title-lg rounded-lg h-12 flex items-center justify-center transition-colors shadow-sm disabled:opacity-50" 
                type="submit"
                disabled={isLoading}
              >
                  {isLoading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>
          
          {/* Footer Link */}
          <div className="mt-lg text-center">
            <a className="font-body-sm text-body-sm text-primary hover:text-on-primary-fixed-variant transition-colors" href="#">
                Lupa password? Hubungi Admin
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center pb-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant/70">
            Administrasi Kelas v2.1.1 Copyright &copy; 2026 Guru TKJ, All Rights Reserved
          </p>
        </footer>
      </main>

      {/* Toast Notification */}
      <div 
        className={`fixed bottom-margin-mobile left-1/2 -translate-x-1/2 px-lg py-md rounded-lg shadow-[0_20px_25px_-5px_rgb(0,0,0,0.1)] flex items-center gap-sm transform transition-all duration-300 z-50 ${isSuccess ? 'bg-inverse-surface text-inverse-on-surface' : 'bg-error text-on-error'} ${
          showToast ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0'
        }`}
      >
        <span className="material-symbols-outlined filled-icon" data-icon={isSuccess ? "check_circle" : "error"}>
          {isSuccess ? "check_circle" : "error"}
        </span>
        <span className="font-body-md text-body-md">{toastMessage}</span>
      </div>
    </div>
  );
}
