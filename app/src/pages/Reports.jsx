import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function Reports() {
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().toISOString().substring(0, 7)); // Format: YYYY-MM
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classFundsData, setClassFundsData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendanceReport();
    }
  }, [attendanceMonth, students]);

  const downloadExcel = () => {
    if (attendanceReport.length === 0) {
      alert("Belum ada data untuk di-download.");
      return;
    }

    const headers = ['No', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Total Presensi', 'Total Kas (Rp)'];
    
    const rows = attendanceReport.map((student, index) => [
      index + 1,
      `"${student.name}"`,
      student.summary.H,
      student.summary.S,
      student.summary.I,
      student.summary.A,
      student.summary.total,
      student.totalPaid
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const monthName = monthNames[parseInt(attendanceMonth.split('-')[1]) - 1];
    const year = attendanceMonth.split('-')[0];
    link.setAttribute('download', `Laporan_Siswa_${monthName}_${year}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const startDate = `${attendanceMonth}-01`;
      const endDate = `${attendanceMonth}-31`; 
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (attError) throw attError;
      setAttendanceData(attData || []);

      const currentYear = attendanceMonth.split('-')[0];
      const monthIndex = parseInt(attendanceMonth.split('-')[1]) - 1;
      const periodName = monthNames[monthIndex];

      const { data: fundsData, error: fundsError } = await supabase
        .from('class_funds')
        .select('*')
        .eq('period', periodName);
      
      if (fundsError) throw fundsError;
      
      const filteredFunds = (fundsData || []).filter(t => t.date && t.date.startsWith(currentYear));
      setClassFundsData(filteredFunds);

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
    const targetObj = classFundsData.find(f => f.type === 'target');
    const targetKas = targetObj ? targetObj.amount : 8000;

    const studentFunds = regularFunds.filter(f => f.type === 'in' && f.student_id === student.id);
    const totalPaid = studentFunds.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const isLunas = totalPaid >= targetKas;

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
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#107c41] text-white px-4 py-2 rounded-full font-label-md hover:bg-[#0c5e31] transition-colors shadow-sm"
            onClick={downloadExcel}
          >
            <span className="material-symbols-outlined text-[18px]">table</span>
            Download Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-lg">
        
        {/* Kehadiran Report */}
        <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col h-full">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="font-title-lg text-title-lg text-on-surface">Laporan Kehadiran</h3>
            <div className="flex gap-2">
              <select 
                value={attendanceMonth.split('-')[1]}
                onChange={(e) => {
                  const year = attendanceMonth.split('-')[0];
                  setAttendanceMonth(`${year}-${e.target.value}`);
                }}
                className="bg-surface-container-low border border-outline-variant rounded p-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {monthNames.map((m, i) => (
                  <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
                ))}
              </select>
              <select
                value={attendanceMonth.split('-')[0]}
                onChange={(e) => {
                  const month = attendanceMonth.split('-')[1];
                  setAttendanceMonth(`${e.target.value}-${month}`);
                }}
                className="bg-surface-container-low border border-outline-variant rounded p-1.5 text-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {[...Array(10)].map((_, i) => {
                  const year = 2024 + i;
                  return <option key={year} value={year}>{year}</option>
                })}
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center h-full min-h-[200px]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase border-b border-outline-variant/30">
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3 text-center text-emerald-600">H</th>
                    <th className="p-3 text-center text-blue-600">S</th>
                    <th className="p-3 text-center text-amber-600">I</th>
                    <th className="p-3 text-center text-error">A</th>
                    <th className="p-3 text-center">Total</th>
                    <th className="p-3 text-center border-l border-outline-variant/30">Total Kas</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceReport.length > 0 ? attendanceReport.map(student => (
                    <tr key={student.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-3 font-title-sm text-on-surface">{student.name}</td>
                      <td className="p-3 text-center font-body-sm font-semibold">{student.summary.H}</td>
                      <td className="p-3 text-center font-body-sm font-semibold">{student.summary.S}</td>
                      <td className="p-3 text-center font-body-sm font-semibold">{student.summary.I}</td>
                      <td className="p-3 text-center font-body-sm font-semibold">{student.summary.A}</td>
                      <td className="p-3 text-center font-body-sm font-bold bg-surface-container-lowest/50">{student.summary.total}</td>
                      <td className="p-3 text-center font-body-sm border-l border-outline-variant/30">
                        {student.isLunas ? (
                          <span className="text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded text-xs">Lunas</span>
                        ) : student.totalPaid > 0 ? (
                          <span className="text-primary font-medium">{formatCurrency(student.totalPaid)}</span>
                        ) : (
                          <span className="text-outline-variant">-</span>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-on-surface-variant font-body-md">
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
    </>
  );
}
