import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function StudentProfile() {
  const { studentSession, userType, appSettings } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(false);
  
  // Attendance State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [attendanceData, setAttendanceData] = useState([]);
  
  // Class Fund State
  const [fundData, setFundData] = useState([]);

  // Fetch Data
  useEffect(() => {
    if (userType === 'student' && studentSession?.id) {
      if (activeTab === 'attendance') {
        fetchAttendance();
      } else if (activeTab === 'fund') {
        fetchFunds();
      }
    }
  }, [activeTab, selectedMonth, studentSession]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = `${selectedMonth}-31`; 
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentSession.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
        
      if (error) throw error;
      setAttendanceData(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFunds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('class_funds')
        .select('*')
        .eq('student_id', studentSession.id)
        .eq('type', 'in')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setFundData(data || []);
    } catch (error) {
      console.error('Error fetching funds:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (userType !== 'student') {
    return <Navigate to="/dashboard" replace />;
  }

  // Attendance stats
  const attH = attendanceData.filter(d => d.status === 'H').length;
  const attS = attendanceData.filter(d => d.status === 'S').length;
  const attI = attendanceData.filter(d => d.status === 'I').length;
  const attA = attendanceData.filter(d => d.status === 'A').length;

  const totalPaid = fundData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const formatCurrency = (amount) => 'Rp ' + amount.toLocaleString('id-ID');
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Calendar generation logic
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; 
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); 
  
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null); 
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const attendanceMap = {};
  attendanceData.forEach(att => {
    const day = parseInt(att.date.split('-')[2], 10);
    attendanceMap[day] = att.status;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'H': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'S': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'I': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'A': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-surface text-on-surface';
    }
  };

  return (
    <div className="p-margin-mobile md:p-margin-desktop animate-fade-in-up max-w-4xl mx-auto">
      
      {/* Profil Header */}
      <div className="bg-surface border border-outline-variant rounded-2xl shadow-sm overflow-hidden mb-lg relative">
        <div className="h-32 bg-primary/10"></div>
        <div className="px-lg pb-lg relative">
          <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-12">
            
            {/* Foto 4x6 */}
            <div className="w-32 h-[192px] bg-surface rounded-xl border-4 border-surface shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {studentSession.photo_url ? (
                <img 
                  src={studentSession.photo_url} 
                  alt={studentSession.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23777587%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E";
                    e.target.className = "w-12 h-12 object-contain opacity-50";
                  }}
                />
              ) : (
                <span className="material-symbols-outlined text-[64px] text-outline">account_circle</span>
              )}
            </div>

            {/* Identitas */}
            <div className="flex-1 pb-2 mt-4 md:mt-0 text-center md:text-left">
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">{studentSession.name}</h1>
              <div className="flex flex-wrap gap-4 mt-2 justify-center md:justify-start">
                <p className="font-body-md text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px]">badge</span> {studentSession.nisn}
                </p>
                <p className="font-body-md text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[20px]">school</span> {appSettings?.className || 'Aplikasi Administrasi Kelas'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-outline-variant mb-6 overflow-x-auto custom-scrollbar">
        <button 
          className={`pb-3 px-2 font-title-lg text-title-lg transition-colors whitespace-nowrap border-b-2 ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          onClick={() => setActiveTab('attendance')}
        >
          Laporan Absensi
        </button>
        <button 
          className={`pb-3 px-2 font-title-lg text-title-lg transition-colors whitespace-nowrap border-b-2 ${activeTab === 'fund' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
          onClick={() => setActiveTab('fund')}
        >
          Laporan Kas
        </button>
      </div>

      {/* Konten Laporan Absensi */}
      {activeTab === 'attendance' && (
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-lg gap-3">
            <h2 className="font-headline-sm text-headline-sm text-on-surface hidden md:block">Kehadiran Bulanan</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all flex-1 sm:flex-none"
                value={selectedMonth.split('-')[1]}
                onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <input 
                type="number" 
                className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all w-24"
                value={selectedMonth.split('-')[0]}
                onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                placeholder="Tahun"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="font-headline-md text-headline-md text-emerald-600 mb-1">{attH}</span>
              <span className="font-label-md text-label-md text-emerald-600/80">Hadir</span>
            </div>
            <div className="bg-surface border border-blue-200 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="font-headline-md text-headline-md text-blue-600 mb-1">{attS}</span>
              <span className="font-label-md text-label-md text-blue-600/80">Sakit</span>
            </div>
            <div className="bg-surface border border-amber-200 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="font-headline-md text-headline-md text-amber-600 mb-1">{attI}</span>
              <span className="font-label-md text-label-md text-amber-600/80">Izin</span>
            </div>
            <div className="bg-surface border border-red-200 rounded-xl p-4 flex flex-col items-center justify-center">
              <span className="font-headline-md text-headline-md text-red-600 mb-1">{attA}</span>
              <span className="font-label-md text-label-md text-red-600/80">Alpa</span>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Kalender Kehadiran</h3>
            <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
                  <div key={idx} className="p-3 text-center font-label-md text-label-md text-on-surface-variant">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-outline-variant/30 p-px">
                {calendarDays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`min-h-[70px] md:min-h-[90px] p-1.5 md:p-2 transition-colors ${day ? getStatusColor(attendanceMap[day]) : 'bg-surface-container-lowest/50'}`}
                  >
                    {day && (
                      <div className="flex flex-col h-full relative">
                        <span className={`font-label-md text-right ${attendanceMap[day] ? 'font-bold' : ''}`}>{day}</span>
                        {attendanceMap[day] && (
                          <span className="mt-auto text-center font-label-sm block px-1 py-0.5 rounded-md bg-white/50 dark:bg-black/20 mt-1 shadow-sm">
                            {attendanceMap[day] === 'H' && 'Hadir'}
                            {attendanceMap[day] === 'S' && 'Sakit'}
                            {attendanceMap[day] === 'I' && 'Izin'}
                            {attendanceMap[day] === 'A' && 'Alpa'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konten Laporan Kas */}
      {activeTab === 'fund' && (
        <div className="animate-fade-in">
          <div className="bg-primary-container text-on-primary-container rounded-xl p-6 mb-lg flex flex-col items-center justify-center text-center">
            <span className="font-label-md text-label-md opacity-80 mb-2 uppercase tracking-wider">Total Kas Dibayar</span>
            <span className="font-headline-lg text-headline-lg font-bold">{formatCurrency(totalPaid)}</span>
          </div>

          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4">Riwayat Pembayaran</h2>
          <div className="bg-surface border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : fundData.length > 0 ? (
              <div className="flex flex-col">
                {fundData.map((record) => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 gap-2">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface">{record.description}</h3>
                      <p className="font-body-sm text-on-surface-variant">Periode {record.period} • {formatDate(record.date)}</p>
                    </div>
                    <div className="font-title-lg text-title-lg font-bold text-emerald-600">
                      +{formatCurrency(record.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">receipt_long</span>
                <p>Belum ada riwayat pembayaran kas.</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
