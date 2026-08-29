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
  
  const [startMonth, setStartMonth] = useState(7);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonthId, setStartMonthId] = useState(null);
  const [kasMessage, setKasMessage] = useState('');

  const [weeklyHoliday, setWeeklyHoliday] = useState('-1');
  const [weeklyHolidayId, setWeeklyHolidayId] = useState(null);
  const [eventHolidays, setEventHolidays] = useState([]);
  const [activityHolidays, setActivityHolidays] = useState([]);
  
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  
  const [newActivityStartDate, setNewActivityStartDate] = useState('');
  const [newActivityEndDate, setNewActivityEndDate] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [holidayMessage, setHolidayMessage] = useState('');

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

        const { data: settingData } = await supabase.from('class_funds').select('*').eq('type', 'setting').eq('period', 'awal').single();
        if (settingData) {
          setStartMonth(settingData.amount);
          setStartMonthId(settingData.id);
          if (settingData.date) {
            setStartYear(parseInt(settingData.date.split('-')[0], 10));
          }
        }

        const { data: holidaysData } = await supabase.from('holidays').select('*').order('date', { ascending: true });
        if (holidaysData) {
          const weekly = holidaysData.find(h => h.type === 'weekly');
          if (weekly) {
            setWeeklyHoliday(weekly.day_of_week.toString());
            setWeeklyHolidayId(weekly.id);
          }
          setEventHolidays(holidaysData.filter(h => h.type === 'event'));
          setActivityHolidays(holidaysData.filter(h => h.type === 'activity'));
        }
      } catch (error) {
        console.error('Error fetching data:', error.message);
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

  const handleUpdateKasSettings = async (e) => {
    e.preventDefault();
    setKasMessage('');
    try {
      const dateStr = `${startYear}-${startMonth.toString().padStart(2, '0')}-01`;
      if (startMonthId) {
        await supabase.from('class_funds').update({ amount: startMonth, date: dateStr }).eq('id', startMonthId);
      } else {
        const { data, error } = await supabase.from('class_funds').insert([{
          type: 'setting',
          description: 'Bulan Awal Kas',
          amount: startMonth,
          period: 'awal',
          date: dateStr
        }]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          setStartMonthId(data[0].id);
        }
      }
      setKasMessage('Pengaturan kas berhasil disimpan!');
    } catch (error) {
      setKasMessage('Gagal menyimpan pengaturan: ' + error.message);
    }
  };

  const handleUpdateWeeklyHoliday = async (e) => {
    e.preventDefault();
    setHolidayMessage('');
    try {
      if (weeklyHoliday === '-1') {
        if (weeklyHolidayId) {
          await supabase.from('holidays').delete().eq('id', weeklyHolidayId);
          setWeeklyHolidayId(null);
        }
      } else {
        if (weeklyHolidayId) {
          await supabase.from('holidays').update({ day_of_week: parseInt(weeklyHoliday) }).eq('id', weeklyHolidayId);
        } else {
          const { data, error } = await supabase.from('holidays').insert([{ type: 'weekly', day_of_week: parseInt(weeklyHoliday) }]).select();
          if (error) throw error;
          if (data && data.length > 0) setWeeklyHolidayId(data[0].id);
        }
      }
      setHolidayMessage('Libur mingguan berhasil disimpan!');
    } catch (error) {
      setHolidayMessage('Gagal menyimpan libur mingguan: ' + error.message);
    }
  };

  const handleAddEventHoliday = async (e) => {
    e.preventDefault();
    if (!newEventDate || !newEventDesc.trim()) return;
    setHolidayMessage('');
    
    try {
      const { data, error } = await supabase.from('holidays').insert([{
        type: 'event',
        date: newEventDate,
        description: newEventDesc
      }]).select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEventHolidays([...eventHolidays, data[0]].sort((a, b) => new Date(a.date) - new Date(b.date)));
        setNewEventDate('');
        setNewEventDesc('');
      }
      setHolidayMessage('Libur event berhasil ditambahkan!');
    } catch (error) {
      setHolidayMessage('Gagal menambah libur event: ' + error.message);
    }
  };

  const handleAddActivityHoliday = async (e) => {
    e.preventDefault();
    if (!newActivityStartDate || !newActivityDesc.trim()) return;
    setHolidayMessage('');
    
    try {
      let datesToInsert = [];
      const start = new Date(newActivityStartDate);
      const end = newActivityEndDate ? new Date(newActivityEndDate) : new Date(newActivityStartDate);
      
      if (end < start) {
        setHolidayMessage('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
        return;
      }

      let current = new Date(start);
      while (current <= end) {
        datesToInsert.push({
          type: 'activity',
          date: current.toISOString().split('T')[0],
          description: newActivityDesc
        });
        current.setDate(current.getDate() + 1);
      }

      const { data, error } = await supabase.from('holidays').insert(datesToInsert).select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setActivityHolidays([...activityHolidays, ...data].sort((a, b) => new Date(a.date) - new Date(b.date)));
        setNewActivityStartDate('');
        setNewActivityEndDate('');
        setNewActivityDesc('');
      }
      setHolidayMessage('Kegiatan sekolah berhasil ditambahkan!');
    } catch (error) {
      setHolidayMessage('Gagal menambah kegiatan sekolah: ' + error.message);
    }
  };

  const handleDeleteEventHoliday = async (id) => {
    if (!window.confirm('Yakin ingin menghapus libur event ini?')) return;
    setHolidayMessage('');
    try {
      const { error } = await supabase.from('holidays').delete().eq('id', id);
      if (error) throw error;
      setEventHolidays(eventHolidays.filter(h => h.id !== id));
      setHolidayMessage('Libur event dihapus.');
    } catch (error) {
      setHolidayMessage('Gagal menghapus libur event: ' + error.message);
    }
  };

  const handleDeleteActivityGroup = async (ids) => {
    if (!window.confirm('Yakin ingin menghapus kegiatan ini?')) return;
    setHolidayMessage('');
    try {
      const { error } = await supabase.from('holidays').delete().in('id', ids);
      if (error) throw error;
      setActivityHolidays(activityHolidays.filter(h => !ids.includes(h.id)));
      setHolidayMessage('Kegiatan sekolah dihapus.');
    } catch (error) {
      setHolidayMessage('Gagal menghapus kegiatan: ' + error.message);
    }
  };

  const groupEvents = (events) => {
    const groups = [];
    let currentGroup = null;

    events.forEach(e => {
      if (!currentGroup || currentGroup.description !== e.description) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { description: e.description, start: e.date, end: e.date, ids: [e.id] };
      } else {
        const lastDate = new Date(currentGroup.end);
        lastDate.setDate(lastDate.getDate() + 1);
        const expectedNext = lastDate.toISOString().split('T')[0];
        if (e.date === expectedNext) {
          currentGroup.end = e.date;
          currentGroup.ids.push(e.id);
        } else {
          groups.push(currentGroup);
          currentGroup = { description: e.description, start: e.date, end: e.date, ids: [e.id] };
        }
      }
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
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

      {/* Pengaturan Kas Form */}
      <div className="flex flex-col gap-lg">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-lg text-title-lg font-bold text-on-surface mb-md flex items-center gap-2">
            <span className="material-symbols-outlined text-success">payments</span>
            Pengaturan Uang Kas
          </h2>
          
          {kasMessage && (
            <div className={`mb-md p-md rounded-md text-sm ${kasMessage.includes('Gagal') ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
              {kasMessage}
            </div>
          )}

          <form onSubmit={handleUpdateKasSettings} className="flex flex-col gap-md">
            <div className="flex flex-col gap-xs">
              <label className="font-label-md text-label-md text-on-surface-variant">Periode Awal Kas Berjalan</label>
              <div className="flex gap-2">
                <select 
                  value={startMonth}
                  onChange={(e) => setStartMonth(parseInt(e.target.value, 10))}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors w-1/2"
                >
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select 
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors w-1/2"
                >
                  {[...Array(10)].map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i; // from 2 years ago up to 7 years in future
                    return <option key={y} value={y}>{y}</option>
                  })}
                </select>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">Bulan dan tahun dimulainya perhitungan target uang kas secara kumulatif.</p>
            </div>

            <div className="flex justify-start mt-sm">
              <button type="submit" className="px-xl py-sm bg-primary text-on-primary rounded-full hover:bg-primary/90 font-medium transition-colors shadow-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">save</span>
                Simpan Pengaturan
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Pengaturan Libur */}
      <div className="flex flex-col gap-lg mb-xl">
        <div className="bg-surface border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="font-title-lg text-title-lg font-bold text-on-surface mb-md flex items-center gap-2">
            <span className="material-symbols-outlined text-error">event_busy</span>
            Pengaturan Hari Libur
          </h2>
          
          {holidayMessage && (
            <div className={`mb-md p-md rounded-md text-sm ${holidayMessage.includes('Gagal') ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container'}`}>
              {holidayMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {/* Libur Mingguan */}
            <div className="border border-outline-variant/50 rounded-lg p-md bg-surface-container-lowest">
              <h3 className="font-title-md text-title-md font-bold text-on-surface mb-sm">Libur Mingguan (Rutin)</h3>
              <form onSubmit={handleUpdateWeeklyHoliday} className="flex flex-col gap-sm">
                <select 
                  value={weeklyHoliday}
                  onChange={(e) => setWeeklyHoliday(e.target.value)}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full"
                >
                  <option value="-1">Tidak Ada Libur Mingguan</option>
                  <option value="0">Minggu</option>
                  <option value="1">Senin</option>
                  <option value="2">Selasa</option>
                  <option value="3">Rabu</option>
                  <option value="4">Kamis</option>
                  <option value="5">Jumat</option>
                  <option value="6">Sabtu</option>
                </select>
                <button type="submit" className="px-md py-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 font-medium transition-colors mt-2 text-sm">
                  Simpan Libur Mingguan
                </button>
              </form>
            </div>

            {/* Libur Event */}
            <div className="border border-outline-variant/50 rounded-lg p-md bg-surface-container-lowest">
              <h3 className="font-title-md text-title-md font-bold text-on-surface mb-sm">Libur Event (Nasional/Insidental)</h3>
              <form onSubmit={handleAddEventHoliday} className="flex flex-col gap-sm mb-md">
                <input 
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full text-sm"
                  required
                />
                <input 
                  type="text"
                  placeholder="Keterangan (misal: Hari Kemerdekaan)"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full text-sm"
                  required
                />
                <button type="submit" className="px-md py-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 font-medium transition-colors mt-2 text-sm flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Tambah Libur
                </button>
              </form>

              <div className="max-h-[250px] overflow-y-auto divide-y divide-outline-variant custom-scrollbar pr-2">
                {eventHolidays.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic py-2 text-center">Belum ada libur event.</p>
                ) : (
                  eventHolidays.map(h => (
                    <div key={h.id} className="py-2 flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">{new Date(h.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                        <span className="text-xs text-on-surface-variant">{h.description}</span>
                      </div>
                      <button type="button" onClick={() => handleDeleteEventHoliday(h.id)} className="text-outline hover:text-error">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Kegiatan Sekolah */}
            <div className="border border-outline-variant/50 rounded-lg p-md bg-surface-container-lowest">
              <h3 className="font-title-md text-title-md font-bold text-on-surface mb-sm">Kegiatan Sekolah (UAS/UTS dll)</h3>
              <form onSubmit={handleAddActivityHoliday} className="flex flex-col gap-sm mb-md">
                <div className="flex gap-2">
                  <div className="flex flex-col w-1/2">
                    <label className="text-xs text-on-surface-variant mb-1">Mulai</label>
                    <input 
                      type="date"
                      value={newActivityStartDate}
                      onChange={(e) => setNewActivityStartDate(e.target.value)}
                      className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full text-sm"
                      required
                    />
                  </div>
                  <div className="flex flex-col w-1/2">
                    <label className="text-xs text-on-surface-variant mb-1">Selesai (Opsional)</label>
                    <input 
                      type="date"
                      value={newActivityEndDate}
                      onChange={(e) => setNewActivityEndDate(e.target.value)}
                      className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full text-sm"
                    />
                  </div>
                </div>
                <input 
                  type="text"
                  placeholder="Keterangan (misal: UAS Semester 1)"
                  value={newActivityDesc}
                  onChange={(e) => setNewActivityDesc(e.target.value)}
                  className="px-md py-sm rounded-md border border-outline-variant bg-surface text-on-surface focus:border-primary focus:outline-none w-full text-sm mt-1"
                  required
                />
                <button type="submit" className="px-md py-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20 font-medium transition-colors mt-2 text-sm flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">add</span> Tambah Kegiatan
                </button>
              </form>

              <div className="max-h-[250px] overflow-y-auto divide-y divide-outline-variant custom-scrollbar pr-2">
                {activityHolidays.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic py-2 text-center">Belum ada kegiatan sekolah.</p>
                ) : (
                  groupEvents(activityHolidays).map((g, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">
                          {g.start === g.end 
                            ? new Date(g.start).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})
                            : `${new Date(g.start).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} - ${new Date(g.end).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}`
                          }
                        </span>
                        <span className="text-xs text-on-surface-variant text-tertiary">{g.description}</span>
                      </div>
                      <button type="button" onClick={() => handleDeleteActivityGroup(g.ids)} className="text-outline hover:text-error">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
