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

  // Holiday State
  const [weeklyHoliday, setWeeklyHoliday] = useState(null);
  const [eventHolidays, setEventHolidays] = useState([]);
  const [activityHolidays, setActivityHolidays] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase.from('holidays').select('*');
      if (error) throw error;
      if (data) {
        const weekly = data.find(h => h.type === 'weekly');
        if (weekly) setWeeklyHoliday(weekly.day_of_week);
        setEventHolidays(data.filter(h => h.type === 'event'));
        setActivityHolidays(data.filter(h => h.type === 'activity'));
      }
    } catch (error) {
      console.error('Error fetching holidays:', error.message);
    }
  };

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
  const attendanceMap = {};
  attendanceData.forEach(att => {
    const day = parseInt(att.date.split('-')[2], 10);
    attendanceMap[day] = att.status;
  });

  const prevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const renderCalendar = () => {
    if (!selectedMonth) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    
    // Day 0 is Sunday, 1 is Monday. We want Monday=0
    let firstDay = new Date(year, month - 1, 1).getDay();
    let startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const grid = [];
    // Empty prefix cells
    for (let i = 0; i < startDay; i++) {
      grid.push(<div key={`empty-start-${i}`} className="aspect-square rounded-md flex items-center justify-center font-body-md bg-surface-container-lowest opacity-40 border border-outline-variant/30" />);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const d = new Date(year, month - 1, i);
      const dayOfWeek = d.getDay().toString();
      
      const eventHol = eventHolidays.find(h => h.date === dateStr);
      const actHol = activityHolidays.find(h => h.date === dateStr);
      const isWeeklyHol = (weeklyHoliday !== null && weeklyHoliday.toString() === dayOfWeek);
      
      const status = attendanceMap[i];
      let bgClass = "hover:bg-surface-container-lowest border-outline-variant border";
      let holidayDesc = null;
      
      if (eventHol) {
        bgClass = "bg-error/10 text-error border-error/30 dark:bg-error/20 dark:text-error-container shadow-sm";
        holidayDesc = eventHol.description;
      } else if (actHol) {
        bgClass = "bg-tertiary/10 text-tertiary border-tertiary/30 dark:bg-tertiary/20 dark:text-tertiary-container shadow-sm";
        holidayDesc = actHol.description;
      } else if (isWeeklyHol) {
        bgClass = "bg-error/10 text-error border-error/30 dark:bg-error/20 dark:text-error-container shadow-sm";
      } else {
        if (status === 'H') bgClass = "bg-emerald-100/80 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700 shadow-sm";
        else if (status === 'S') bgClass = "bg-blue-100/80 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700 shadow-sm";
        else if (status === 'I') bgClass = "bg-amber-100/80 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700 shadow-sm";
        else if (status === 'A') bgClass = "bg-red-100/80 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700 shadow-sm";
      }

      grid.push(
        <div key={`day-${i}`} className={`aspect-square rounded-md flex flex-col items-center justify-center transition-all ${bgClass} relative overflow-hidden p-0.5`}>
          <span className={`font-title-md ${status || holidayDesc || isWeeklyHol ? 'text-[12px] sm:text-[14px]' : 'text-sm'}`}>{i}</span>
          {status && !holidayDesc && !isWeeklyHol && <span className="font-label-sm text-[10px] font-bold">{status}</span>}
          {holidayDesc && (
            <span className="text-[7px] sm:text-[9px] leading-tight px-0.5 text-center font-medium opacity-90 line-clamp-2">{holidayDesc}</span>
          )}
        </div>
      );
    }
    
    return grid;
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
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-lg hidden md:block">Kehadiran Bulanan</h2>

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
            <div className="bg-surface border border-outline-variant rounded-xl p-md sm:p-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <div className="text-center font-title-lg text-title-lg text-on-surface">
                  {new Date(selectedMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={nextMonth} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-md">
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Sen</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Sel</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Rab</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Kam</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Jum</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Sab</div>
                <div className="font-label-md text-label-md text-on-surface-variant py-2">Min</div>
                {renderCalendar()}
              </div>
              
              {(() => {
                const [yearStr, monthStr] = selectedMonth.split('-');
                
                const groupHolidays = (holidays) => {
                  const currentMonthHolidays = holidays.filter(h => h.date.startsWith(`${yearStr}-${monthStr}`));
                  const groups = [];
                  let currentGroup = null;
                  
                  [...currentMonthHolidays].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(e => {
                    if (!currentGroup || currentGroup.description !== e.description) {
                      if (currentGroup) groups.push(currentGroup);
                      currentGroup = { description: e.description, start: e.date, end: e.date };
                    } else {
                      const lastDate = new Date(currentGroup.end);
                      lastDate.setDate(lastDate.getDate() + 1);
                      if (e.date === lastDate.toISOString().split('T')[0]) {
                        currentGroup.end = e.date;
                      } else {
                        groups.push(currentGroup);
                        currentGroup = { description: e.description, start: e.date, end: e.date };
                      }
                    }
                  });
                  if (currentGroup) groups.push(currentGroup);
                  return groups;
                };

                const eventGroups = groupHolidays(eventHolidays);
                const activityGroups = groupHolidays(activityHolidays);

                if (eventGroups.length === 0 && activityGroups.length === 0) return null;

                return (
                  <div className="mt-4 border-t border-outline-variant pt-4 flex flex-col gap-4">
                    {eventGroups.length > 0 && (
                      <div>
                        <ul className="grid grid-cols-[auto_auto_auto_1fr] gap-x-2 gap-y-1.5 pl-1 items-start">
                          {eventGroups.map((g, idx) => {
                             const startD = new Date(g.start);
                             const endD = new Date(g.end);
                             const dateText = g.start === g.end 
                               ? `${startD.getDate()} ${startD.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
                               : `${startD.getDate()}-${endD.getDate()} ${startD.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
                               
                             return (
                               <div key={idx} className="contents text-[10px] sm:text-xs text-on-surface-variant">
                                 <span className="w-1.5 h-1.5 rounded-full bg-error mt-1.5"></span>
                                 <span className="font-medium text-error whitespace-nowrap">{dateText}</span>
                                 <span>-</span>
                                 <span>{g.description}</span>
                               </div>
                             );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {activityGroups.length > 0 && (
                      <div>
                        <ul className="grid grid-cols-[auto_auto_auto_1fr] gap-x-2 gap-y-1.5 pl-1 items-start">
                          {activityGroups.map((g, idx) => {
                             const startD = new Date(g.start);
                             const endD = new Date(g.end);
                             const dateText = g.start === g.end 
                               ? `${startD.getDate()} ${startD.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
                               : `${startD.getDate()}-${endD.getDate()} ${startD.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
                               
                             return (
                               <div key={idx} className="contents text-[10px] sm:text-xs text-on-surface-variant">
                                 <span className="w-1.5 h-1.5 rounded-full bg-tertiary mt-1.5"></span>
                                 <span className="font-medium text-tertiary whitespace-nowrap">{dateText}</span>
                                 <span>-</span>
                                 <span>{g.description}</span>
                               </div>
                             );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}
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
