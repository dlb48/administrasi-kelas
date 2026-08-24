import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { appSettings, fetchSettings } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [className, setClassName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  
  const [classMessage, setClassMessage] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUser(user);
          setEmail(user.email);
        }

        // Load class settings from AuthContext
        setClassName(appSettings?.className || 'XII RPL 1');
        setSchoolName(appSettings?.schoolName || 'Class Admin');
      } catch (error) {
        console.error('Error fetching user:', error.message);
      } finally {
        setLoading(false);
      }
    }

    getProfile();
  }, [appSettings]);

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    setClassMessage('');
    
    if (!className.trim() || !schoolName.trim()) {
      setClassMessage('Nama Kelas dan Nama Sekolah tidak boleh kosong.');
      return;
    }

    const { error } = await supabase.from('settings').update({
      class_name: className,
      school_name: schoolName
    }).eq('id', 1);

    if (error) {
      setClassMessage('Gagal menyimpan identitas: ' + error.message);
    } else {
      await fetchSettings();
      setClassMessage('Identitas kelas berhasil disimpan! Memuat ulang tampilan...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    setAccountMessage('Pengaturan akun berhasil disimpan.');
  };

  const handleResetPassword = async () => {
    try {
      setAccountMessage('');
      setError('');
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setAccountMessage('Email reset password telah dikirim. Silakan cek kotak masuk Anda.');
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs mb-sm">
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Pengaturan</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Kelola identitas kelas dan akun administrator Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-start">
        {/* Identitas Kelas Form */}
        <div className="flex flex-col gap-lg">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
            <h2 className="font-title-lg text-title-lg font-bold text-on-surface mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">school</span>
              Identitas Kelas
            </h2>
            
            {classMessage && (
              <div className={`mb-md p-md rounded-md text-sm ${classMessage.includes('kosong') ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
                {classMessage}
              </div>
            )}

            <form onSubmit={handleUpdateClass} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Nama Sekolah / Instansi</label>
                <input 
                  type="text" 
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Nama Kelas</label>
                <input 
                  type="text" 
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Contoh: XII IPA 1"
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                />
              </div>

              <div className="flex justify-end mt-sm">
                <button type="submit" className="px-xl py-sm bg-primary text-on-primary rounded-full hover:bg-primary/90 font-medium transition-colors shadow-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Simpan Identitas
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Akun Administrator Form */}
        <div className="flex flex-col gap-lg">
          <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
            <h2 className="font-title-lg text-title-lg font-bold text-on-surface mb-md flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">manage_accounts</span>
              Akun Administrator
            </h2>
            
            {accountMessage && <div className="mb-md p-md bg-primary-container text-on-primary-container rounded-md text-sm">{accountMessage}</div>}
            {error && <div className="mb-md p-md bg-error-container text-on-error-container rounded-md text-sm">{error}</div>}

            <form onSubmit={handleUpdateAccount} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Alamat Email</label>
                <input 
                  type="email" 
                  value={email}
                  disabled
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface-variant/30 text-on-surface disabled:opacity-70 focus:outline-none"
                />
                <p className="text-xs text-on-surface-variant">Email tidak dapat diubah dari sini.</p>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-label-md text-label-md text-on-surface-variant">Peran (Role)</label>
                <input 
                  type="text" 
                  value="Administrator"
                  disabled
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface-variant/30 text-on-surface disabled:opacity-70 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center mt-md pt-md border-t border-outline-variant">
                <div>
                  <h3 className="font-label-md text-label-md font-bold text-on-surface">Ubah Password</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Kirim link reset ke email Anda.</p>
                </div>
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="px-md py-sm border border-outline text-primary rounded-full hover:bg-primary/5 transition-colors font-medium text-sm"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
