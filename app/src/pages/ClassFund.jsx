import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function ClassFund() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'in',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    student_id: '',
    period: ''
  });
  const [selectedWeeks, setSelectedWeeks] = useState([]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // Format: YYYY-MM
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch students for dropdown
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name')
        .order('name');
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch class funds with student relation
      const { data: fundsData, error: fundsError } = await supabase
        .from('class_funds')
        .select(`
          *,
          students (
            name
          )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fundsError) throw fundsError;
      setTransactions(fundsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal mengambil data uang kas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const selectedYear = selectedMonth.split('-')[0];
  const selectedMonthIndex = parseInt(selectedMonth.split('-')[1]) - 1;
  const currentPeriod = monthNames[selectedMonthIndex];

  const filteredTransactions = transactions.filter(t => {
    const txYear = t.date ? t.date.split('-')[0] : '';
    if (t.type === 'in' && t.period) {
      return t.period === currentPeriod && txYear === selectedYear;
    }
    return t.date && t.date.startsWith(selectedMonth);
  });

  const totalBalance = transactions.reduce((acc, curr) => curr?.type === 'in' ? acc + (curr.amount || 0) : acc - (curr?.amount || 0), 0);
  const incomeThisMonth = filteredTransactions.filter(t => t?.type === 'in').reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const expenseThisMonth = filteredTransactions.filter(t => t?.type === 'out').reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const getMonthName = (yearMonth) => {
    if (!yearMonth) return '';
    const [year, month] = yearMonth.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const studentPaymentStatus = students.map(student => {
    const studentTx = transactions.filter(t => {
      const txYear = t.date ? t.date.split('-')[0] : '';
      return t.type === 'in' && 
             t.student_id === student.id && 
             t.period === currentPeriod &&
             txYear === selectedYear;
    });

    const paidWeeks = new Set();
    let totalPaid = 0;

    studentTx.forEach(t => {
      totalPaid += t.amount || 0;
      if (t?.description?.toLowerCase().includes('minggu')) {
        const matches = t.description.match(/\d+/g);
        if (matches) {
          matches.forEach(m => {
            const weekNum = parseInt(m);
            if (weekNum >= 1 && weekNum <= 5) {
              paidWeeks.add(weekNum);
            }
          });
        }
      }
    });

    const isLunas = paidWeeks.size >= 5;

    return {
      ...student,
      paidWeeks: Array.from(paidWeeks).sort(),
      totalPaid,
      status: isLunas ? 'Lunas' : 'Menunggak'
    };
  });

  const formatCurrency = (amount) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
  };

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'student_id' || name === 'period' || name === 'type') {
      setSelectedWeeks([]);
      setFormData({ ...formData, [name]: value, description: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.type === 'in') {
      if (!formData.student_id || !formData.period || !formData.description || !formData.amount || !formData.date) {
        alert("Semua field (Siswa, Periode Bulan, Keterangan/Minggu, Nominal, dan Tanggal) wajib diisi untuk Pemasukan!");
        return;
      }
    } else {
      if (!formData.description || !formData.amount || !formData.date) {
        alert("Semua field (Keterangan, Nominal, dan Tanggal) wajib diisi untuk Pengeluaran!");
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        date: formData.date,
        description: formData.description,
        type: formData.type,
        amount: parseInt(formData.amount, 10),
        student_id: formData.type === 'in' && formData.student_id ? formData.student_id : null,
        period: formData.type === 'in' && formData.period ? formData.period : null
      };

      const { error } = await supabase
        .from('class_funds')
        .insert([payload]);

      if (error) throw error;
      
      // Reset form and refresh data
      setFormData({ 
        type: 'in', 
        description: '', 
        amount: '', 
        date: new Date().toISOString().split('T')[0],
        student_id: '',
        period: ''
      });
      setSelectedWeeks([]);
      setIsModalOpen(false);
      fetchData(); // Refresh list to get the joined student name
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Gagal menyimpan transaksi: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    
    try {
      const { error } = await supabase
        .from('class_funds')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state instead of refetching everything to save requests
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Gagal menghapus transaksi: ' + error.message);
    }
  };

  const alreadyPaidWeeks = isModalOpen && formData.type === 'in' && formData.student_id && formData.period
    ? (() => {
        const studentTx = transactions.filter(t => {
          const txYear = t.date ? t.date.split('-')[0] : '';
          const formYear = formData.date ? formData.date.split('-')[0] : new Date().getFullYear().toString();
          return t.type === 'in' && 
                 t.student_id === formData.student_id && 
                 t.period === formData.period &&
                 txYear === formYear;
        });

        const paid = new Set();
        studentTx.forEach(t => {
          if (t?.description?.toLowerCase().includes('minggu')) {
            const matches = t.description.match(/\d+/g);
            if (matches) {
              matches.forEach(m => {
                const weekNum = parseInt(m);
                if (weekNum >= 1 && weekNum <= 5) {
                  paid.add(weekNum);
                }
              });
            }
          }
        });
        return Array.from(paid);
      })()
    : [];

  return (
    <>
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Uang Kas Kelas</h2>
          <p className="font-body-md text-on-surface-variant mt-1">Kelola pemasukan dan pengeluaran kas kelas.</p>
        </div>
        <button
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-full font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Catat Transaksi
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
        <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Total Saldo Kas</p>
          <p className="font-headline-lg text-headline-lg text-primary">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-xl"></div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Pemasukan ({getMonthName(selectedMonth)})</p>
          <p className="font-headline-lg text-headline-lg text-secondary">{formatCurrency(incomeThisMonth)}</p>
        </div>
        <div className="bg-surface p-lg rounded-xl border border-outline-variant shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error/10 rounded-full blur-xl"></div>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase mb-1">Pengeluaran ({getMonthName(selectedMonth)})</p>
          <p className="font-headline-lg text-headline-lg text-error">{formatCurrency(expenseThisMonth)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-outline-variant/30 pb-2 overflow-x-auto">
        <button 
          className={`font-title-sm px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'transactions' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
          onClick={() => setActiveTab('transactions')}
        >
          Riwayat Transaksi
        </button>
        <button 
          className={`font-title-sm px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'status' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:bg-surface-variant/30'}`}
          onClick={() => setActiveTab('status')}
        >
          Status Pembayaran
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="font-label-sm text-on-surface-variant">Filter Bulan:</span>
          <select 
            value={selectedMonth.split('-')[1]}
            onChange={(e) => {
              const year = selectedMonth.split('-')[0];
              setSelectedMonth(`${year}-${e.target.value}`);
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-sm text-on-surface focus:outline-none focus:border-primary shadow-sm"
          >
            {monthNames.map((m, i) => (
              <option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>
            ))}
          </select>
          <select
            value={selectedMonth.split('-')[0]}
            onChange={(e) => {
              const month = selectedMonth.split('-')[1];
              setSelectedMonth(`${e.target.value}-${month}`);
            }}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-sm text-on-surface focus:outline-none focus:border-primary shadow-sm"
          >
            {[...Array(10)].map((_, i) => {
              const year = 2024 + i;
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
        </div>
      </div>

      {/* Transactions Section */}
      {activeTab === 'transactions' && (
      <div className="bg-surface border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm mb-lg animate-[fadeIn_0.2s_ease-out]">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-surface-container-low border-b border-outline-variant/30 font-label-md text-label-md text-on-surface-variant">
          <div className="col-span-2">Tanggal</div>
          <div className="col-span-3">Nama</div>
          <div className="col-span-3">Keterangan</div>
          <div className="col-span-1">Jenis</div>
          <div className="col-span-2 text-right">Nominal</div>
          <div className="col-span-1 text-right">Aksi</div>
        </div>

        {/* Transaction Rows */}
        {loading ? (
          <div className="p-8 text-center flex justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTransactions.length > 0 ? filteredTransactions.map((transaction) => (
          <div key={transaction.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors items-center group">
            <div className="md:col-span-2 font-body-sm text-on-surface-variant">{formatDate(transaction.date)}</div>
            
            <div className="md:col-span-3 flex flex-col">
              <span className="font-title-sm text-on-surface">
                {transaction.students?.name || '-'}
                {transaction.period && <span className="ml-2 md:hidden text-xs bg-surface-variant/50 text-on-surface-variant px-1.5 py-0.5 rounded">{transaction.period}</span>}
              </span>
              <span className="md:hidden font-body-sm text-on-surface-variant mt-0.5">
                {transaction.description}
              </span>
              <span className="md:hidden font-body-sm text-on-surface-variant mt-0.5 flex items-center gap-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                  transaction.type === 'in' 
                    ? 'bg-secondary/10 text-secondary border-secondary/20' 
                    : 'bg-error/10 text-error border-error/20'
                }`}>
                  {transaction.type === 'in' ? 'Masuk' : 'Keluar'}
                </span>
                {transaction.type === 'in' ? '+' : '-'} {formatCurrency(transaction.amount)}
              </span>
            </div>

            <div className="hidden md:flex md:col-span-3 flex-col">
              <span className="font-body-sm text-on-surface">
                {transaction.description}
                {transaction.period && <span className="ml-2 text-xs bg-surface-variant/50 text-on-surface-variant px-1.5 py-0.5 rounded">{transaction.period}</span>}
              </span>
            </div>

            <div className="hidden md:flex col-span-1 items-center">
              <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-semibold border ${
                transaction.type === 'in' 
                  ? 'bg-secondary/10 text-secondary border-secondary/20' 
                  : 'bg-error/10 text-error border-error/20'
              }`}>
                {transaction.type === 'in' ? 'Masuk' : 'Keluar'}
              </span>
            </div>
            <div className={`hidden md:block md:col-span-2 font-body-md text-right font-semibold ${
              transaction.type === 'in' ? 'text-secondary' : 'text-error'
            }`}>
              {transaction.type === 'in' ? '+' : '-'} {formatCurrency(transaction.amount)}
            </div>
            <div className="absolute right-4 top-4 md:relative md:right-auto md:top-auto md:flex col-span-1 justify-end opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button 
                className="text-outline hover:text-error"
                onClick={() => handleDelete(transaction.id)}
                title="Hapus Transaksi"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </div>
        )) : (
          <div className="p-8 text-center text-on-surface-variant font-body-md">
            Belum ada transaksi.
          </div>
        )}
      </div>
      )}

      {/* Status Section */}
      {activeTab === 'status' && (
        <div className="bg-surface border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm mb-lg animate-[fadeIn_0.2s_ease-out]">
          <div className="p-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-lowest">
            <h3 className="font-title-md text-title-md text-on-surface font-bold">Status Pembayaran Uang Kas - {currentPeriod}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm uppercase border-b border-outline-variant/30">
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4 text-center">Minggu 1</th>
                  <th className="p-4 text-center">Minggu 2</th>
                  <th className="p-4 text-center">Minggu 3</th>
                  <th className="p-4 text-center">Minggu 4</th>
                  <th className="p-4 text-center">Minggu 5</th>
                  <th className="p-4">Total Bayar</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </td>
                  </tr>
                ) : studentPaymentStatus.length > 0 ? (
                  studentPaymentStatus.map(student => (
                    <tr key={student.id} className="border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="p-4 font-title-sm text-on-surface">{student.name}</td>
                      {[1, 2, 3, 4, 5].map(week => (
                        <td key={week} className="p-4 text-center">
                          {student.paidWeeks.includes(week) ? (
                            <span className="material-symbols-outlined text-secondary text-[20px] font-bold">check_circle</span>
                          ) : (
                            <span className="material-symbols-outlined text-outline-variant/50 text-[20px]">horizontal_rule</span>
                          )}
                        </td>
                      ))}
                      <td className="p-4 font-body-sm text-on-surface">{formatCurrency(student.totalPaid)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold border ${
                          student.status === 'Lunas' 
                            ? 'bg-secondary/10 text-secondary border-secondary/20' 
                            : 'bg-error/10 text-error border-error/20'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-on-surface-variant font-body-md">
                      Data siswa tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-on-background/40 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-surface w-full max-w-[448px] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-outline-variant/30 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/30 bg-surface-container-lowest">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Catat Transaksi</h2>
              <button
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 p-1.5 rounded-full transition-colors"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedWeeks([]);
                  setFormData({ type: 'in', description: '', amount: '', date: new Date().toISOString().split('T')[0], student_id: '', period: '' });
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="transaction-form" className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block font-label-md text-on-surface mb-1.5">Jenis Transaksi *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        className="text-secondary focus:ring-secondary border-outline-variant" 
                        name="type" 
                        type="radio" 
                        value="in" 
                        checked={formData.type === 'in'}
                        onChange={handleInputChange}
                      />
                      <span className="font-body-sm text-on-surface">Pemasukan</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        className="text-error focus:ring-error border-outline-variant" 
                        name="type" 
                        type="radio" 
                        value="out" 
                        checked={formData.type === 'out'}
                        onChange={handleInputChange}
                      />
                      <span className="font-body-sm text-on-surface">Pengeluaran</span>
                    </label>
                  </div>
                </div>

                {formData.type === 'in' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-label-md text-on-surface mb-1.5">Siswa *</label>
                      <select
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleInputChange}
                        required={formData.type === 'in'}
                      >
                        <option value="">-- Pilih Siswa --</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-label-md text-on-surface mb-1.5">Periode Bulan *</label>
                      <select 
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
                        name="period"
                        value={formData.period}
                        onChange={handleInputChange}
                        required={formData.type === 'in'}
                      >
                        <option value="">-- Pilih Bulan --</option>
                        <option value="Juli">Juli</option>
                        <option value="Agustus">Agustus</option>
                        <option value="September">September</option>
                        <option value="Oktober">Oktober</option>
                        <option value="November">November</option>
                        <option value="Desember">Desember</option>
                        <option value="Januari">Januari</option>
                        <option value="Februari">Februari</option>
                        <option value="Maret">Maret</option>
                        <option value="April">April</option>
                        <option value="Mei">Mei</option>
                        <option value="Juni">Juni</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-label-md text-on-surface mb-1.5">Keterangan *</label>
                  {formData.type === 'in' && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map(week => {
                        const isPaid = alreadyPaidWeeks.includes(week);
                        const isSelected = selectedWeeks.includes(week);
                        
                        let buttonStyle = 'bg-surface-container border-outline-variant text-on-surface-variant hover:bg-surface-container-high cursor-pointer';
                        if (isPaid) {
                          buttonStyle = 'bg-surface-variant/50 border-outline-variant/30 text-on-surface-variant/50 cursor-not-allowed opacity-60';
                        } else if (isSelected) {
                          buttonStyle = 'bg-primary/10 border-primary text-primary cursor-pointer';
                        }

                        return (
                          <label key={week} className={`flex items-center gap-1.5 border rounded-md px-3 py-1.5 transition-colors ${buttonStyle}`} title={isPaid ? "Sudah dibayar" : ""}>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              disabled={isPaid}
                              checked={isSelected || isPaid}
                              onChange={(e) => {
                                if (isPaid) return;
                                setSelectedWeeks(prev => {
                                  const newWeeks = prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week].sort();
                                  if (newWeeks.length > 0) {
                                    setFormData(d => ({ ...d, description: `Uang Kas Minggu ${newWeeks.join(', ')}` }));
                                  } else {
                                    setFormData(d => ({ ...d, description: '' }));
                                  }
                                  return newWeeks;
                                });
                              }}
                            />
                            <span className="font-label-sm flex items-center gap-1">
                              Minggu {week} 
                              {isPaid && <span className="material-symbols-outlined text-[14px]">check</span>}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60" 
                    placeholder={formData.type === 'in' ? "Contoh: Uang Kas Budi, Donasi..." : "Contoh: Beli Spidol, Print..."} 
                    type="text" 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface mb-1.5">Nominal (Rp) *</label>
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60" 
                    placeholder="0" 
                    type="number" 
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="1"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-on-surface mb-1.5">Tanggal *</label>
                  <input 
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all" 
                    type="date" 
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-outline-variant/30 bg-surface flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-variant/30 transition-colors"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedWeeks([]);
                  setFormData({ type: 'in', description: '', amount: '', date: new Date().toISOString().split('T')[0], student_id: '', period: '' });
                }}
              >
                Batal
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                type="submit"
                form="transaction-form"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Simpan Transaksi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
