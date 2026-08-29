import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const currentDay = today.toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(currentDay);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classFundsData, setClassFundsData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const { userType, studentSession } = useAuth();
  const hasAttendanceAccess = userType === 'admin' || (userType === 'student' && (studentSession?.role?.includes('report_attendance') || studentSession?.role?.includes('reports')));
  const hasClassFundAccess = userType === 'admin' || (userType === 'student' && (studentSession?.role?.includes('report_class_fund') || studentSession?.role?.includes('reports')));

  const [activeTab, setActiveTab] = useState(hasAttendanceAccess ? 'attendance' : (hasClassFundAccess ? 'funds' : 'none'));

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendanceReport();
    }
  }, [startDate, endDate, students]);

  const downloadExcel = () => {
    if (attendanceReport.length === 0) {
      alert("Belum ada data untuk di-download.");
      return;
    }

    let headers = [];
    let rows = [];
    let sheetName = "";

    if (activeTab === 'attendance') {
      sheetName = "Laporan Kehadiran";
      headers = ['No', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Total Presensi'];
      rows = attendanceReport.map((student, index) => [
        index + 1,
        student.name,
        student.summary.H,
        student.summary.S,
        student.summary.I,
        student.summary.A,
        student.summary.total
      ]);
    } else {
      sheetName = "Laporan Kas Kelas";
      headers = ['No', 'Nama Siswa', 'Total Kas (Rp)', 'Status'];
      rows = attendanceReport.map((student, index) => [
        index + 1,
        student.name,
        student.totalPaid,
        student.isLunas ? 'Lunas' : 'Belum Lunas'
      ]);
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const startStr = `${startObj.getDate()}_${monthNames[startObj.getMonth()]}_${startObj.getFullYear()}`;
    const endStr = `${endObj.getDate()}_${monthNames[endObj.getMonth()]}_${endObj.getFullYear()}`;
    
    XLSX.writeFile(workbook, `Laporan_Siswa_${startStr}_sd_${endStr}.xlsx`);
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, status')
        .order('name');
      if (error) throw error;
      const activeStudents = data?.filter(s => !s.status || s.status.toLowerCase() === 'aktif' || s.status.toLowerCase() === 'active') || [];
      setStudents(activeStudents);
    } catch (error) {
      console.error('Error fetching students:', error.message);
    }
  };

  const fetchAttendanceReport = async () => {
    try {
      setLoading(true);
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (attError) throw attError;
      setAttendanceData(attData || []);

      const { data: fundsData, error: fundsError } = await supabase
        .from('class_funds')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (fundsError) throw fundsError;
      
      setClassFundsData(fundsData || []);

    } catch (error) {
      console.error('Error fetching data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const attendanceReport = students.map(student => {
    const studentAtt = attendanceData.filter(a => a.student_id === student.id);
    const summary = { H: 0, S: 0, I: 0, A: 0, total: 0 };
    studentAtt.forEach(a => {
      if (summary[a.status] !== undefined) {
        summary[a.status]++;
        summary.total++;
      }
    });

    const regularFunds = classFundsData.filter(f => f.type !== 'target');
    const targetObjs = classFundsData.filter(f => f.type === 'target');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthsDiff = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
    
    const targetKas = targetObjs.length > 0 
      ? targetObjs.reduce((sum, t) => sum + t.amount, 0) 
      : 8000 * monthsDiff;

    const studentFunds = regularFunds.filter(f => f.type === 'in' && f.student_id === student.id);
    const totalPaid = studentFunds.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const isLunas = totalPaid >= targetKas && totalPaid > 0;

    return {
      ...student,
      summary,
      totalPaid,
      isLunas
    };
  });

  const formatCurrency = (amount) => 'Rp ' + amount.toLocaleString('id-ID');

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Laporan Kelas</h2>
          <p className="font-body-md text-on-surface-variant mt-1">Ringkasan kehadiran, keuangan, dan performa siswa.</p>
        </div>
        <div className="flex flex-col xl:flex-row gap-3 w-full md:w-auto items-stretch xl:items-center">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 items-stretch sm:items-center bg-surface p-3 sm:p-2 rounded-lg border border-outline-variant shadow-sm w-full xl:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-on-surface-variant font-medium min-w-[55px] sm:min-w-0">Dari:</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 sm:w-auto bg-surface-container-low border border-outline-variant rounded p-2 sm:p-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="hidden sm:block w-px h-6 bg-outline-variant/50"></div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-on-surface-variant font-medium min-w-[55px] sm:min-w-0">Sampai:</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 sm:w-auto bg-surface-container-low border border-outline-variant rounded p-2 sm:p-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <button 
            className="w-full xl:w-auto flex items-center justify-center gap-2 bg-[#107c41] text-white px-5 py-2.5 rounded-lg font-label-md hover:bg-[#0c5e31] transition-colors shadow-sm whitespace-nowrap"
            onClick={downloadExcel}
          >
            <span className="material-symbols-outlined text-[18px]">table</span>
            Download Excel
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 border-b border-outline-variant/30 pb-2 overflow-x-auto">
        {hasAttendanceAccess && (
          <button 
            className={`font-title-sm px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'attendance' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
            onClick={() => setActiveTab('attendance')}
          >
            Laporan Kehadiran
          </button>
        )}
        {hasClassFundAccess && (
          <button 
            className={`font-title-sm px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'funds' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
            onClick={() => setActiveTab('funds')}
          >
            Laporan Kas Kelas
          </button>
        )}
      </div>

      {(!hasAttendanceAccess && !hasClassFundAccess) ? (
        <div className="bg-surface p-8 rounded-xl border border-outline-variant shadow-sm text-center">
          <p className="text-on-surface-variant font-body-md">Anda tidak memiliki akses untuk melihat laporan ini.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-lg">
        
        {/* Report Card */}
        <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col h-full animate-[fadeIn_0.2s_ease-out]">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-title-lg text-title-lg text-on-surface">
              {activeTab === 'attendance' ? 'Laporan Kehadiran Siswa' : 'Laporan Kas Kelas Siswa'}
            </h3>
          </div>
          
          <div className="w-full overflow-x-auto rounded-lg border border-outline-variant/30">
            {loading ? (
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className={`w-full text-left border-collapse ${activeTab === 'attendance' ? 'min-w-[600px]' : 'min-w-[400px]'}`}>
                <thead>
                  {activeTab === 'attendance' ? (
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase border-b border-outline-variant/30">
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center text-emerald-600">H</th>
                    <th className="p-3 text-center text-blue-600">S</th>
                    <th className="p-3 text-center text-amber-600">I</th>
                    <th className="p-3 text-center text-error">A</th>
                    <th className="p-3 text-center">Total</th>
                  </tr>
                  ) : (
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase border-b border-outline-variant/30">
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-right">Total Kas Dibayar</th>
                    <th className="p-3 text-center border-l border-outline-variant/30">Status</th>
                  </tr>
                  )}
                </thead>
                <tbody>
                  {attendanceReport.length > 0 ? attendanceReport.map(student => (
                    <tr key={student.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-3 font-title-sm text-on-surface">{student.name}</td>
                      {activeTab === 'attendance' ? (
                        <>
                          <td className="p-3 text-center font-body-sm font-semibold">{student.summary.H}</td>
                          <td className="p-3 text-center font-body-sm font-semibold">{student.summary.S}</td>
                          <td className="p-3 text-center font-body-sm font-semibold">{student.summary.I}</td>
                          <td className="p-3 text-center font-body-sm font-semibold">{student.summary.A}</td>
                          <td className="p-3 text-center font-body-sm font-bold bg-surface-container-lowest/50">{student.summary.total}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-right font-body-sm font-medium text-primary">
                            {formatCurrency(student.totalPaid)}
                          </td>
                          <td className="p-3 text-center font-body-sm border-l border-outline-variant/30">
                            {student.isLunas ? (
                              <span className="text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded text-xs">Lunas</span>
                            ) : student.totalPaid > 0 ? (
                              <span className="text-error font-medium bg-error/10 px-2 py-0.5 rounded text-xs">Belum Lunas</span>
                            ) : (
                              <span className="text-outline-variant">-</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={activeTab === 'attendance' ? "6" : "3"} className="p-8 text-center text-on-surface-variant font-body-md">
                        Belum ada data siswa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}
