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
    absenHariIni: []
  });

  const today = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('id-ID', dateOptions);
  
  const todayYMD = today.toISOString().split('T')[0];
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

      // 3. Fetch Class Funds (Saldo & Aktivitas)
      const { data: fundsData } = await supabase.from('class_funds').select('*, students(name)').order('created_at', { ascending: false });
      const totalIncome = (fundsData || []).filter(f => f.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
      const totalExpense = (fundsData || []).filter(f => f.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
      const saldoKas = totalIncome - totalExpense;

      // 4. Tunggakan Kas (For Current Month)
      const currentMonthFunds = (fundsData || []).filter(f => {
         const txYear = f.date ? f.date.split('-')[0] : '';
         return f.type === 'in' && f.period === currentMonthName && txYear === currentYear;
      });
      
      const tunggakanList = [];
      activeStudents.forEach(student => {
         const studentFunds = currentMonthFunds.filter(f => f.student_id === student.id);
         let paidCount = 0;
         studentFunds.forEach(t => {
           if (t?.description?.toLowerCase().includes('minggu')) {
             const matches = t.description.match(/\d+/g);
             if (matches) {
               matches.forEach(m => {
                 const weekNum = parseInt(m);
                 if (weekNum >= 1 && weekNum <= 5) paidCount++;
               });
             }
           }
         });
         
         if (paidCount < 4) { // Assume 4 weeks is a normal target
            tunggakanList.push({ name: student.name, paidCount, remaining: 4 - paidCount });
         }
      });
      tunggakanList.sort((a, b) => a.paidCount - b.paidCount);

      setStats({
        totalSiswa,
        hadir,
        tidakHadir,
        saldoKas,
        totalPemasukan: totalIncome,
        totalPengeluaran: totalExpense,
        tunggakan: tunggakanList,
        absenHariIni
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
            {stats.absenHariIni.length === 0 ? (
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
            <h3 className="font-title-lg text-title-lg text-on-surface mb-md">Belum Lunas Kas Bulan {currentMonthName}</h3>
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
                      Kurang {t.remaining} mgg
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
