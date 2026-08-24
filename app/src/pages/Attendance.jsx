import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('input');
  
  // Data State
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { student_id: 'H'|'S'|'I'|'A' }
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Input Tab State
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  
  // Rekap Tab State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rekapMonth, setRekapMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [rekapData, setRekapData] = useState([]); // List of attendance for the month

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Fetch attendance when date or tab changes
  useEffect(() => {
    if (activeTab === 'input' && students.length > 0) {
      fetchAttendance(currentDate);
    }
  }, [currentDate, activeTab, students]);

  // Fetch rekap when month or selected student changes
  useEffect(() => {
    if (activeTab === 'rekap' && selectedStudentId && rekapMonth) {
      fetchRekap(selectedStudentId, rekapMonth);
    }
  }, [selectedStudentId, rekapMonth, activeTab]);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('id, name, nisn, status, gender, photo_url')
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      // Filter only active students (or if status is null, treat as active)
      const activeStudents = data?.filter(s => !s.status || s.status.toLowerCase() === 'aktif' || s.status.toLowerCase() === 'active') || [];
      const finalStudents = activeStudents.length > 0 ? activeStudents : (data || []);
      
      setStudents(finalStudents);
      if (finalStudents.length > 0) {
        setSelectedStudentId(finalStudents[0].id);
      }
    } catch (error) {
      console.error('Error fetching students:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendance = async (date) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', date);
        
      if (error) throw error;
      
      const attMap = {};
      students.forEach(s => {
        attMap[s.id] = 'H'; // Default to Hadir
      });
      data?.forEach(record => {
        attMap[record.student_id] = record.status;
      });
      setAttendanceData(attMap);
    } catch (error) {
      console.error('Error fetching attendance:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRekap = async (studentId, month) => {
    try {
      setIsLoading(true);
      const startDate = `${month}-01`;
      const endDate = `${month}-31`; 
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (error) throw error;
      setRekapData(data || []);
    } catch (error) {
      console.error('Error fetching rekap:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      setIsSaving(true);
      
      const { data: existingRecords } = await supabase
        .from('attendance')
        .select('id, student_id')
        .eq('date', currentDate);
        
      const existingMap = {};
      existingRecords?.forEach(r => {
        existingMap[r.student_id] = r.id;
      });

      const upsertData = [];
      const insertData = [];
      const deleteIds = [];
      
      for (const student of students) {
        const status = attendanceData[student.id];
        const existingId = existingMap[student.id];
        
        if (status) {
          if (existingId) {
            upsertData.push({ id: existingId, student_id: student.id, date: currentDate, status });
          } else {
            insertData.push({ student_id: student.id, date: currentDate, status });
          }
        } else {
          // If status was cleared, delete existing record if any
          if (existingId) {
             deleteIds.push(existingId);
          }
        }
      }
      
      if (upsertData.length > 0) {
        const { error } = await supabase.from('attendance').upsert(upsertData);
        if (error) throw error;
      }
      
      if (insertData.length > 0) {
        const { error } = await supabase.from('attendance').insert(insertData);
        if (error) throw error;
      }

      if (deleteIds.length > 0) {
        const { error } = await supabase.from('attendance').delete().in('id', deleteIds);
        if (error) throw error;
      }
      
      alert('Data presensi berhasil disimpan!');
    } catch (error) {
      console.error('Error saving attendance:', error.message);
      alert('Gagal menyimpan presensi: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateIndo = (dateStr) => {
    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString('id-ID', options);
    } catch {
      return dateStr;
    }
  };

  const handleShareWhatsApp = () => {
    const dateStr = formatDateIndo(currentDate);
    
    const missing = [];
    students.forEach(student => {
      const status = attendanceData[student.id];
      if (status && status !== 'H') {
        let statusText = status === 'S' ? 'Sakit' : status === 'I' ? 'Izin' : 'Alpa';
        missing.push(`- ${student.name} (${statusText})`);
      }
    });

    let message = `*Laporan Presensi*\nTanggal: ${dateStr}\n\n`;
    
    if (missing.length === 0) {
      message += "Seluruh siswa hadir (Nihil).";
    } else {
      message += "*Daftar Siswa Tidak Hadir:*\n" + missing.join('\n');
    }
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const rekapSummary = { H: 0, S: 0, I: 0, A: 0 };
  rekapData.forEach(r => {
    if (rekapSummary[r.status] !== undefined) {
      rekapSummary[r.status]++;
    }
  });

  const prevMonth = () => {
    const [year, month] = rekapMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1); // -2 because month is 1-indexed in string but 0-indexed in Date
    setRekapMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [year, month] = rekapMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    setRekapMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const renderCalendar = () => {
    if (!rekapMonth) return null;
    const [year, month] = rekapMonth.split('-').map(Number);
    
    // Day 0 is Sunday, 1 is Monday. We want Monday=0
    let firstDay = new Date(year, month - 1, 1).getDay();
    let startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const grid = [];
    // Empty prefix cells
    for (let i = 0; i < startDay; i++) {
      grid.push(<div key={`empty-start-${i}`} className="aspect-square rounded-md flex items-center justify-center font-body-md bg-surface-container-lowest opacity-40 border border-outline-variant/30" />);
    }
    
    const dayMap = {};
    rekapData.forEach(r => {
      const day = parseInt(r.date.split('-')[2], 10);
      dayMap[day] = r.status;
    });
    
    for (let i = 1; i <= daysInMonth; i++) {
      const status = dayMap[i];
      let bgClass = "hover:bg-surface-container-lowest border-outline-variant border";
      
      if (status === 'H') bgClass = "bg-emerald-100/80 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700 shadow-sm";
      else if (status === 'S') bgClass = "bg-blue-100/80 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700 shadow-sm";
      else if (status === 'I') bgClass = "bg-amber-100/80 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700 shadow-sm";
      else if (status === 'A') bgClass = "bg-red-100/80 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700 shadow-sm";
      
      grid.push(
        <div key={`day-${i}`} className={`aspect-square rounded-md flex flex-col items-center justify-center transition-all ${bgClass}`}>
          <span className={`font-title-md ${status ? 'text-[13px]' : 'text-sm'}`}>{i}</span>
          {status && <span className="font-label-sm text-[10px] font-bold">{status}</span>}
        </div>
      );
    }
    
    return grid;
  };

  // Helper for chip styles
  const getStatusChipClass = (isSelected, status) => {
    let base = "w-10 h-10 rounded-full font-label-md text-label-md border transition-colors duration-200 shadow-sm flex items-center justify-center";
    if (!isSelected) {
      return `${base} bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high`;
    }
    
    switch (status) {
      case 'H': return `${base} bg-emerald-500 border-emerald-600 text-white`;
      case 'S': return `${base} bg-blue-500 border-blue-600 text-white`;
      case 'I': return `${base} bg-amber-500 border-amber-600 text-white`;
      case 'A': return `${base} bg-red-500 border-red-600 text-white`;
      default: return `${base} bg-primary border-primary text-on-primary`;
    }
  };

  return (
    <>
      <div className="mb-lg flex flex-col sm:flex-row sm:justify-between sm:items-end gap-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-xs">Presensi</h1>
          <p className="font-body-md text-body-md text-on-surface-variant flex items-center">
            <span className="material-symbols-outlined align-bottom text-lg mr-2">calendar_today</span>
            {formatDateIndo(currentDate)}
          </p>
        </div>
        {activeTab === 'input' && (
          <div>
             <input 
               type="date" 
               className="border-outline-variant rounded-md text-body-md px-3 py-2 bg-surface text-on-surface focus:ring-primary focus:border-primary w-full sm:w-auto"
               value={currentDate}
               onChange={(e) => setCurrentDate(e.target.value)}
             />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant mb-lg overflow-x-auto hide-scrollbar">
        <button 
          className={`px-lg py-sm font-title-lg text-title-lg whitespace-nowrap ${activeTab === 'input' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors border-b-2 border-transparent'}`}
          onClick={() => setActiveTab('input')}
        >
          Input Harian
        </button>
        <button 
          className={`px-lg py-sm font-title-lg text-title-lg whitespace-nowrap ${activeTab === 'rekap' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors border-b-2 border-transparent'}`}
          onClick={() => setActiveTab('rekap')}
        >
          Rekap Kalender
        </button>
      </div>

      {isLoading && students.length === 0 ? (
        <div className="flex justify-center py-12">
           <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Input Harian Content */}
          {activeTab === 'input' && (
            <div className="flex-1 flex flex-col">
              <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
                
                {/* Table Header */}
                <div className="hidden sm:grid grid-cols-12 gap-md p-md bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant">
                  <div className="col-span-1 text-center">No</div>
                  <div className="col-span-2">NISN</div>
                  <div className="col-span-5">Nama Siswa</div>
                  <div className="col-span-4 text-center">Kehadiran</div>
                </div>
                
                {/* Student List */}
                <div className="flex-1 overflow-y-auto divide-y divide-outline-variant">
                  {students.length === 0 ? (
                    <div className="p-8 text-center text-on-surface-variant">Belum ada data siswa aktif.</div>
                  ) : (
                    students.map((student, index) => (
                      <div key={student.id} className="p-md hover:bg-surface-container-lowest transition-colors sm:grid sm:grid-cols-12 sm:gap-md sm:items-center flex flex-col gap-sm">
                        <div className="hidden sm:block col-span-1 text-center font-body-sm text-on-surface-variant">
                          {index + 1}
                        </div>
                        <div className="hidden sm:block col-span-2 font-body-sm text-on-surface-variant">
                          {student.nisn || '-'}
                        </div>
                        <div className="col-span-5">
                          <div className="flex items-center gap-sm">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt={student.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-title-lg text-sm shrink-0">
                                {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                            <div>
                              <p className="font-title-md text-title-md text-on-surface leading-tight">{student.name}</p>
                              <p className="font-body-sm text-body-sm text-on-surface-variant sm:hidden mt-0.5">NISN: {student.nisn || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-4 flex justify-end sm:justify-center gap-2">
                          <button 
                            onClick={() => handleStatusChange(student.id, 'H')}
                            className={getStatusChipClass(attendanceData[student.id] === 'H', 'H')}
                          >H</button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'S')}
                            className={getStatusChipClass(attendanceData[student.id] === 'S', 'S')}
                          >S</button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'I')}
                            className={getStatusChipClass(attendanceData[student.id] === 'I', 'I')}
                          >I</button>
                          <button 
                            onClick={() => handleStatusChange(student.id, 'A')}
                            className={getStatusChipClass(attendanceData[student.id] === 'A', 'A')}
                          >A</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Sticky Bottom Action */}
              {students.length > 0 && (
                <div className="mt-md flex flex-wrap justify-end gap-sm sticky bottom-4 z-10">
                  <button 
                    onClick={handleShareWhatsApp}
                    className="bg-[#25D366] text-white font-title-lg text-title-lg px-xl py-md rounded-xl hover:bg-[#128C7E] transition-all shadow-lg hover:shadow-xl flex items-center gap-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">share</span>
                    Share ke WA
                  </button>
                  <button 
                    onClick={handleSaveAttendance}
                    disabled={isSaving}
                    className="bg-primary text-white font-title-lg text-title-lg px-xl py-md rounded-xl hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl flex items-center gap-sm disabled:opacity-70 active:scale-95"
                  >
                    {isSaving ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">save</span>
                    )}
                    {isSaving ? 'Menyimpan...' : 'Simpan Presensi'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rekap Kalender Content */}
          {activeTab === 'rekap' && (
            <div className="flex-1 flex flex-col gap-lg pb-12">
              <div className="bg-surface border border-outline-variant rounded-xl p-md sm:p-lg shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-lg gap-md">
                  <div className="w-full sm:w-64">
                    <label className="font-label-md text-label-md text-on-surface-variant block mb-1.5">Pilih Siswa</label>
                    <select 
                      className="w-full border-outline-variant rounded-md text-body-md focus:border-primary focus:ring focus:ring-primary/20 bg-surface px-3 py-2"
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={prevMonth} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <span className="font-title-lg text-title-lg min-w-[140px] text-center">
                      {new Date(rekapMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
                
                {/* Calendar Grid */}
                {isLoading ? (
                  <div className="py-20 flex justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-lg">
                      <div className="font-label-md text-label-md text-on-surface-variant py-2">Sen</div>
                      <div className="font-label-md text-label-md text-on-surface-variant py-2">Sel</div>
                      <div className="font-label-md text-label-md text-on-surface-variant py-2">Rab</div>
                      <div className="font-label-md text-label-md text-on-surface-variant py-2">Kam</div>
                      <div className="font-label-md text-label-md text-on-surface-variant py-2">Jum</div>
                      <div className="font-label-md text-label-md text-error/80 py-2">Sab</div>
                      <div className="font-label-md text-label-md text-error/80 py-2">Min</div>
                      {renderCalendar()}
                    </div>
                  </>
                )}
              </div>
              
              {/* Summary Footer */}
              <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-sm flex flex-wrap gap-x-6 gap-y-4 items-center">
                <div className="font-title-lg text-title-lg text-on-surface">Rekap Bulan Ini:</div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-emerald-100/50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="font-body-md font-medium">Hadir (H): {rekapSummary.H}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-100/50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="font-body-md font-medium">Sakit (S): {rekapSummary.S}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-100/50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="font-body-md font-medium">Izin (I): {rekapSummary.I}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-100/50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <span className="font-body-md font-medium">Alpa (A): {rekapSummary.A}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
