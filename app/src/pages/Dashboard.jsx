import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

function CountUp({ target, duration = 1500 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const steps = 60;
    const stepTime = Math.abs(Math.floor(duration / steps));
    const increment = target / steps;

    if (target === 0) {
      setCount(0);
      return;
    }

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{Number.isInteger(target) ? Math.floor(count) : count.toFixed(1)}</span>;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSiswa: 0,
    hadir: 0,
    tidakHadir: 0,
    saldoKas: 0,
    totalPemasukan: 0,
    totalPengeluaran: 0,
    tunggakan: [],
    absenHariIni: [],
    isHoliday: false,
    holidayDesc: ''
  });

  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('id-ID', dateOptions);
  
  const todayYMD = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentMonthName = monthNames[today.getMonth()];
  const currentYear = today.getFullYear().toString();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Students
      const { data: studentsData } = await supabase.from('students').select('id, name, status');
      const activeStudents = (studentsData || []).filter(s => !s.status || s.status.toLowerCase() === 'aktif' || s.status.toLowerCase() === 'active');
      const totalSiswa = activeStudents.length;

      // 2. Fetch Today's Attendance
      const { data: attData } = await supabase.from('attendance').select('status, student_id').eq('date', todayYMD);
      let tidakHadir = 0;
      let hadir = 0;
      const absenHariIni = [];
      
      if (attData && attData.length > 0) {
        hadir = attData.filter(a => a.status === 'H').length;
        
        attData.forEach(a => {
           if (['S', 'I', 'A'].includes(a.status)) {
             tidakHadir++;
             const st = activeStudents.find(s => s.id === a.student_id);
             if (st) {
               absenHariIni.push({ name: st.name, status: a.status });
             }
           }
        });
      }

      // 2.5 Fetch Holidays
      const { data: holidayData } = await supabase.from('holidays').select('*');
      let isHoliday = false;
      let holidayDesc = '';
      if (holidayData) {
        const d = new Date();
        const dayOfWeek = d.getDay().toString();
        
        const eventHol = holidayData.find(h => h.type === 'event' && h.date === todayYMD);
        const actHol = holidayData.find(h => h.type === 'activity' && h.date === todayYMD);
        const weeklyHol = holidayData.find(h => h.type === 'weekly' && h.day_of_week?.toString() === dayOfWeek);
        
        if (eventHol) {
          isHoliday = true;
          holidayDesc = `Libur: ${eventHol.description}`;
        } else if (actHol) {
          isHoliday = true;
          holidayDesc = `Kegiatan Sekolah: ${actHol.description}`;
        } else if (weeklyHol) {
          isHoliday = true;
          holidayDesc = 'Libur Akhir Pekan';
        }
      }

      // 3. Fetch Class Funds (Saldo & Aktivitas)
      const { data: fundsData } = await supabase.from('class_funds').select('*, students(name)').order('created_at', { ascending: false });
      const regularFunds = (fundsData || []).filter(f => f.type !== 'target');
      const totalIncome = regularFunds.filter(f => f.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = regularFunds.filter(f => f.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
      const saldoKas = totalIncome - totalExpense;

      // 4. Tunggakan Kas (Kumulatif sampai bulan ini)
      const startMonthSetting = (fundsData || []).find(t => t.type === 'setting' && t.period === 'awal');
      let startMonthInt = 7;
      let startYearInt = today.getFullYear();
      if (startMonthSetting) {
        startMonthInt = startMonthSetting.amount;
        if (startMonthSetting.date) {
          startYearInt = parseInt(startMonthSetting.date.split('-')[0], 10);
        }
      }

      const targetFunds = (fundsData || []).filter(t => t.type === 'target');
      const getTargetForMonth = (yearInt, monthInt) => {
        const monthName = monthNames[monthInt - 1];
        const targetObj = targetFunds.find(t => t.period === monthName && t.date?.startsWith(yearInt.toString()));
        return targetObj ? targetObj.amount : 8000;
      };

      const currentYearInt = today.getFullYear();
      const currentMonthInt = today.getMonth() + 1;
      
      let cumulativeTarget = 0;
      const totalMonthsDiff = (currentYearInt - startYearInt) * 12 + (currentMonthInt - startMonthInt);
      
      if (totalMonthsDiff >= 0) {
        for (let i = 0; i <= totalMonthsDiff; i++) {
          const currentMonthTotal = startMonthInt - 1 + i;
          const m = (currentMonthTotal % 12) + 1;
          const yTarget = startYearInt + Math.floor(currentMonthTotal / 12);
          cumulativeTarget += getTargetForMonth(yTarget, m);
        }
      }
      
      const currentYm = `${currentYearInt}-${currentMonthInt.toString().padStart(2, '0')}`;
      const tunggakanList = [];
      
      activeStudents.forEach(student => {
         const studentFunds = regularFunds.filter(f => {
           if (f.type !== 'in' || f.student_id !== student.id) return false;
           const txYm = f.date ? f.date.substring(0, 7) : '';
           return txYm <= currentYm;
         });
         const totalPaid = studentFunds.reduce((acc, curr) => acc + (curr.amount || 0), 0);
         
         if (totalPaid < cumulativeTarget) {
            tunggakanList.push({ name: student.name, remaining: cumulativeTarget - totalPaid });
         }
      });
      tunggakanList.sort((a, b) => b.remaining - a.remaining);

      setStats({
        totalSiswa,
        hadir,
        tidakHadir,
        saldoKas,
        totalPemasukan: totalIncome,
        totalPengeluaran: totalExpense,
        tunggakan: tunggakanList,
        absenHariIni,
        isHoliday,
        holidayDesc
      });
      
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => 'Rp ' + amount.toLocaleString('id-ID');

  return (
    <>
      <div className="mb-xl flex flex-col md:flex-row md:items-end justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Beranda Kelas</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-xs">{formattedDate}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg animate-[fadeIn_0.3s_ease-out]">
          
          {/* Top row: General Stats */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-lg">
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-xl"></div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase">Total Siswa Aktif</p>
              <p className="font-headline-lg text-headline-lg text-primary mt-sm"><CountUp target={stats.totalSiswa} /></p>
            </div>
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/5 rounded-full blur-xl"></div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase">Hadir Hari Ini</p>
              <p className="font-headline-lg text-headline-lg text-secondary mt-sm"><CountUp target={stats.hadir} /></p>
            </div>
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/5 rounded-full blur-xl"></div>
              <p className="font-label-md text-label-md text-on-surface-variant uppercase">Tidak Hadir Hari Ini</p>
              <p className="font-headline-lg text-headline-lg text-error mt-sm"><CountUp target={stats.tidakHadir} /></p>
            </div>
          </div>

          {/* Siswa Tidak Hadir */}
          <div className="md:col-span-2 bg-surface p-lg rounded-xl border border-outline-variant shadow-sm h-fit">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-md">Siswa Tidak Hadir Hari Ini</h3>
            {stats.isHoliday ? (
              <div className="text-center py-4 bg-surface-container-lowest border border-outline-variant/30 rounded-lg">
                <span className="material-symbols-outlined text-[48px] text-tertiary mb-2 opacity-80">event_busy</span>
                <p className="text-on-surface font-body-lg font-bold">{stats.holidayDesc}</p>
              </div>
            ) : stats.absenHariIni.length === 0 ? (
              <p className="text-on-surface-variant font-body-sm text-center py-4">Semua siswa hadir hari ini!</p>
            ) : (
              <div className="space-y-sm">
                {stats.absenHariIni.map((absen, idx) => {
                  let bgClass = "bg-surface-variant/50 text-on-surface-variant";
                  let textStatus = absen.status;
                  if (absen.status === 'S') { bgClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"; textStatus = "Sakit"; }
                  if (absen.status === 'I') { bgClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"; textStatus = "Izin"; }
                  if (absen.status === 'A') { bgClass = "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"; textStatus = "Alpa"; }
                  
                  return (
                    <div key={idx} className="flex justify-between items-center p-3 bg-surface-container-lowest border border-outline-variant/50 rounded-lg hover:bg-surface-container-low transition-colors">
                      <span className="font-body-md text-on-surface">{absen.name}</span>
                      <span className={`font-label-sm px-2 py-1 rounded font-bold ${bgClass}`}>{textStatus}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cash Balance Column */}
          <div className="md:col-span-1 flex flex-col gap-lg h-fit">
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col justify-center items-center text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full"></div>
              <div>
                <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-sm">Total Saldo Kas</p>
                <p className="font-headline-lg text-headline-lg text-on-surface">{formatCurrency(stats.saldoKas)}</p>
              </div>
            </div>
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden text-center">
               <p className="font-label-sm text-on-surface-variant uppercase mb-1">Total Pemasukan</p>
               <p className="font-title-lg text-secondary">{formatCurrency(stats.totalPemasukan)}</p>
            </div>
            <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden text-center">
               <p className="font-label-sm text-on-surface-variant uppercase mb-1">Total Pengeluaran</p>
               <p className="font-title-lg text-error">{formatCurrency(stats.totalPengeluaran)}</p>
            </div>
          </div>

          {/* Tunggakan Kas List - Full Width Bottom */}
          <div className="md:col-span-3 bg-surface p-lg rounded-xl border border-outline-variant shadow-sm">
            <h3 className="font-title-lg text-title-lg text-on-surface mb-md">Tunggakan Kas (Kumulatif s.d. {currentMonthName} {currentYear})</h3>
            {stats.tunggakan.length === 0 ? (
              <p className="text-on-surface-variant font-body-sm text-center py-4">Semua siswa sudah melunasi kas bulan ini!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {stats.tunggakan.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center p-md bg-surface-container-lowest border border-outline-variant/50 rounded-lg hover:bg-surface-container-low transition-colors">
                    <div className="flex items-center gap-md">
                      <span className="font-body-md text-body-md line-clamp-1" title={t.name}>{t.name}</span>
                    </div>
                    <span className="font-label-sm text-label-sm text-error bg-error-container/50 px-2 py-1 rounded whitespace-nowrap">
                      Kurang {formatCurrency(t.remaining)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
