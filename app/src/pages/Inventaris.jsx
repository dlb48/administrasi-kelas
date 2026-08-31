import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

export default function Inventaris() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventories, setInventories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKondisi, setFilterKondisi] = useState('All'); // 'All', 'Baik', 'Rusak Ringan', 'Rusak Berat'
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edit & Action states
  const [editingId, setEditingId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openImportDropdown, setOpenImportDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    kode_barang: '',
    nama_barang: '',
    jumlah: 1,
    kondisi: 'Baik',
    lokasi: '',
    keterangan: ''
  });

  const dropdownRef = useRef(null);
  const csvInputRef = useRef(null);
  const mobileImportRef = useRef(null);
  const desktopImportRef = useRef(null);

  // Fetch data on mount
  useEffect(() => {
    fetchInventories();
  }, []);

  const fetchInventories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventaris')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setInventories(data || []);
    } catch (error) {
      console.error('Error fetching inventories:', error.message);
      alert('Gagal memuat data inventaris.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKondisi]);

  // Handle click outside for dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
      if (
        (desktopImportRef.current && !desktopImportRef.current.contains(event.target)) &&
        (mobileImportRef.current && !mobileImportRef.current.contains(event.target))
      ) {
        setOpenImportDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ kode_barang: '', nama_barang: '', jumlah: 1, kondisi: 'Baik', lokasi: '', keterangan: '' });
    setIsModalOpen(true);
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      kode_barang: item.kode_barang || '',
      nama_barang: item.nama_barang,
      jumlah: item.jumlah,
      kondisi: item.kondisi,
      lokasi: item.lokasi || '',
      keterangan: item.keterangan || ''
    });
    setOpenDropdownId(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data barang ini?")) {
      try {
        const { error } = await supabase.from('inventaris').delete().eq('id', id);
        if (error) throw error;
        setInventories(inventories.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting inventory:', error.message);
        alert('Gagal menghapus barang.');
      }
    }
    setOpenDropdownId(null);
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      
      if (rows.length < 2) {
        alert("File CSV kosong atau format tidak valid.");
        setIsLoading(false);
        return;
      }

      // Skip header (rows[0])
      const newItems = [];
      for (let i = 1; i < rows.length; i++) {
        // Split by comma (naive parsing, doesn't handle quoted commas well, but standard for this app)
        const columns = rows[i].split(',');
        if (columns.length >= 2) {
          const kode_barang = columns[0]?.trim() || '';
          const nama_barang = columns[1]?.trim();
          const jumlahRaw = parseInt(columns[2]?.trim());
          const jumlah = isNaN(jumlahRaw) ? 1 : jumlahRaw;
          const kondisi = columns[3]?.trim() || 'Baik';
          const lokasi = columns[4]?.trim() || '';
          const keterangan = columns[5]?.trim() || '';
          
          if (nama_barang) {
            newItems.push({
              kode_barang,
              nama_barang,
              jumlah,
              kondisi,
              lokasi,
              keterangan
            });
          }
        }
      }

      if (newItems.length > 0) {
        try {
          const { error } = await supabase.from('inventaris').insert(newItems);
          if (error) throw error;
          alert(`Berhasil mengimpor ${newItems.length} barang!`);
          fetchInventories(); // Refresh data
        } catch (error) {
          console.error("CSV Import Error:", error);
          alert("Gagal mengimpor data CSV.");
        }
      } else {
        alert("Tidak ada data barang yang valid untuk diimpor.");
      }
      setIsLoading(false);
      // Reset input file
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_barang) {
      alert('Nama barang wajib diisi!');
      return;
    }

    try {
      setIsSubmitting(true);

      const itemData = {
        kode_barang: formData.kode_barang,
        nama_barang: formData.nama_barang,
        jumlah: parseInt(formData.jumlah) || 1,
        kondisi: formData.kondisi,
        lokasi: formData.lokasi,
        keterangan: formData.keterangan
      };

      if (editingId) {
        // Update
        const { data, error } = await supabase
          .from('inventaris')
          .update(itemData)
          .eq('id', editingId)
          .select()
          .single();
          
        if (error) throw error;
        setInventories(inventories.map(s => s.id === editingId ? data : s));
      } else {
        // Insert
        const { data, error } = await supabase
          .from('inventaris')
          .insert([itemData])
          .select()
          .single();
          
        if (error) throw error;
        setInventories([data, ...inventories]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving inventory:', error.message);
      alert('Gagal menyimpan data barang.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const downloadCSV = () => {
    if (inventories.length === 0) {
      alert("Belum ada data barang untuk di-download.");
      return;
    }

    const headers = ['Kode Barang', 'Nama Barang', 'Jumlah', 'Kondisi', 'Lokasi', 'Keterangan'];
    
    const rows = inventories.map(s => [
      s.kode_barang || '',
      s.nama_barang,
      s.jumlah,
      s.kondisi,
      s.lokasi || '',
      s.keterangan || ''
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaris Kelas");
    
    const today = new Date();
    const dateStr = `${today.getDate()}_${today.getMonth()+1}_${today.getFullYear()}`;
    XLSX.writeFile(workbook, `Inventaris_Kelas_${dateStr}.xlsx`);
    
    setOpenImportDropdown(false);
  };

  const downloadTemplate = () => {
    const headers = ['Kode Barang', 'Nama Barang', 'Jumlah', 'Kondisi', 'Lokasi', 'Keterangan'];
    const example = ['BRG-001', 'Spidol Papan Tulis', '5', 'Baik', 'Lemari Depan', 'Warna Hitam'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Inventaris");
    XLSX.writeFile(workbook, `Template_Inventaris.csv`);
    setOpenImportDropdown(false);
  };

  // 1. Filter items logic
  const filteredItems = useMemo(() => {
    return inventories.filter(item => {
      const matchSearch = item.nama_barang.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.kode_barang && item.kode_barang.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.lokasi && item.lokasi.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchKondisi = filterKondisi === 'All' || item.kondisi === filterKondisi;
      return matchSearch && matchKondisi;
    });
  }, [inventories, searchQuery, filterKondisi]);

  // 2. Pagination logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const getPaginationRange = () => {
    const range = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      if (currentPage <= 3) {
        range.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        range.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        range.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return range;
  };

  // 3. Stats logic
  const totalItems = useMemo(() => inventories.reduce((sum, item) => sum + item.jumlah, 0), [inventories]);
  const goodItems = useMemo(() => inventories.filter(i => i.kondisi === 'Baik').reduce((sum, item) => sum + item.jumlah, 0), [inventories]);
  const damagedItems = useMemo(() => inventories.filter(i => i.kondisi !== 'Baik').reduce((sum, item) => sum + item.jumlah, 0), [inventories]);

  return (
    <>
      <input type="file" accept=".csv" className="hidden" ref={csvInputRef} onChange={handleCSVImport} />
      
      {/* Mobile Actions (Search & Add) */}
      <div className="md:hidden flex flex-col gap-md mb-lg">
        <div className="flex gap-2">
          <button
            className="flex-1 flex justify-center items-center gap-2 bg-primary text-on-primary px-4 py-3 rounded-xl font-title-lg text-title-lg hover:bg-primary/90 transition-colors shadow-sm"
            onClick={openAddModal}
          >
            <span className="material-symbols-outlined">add</span>
            Barang
          </button>
        <div className="flex-1 relative" ref={mobileImportRef}>
          <button
            className="w-full h-full flex justify-center items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-3 rounded-xl font-title-lg text-title-lg hover:bg-surface-variant/30 transition-colors shadow-sm"
            onClick={() => setOpenImportDropdown(!openImportDropdown)}
          >
            <span className="material-symbols-outlined">upload_file</span>
            Opsi
            <span className="material-symbols-outlined">{openImportDropdown ? 'expand_less' : 'expand_more'}</span>
          </button>
          {openImportDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
              <button 
                onClick={downloadCSV}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Download Data
              </button>
              <button 
                onClick={downloadTemplate}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">description</span> Template CSV
              </button>
              <button 
                onClick={() => {
                  csvInputRef.current?.click();
                  setOpenImportDropdown(false);
                }}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span> Upload
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/50 focus-within:border-primary transition-colors">
          <span className="material-symbols-outlined text-outline mr-2">search</span>
          <input 
            className="bg-transparent border-none outline-none text-body-md font-body-md text-on-surface w-full p-0 focus:ring-0 placeholder:text-outline" 
            placeholder="Cari nama barang atau lokasi..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:flex justify-between items-center mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Inventaris Kelas</h2>
        </div>
        <div className="flex items-center gap-md">
        <div className="relative" ref={desktopImportRef}>
          <button
            className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2 rounded-full font-label-md text-label-md hover:bg-surface-variant/30 transition-colors shadow-sm"
            onClick={() => setOpenImportDropdown(!openImportDropdown)}
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            Opsi Ekspor/Impor
            <span className="material-symbols-outlined text-[18px]">{openImportDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
          </button>
          
          {openImportDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
              <button 
                onClick={downloadCSV}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Download Excel
              </button>
              <button 
                onClick={downloadTemplate}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">description</span> Template CSV
              </button>
              <button 
                onClick={() => {
                  csvInputRef.current?.click();
                  setOpenImportDropdown(false);
                }}
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span> Upload CSV
              </button>
            </div>
          )}
        </div>
        
        <div className="w-px h-6 bg-outline-variant/50 mx-1"></div>
          
          <div className="flex items-center bg-surface-container rounded-full px-4 py-2 w-64 border border-transparent focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-outline mr-2 text-[20px]">search</span>
            <input 
              className="bg-transparent border-none outline-none text-body-sm font-body-sm text-on-surface w-full p-0 focus:ring-0 placeholder:text-outline" 
              placeholder="Cari nama barang..." 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm hover:shadow-md"
            onClick={openAddModal}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tambah Barang
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-sm md:gap-md mb-lg">
        <div className="bg-surface border border-outline-variant/50 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
          <span className="material-symbols-outlined text-primary text-[32px] mb-2">inventory_2</span>
          <div className="font-headline-sm text-on-surface font-bold">{totalItems}</div>
          <div className="font-label-sm text-on-surface-variant mt-1">Total Barang</div>
        </div>
        <div className="bg-surface border border-outline-variant/50 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
          <span className="material-symbols-outlined text-success text-[32px] mb-2">check_circle</span>
          <div className="font-headline-sm text-on-surface font-bold">{goodItems}</div>
          <div className="font-label-sm text-on-surface-variant mt-1">Kondisi Baik</div>
        </div>
        <div className="bg-surface border border-outline-variant/50 rounded-xl p-4 flex flex-col justify-center items-center text-center shadow-sm">
          <span className="material-symbols-outlined text-error text-[32px] mb-2">warning</span>
          <div className="font-headline-sm text-on-surface font-bold">{damagedItems}</div>
          <div className="font-label-sm text-on-surface-variant mt-1">Kondisi Rusak</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-sm mb-lg">
        <button 
          onClick={() => setFilterKondisi('All')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterKondisi === 'All' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Semua Kondisi
        </button>
        <button 
          onClick={() => setFilterKondisi('Baik')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterKondisi === 'Baik' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Baik
        </button>
        <button 
          onClick={() => setFilterKondisi('Rusak Ringan')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterKondisi === 'Rusak Ringan' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Rusak Ringan
        </button>
        <button 
          onClick={() => setFilterKondisi('Rusak Berat')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterKondisi === 'Rusak Berat' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Rusak Berat
        </button>
      </div>

      {/* Data Table / List */}
      <div className="bg-surface border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm min-h-[300px]" ref={dropdownRef}>
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-surface-container-low border-b border-outline-variant/30 font-label-md text-label-md text-on-surface-variant">
          <div className="col-span-1">No</div>
          <div className="col-span-4">Nama Barang</div>
          <div className="col-span-1 text-center">Jumlah</div>
          <div className="col-span-2">Kondisi</div>
          <div className="col-span-3">Lokasi & Keterangan</div>
          <div className="col-span-1 text-center">Aksi</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Inventory Rows */}
            {paginatedItems.map((item, index) => {
              const kondisiColors = {
                'Baik': 'bg-success/10 text-success border-success/20',
                'Rusak Ringan': 'bg-warning/10 text-warning border-warning/20',
                'Rusak Berat': 'bg-error/10 text-error border-error/20'
              };
              const kColor = kondisiColors[item.kondisi] || 'bg-surface-variant text-on-surface-variant border-outline-variant/50';

              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors items-center relative group">
                  <div className="hidden md:block col-span-1 font-body-sm text-on-surface-variant">
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </div>
                  <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0 border border-outline-variant/50">
                      <span className="material-symbols-outlined text-[20px]">category</span>
                    </div>
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface">
                        {item.kode_barang && <span className="text-primary font-bold mr-2">[{item.kode_barang}]</span>}
                        {item.nama_barang}
                      </h3>
                      <p className="md:hidden font-body-sm text-on-surface-variant mt-1">
                        Jumlah: {item.jumlah} • Lokasi: {item.lokasi || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:block col-span-1 font-title-md text-on-surface text-center">
                    {item.jumlah}
                  </div>
                  <div className="col-span-1 md:col-span-2 mt-2 md:mt-0 flex">
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium border ${kColor}`}>
                      {item.kondisi}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-3 font-body-sm text-on-surface mt-1 md:mt-0">
                    <div className="flex flex-col gap-1">
                      {item.lokasi && (
                        <div className="flex items-start gap-1">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-0.5">place</span>
                          <span className="text-on-surface-variant line-clamp-1">{item.lokasi}</span>
                        </div>
                      )}
                      {item.keterangan && (
                        <div className="flex items-start gap-1">
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0 mt-0.5">notes</span>
                          <span className="text-on-surface-variant line-clamp-1 italic">{item.keterangan}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Aksi */}
                  <div className="absolute right-4 top-4 md:static md:col-span-1 flex justify-center">
                    <div className="relative">
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                        className="p-2 text-outline hover:text-primary hover:bg-surface-variant/50 rounded-full transition-colors focus:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdownId === item.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span> Ubah
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(item.id)}
                            className="px-4 py-2 text-left text-body-sm text-error hover:bg-error/10 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span> Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">search_off</span>
                <p>Data barang tidak ditemukan.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && !isLoading && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <p className="font-body-sm text-on-surface-variant text-sm">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} dari {filteredItems.length} barang
          </p>
          <div className="flex gap-2 items-center">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-variant/30 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            
            {getPaginationRange().map((page, idx) => (
              page === '...' ? (
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-on-surface-variant font-label-md">
                  ...
                </span>
              ) : (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded font-label-md transition-colors ${
                    currentPage === page 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'border border-outline-variant text-on-surface-variant hover:bg-surface-variant/30'
                  }`}
                >
                  {page}
                </button>
              )
            ))}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-variant/30 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Inventory */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-on-background/40 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div
            className="modal-content bg-surface w-full max-w-[500px] rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden border border-outline-variant/30 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {isSubmitting && (
              <div className="absolute inset-0 bg-surface/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-outline-variant/30 shrink-0 bg-surface-container-lowest">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {editingId ? 'Ubah Data Barang' : 'Tambah Barang Baru'}
              </h2>
              <button
                disabled={isSubmitting}
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 p-1.5 rounded-full transition-colors disabled:opacity-50"
                onClick={() => setIsModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form id="inventory-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">Kode Barang</label>
                    <input 
                      name="kode_barang"
                      value={formData.kode_barang}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                      placeholder="Contoh: BRG-001" 
                      type="text" 
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">Nama Barang *</label>
                    <input 
                      name="nama_barang"
                      value={formData.nama_barang}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                      placeholder="Contoh: Spidol Papan Tulis" 
                      type="text" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">Jumlah *</label>
                    <input 
                      name="jumlah"
                      value={formData.jumlah}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                      min="1"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all disabled:opacity-70" 
                      type="number" 
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">Kondisi</label>
                    <select 
                      name="kondisi"
                      value={formData.kondisi}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all disabled:opacity-70"
                    >
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Lokasi / Tempat</label>
                  <input 
                    name="lokasi"
                    value={formData.lokasi}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                    placeholder="Contoh: Lemari Depan, Meja Guru" 
                    type="text" 
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Keterangan Tambahan</label>
                  <textarea 
                    name="keterangan"
                    value={formData.keterangan}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    rows="3"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70 resize-none custom-scrollbar" 
                    placeholder="Catatan tambahan mengenai barang ini..."
                  ></textarea>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/30 shrink-0 bg-surface flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-variant/50 transition-colors disabled:opacity-50"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                form="inventory-form"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl font-label-md text-label-md bg-primary hover:bg-on-primary-fixed-variant text-on-primary transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Simpan Data
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
