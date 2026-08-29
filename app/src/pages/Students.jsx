import { useState, useRef, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';

const ITEMS_PER_PAGE = 10;

export default function Students() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('All'); // 'All', 'L', 'P'
  const [currentPage, setCurrentPage] = useState(1);
  
  // Edit & Action states
  const [editingId, setEditingId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openImportDropdown, setOpenImportDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    nisn: '',
    gender: 'L',
    studentPhone: '',
    parentPhone: '',
    password: '12345',
    roles: []
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const csvInputRef = useRef(null);
  const mobileImportRef = useRef(null);
  const desktopImportRef = useRef(null);

  // Image Compression Utility
  const compressImage = (file, maxSizeKB = 200) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down proportionally (max 800px)
          const MAX_DIMENSION = 800;
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Iterate quality to meet target size
          const attemptCompression = (quality) => {
            canvas.toBlob((blob) => {
              if (!blob) return reject(new Error('Compression failed'));
              
              if (blob.size / 1024 <= maxSizeKB || quality <= 0.1) {
                // Return as new File object (forced to jpeg)
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(newFile);
              } else {
                attemptCompression(quality - 0.15); // Reduce quality further
              }
            }, 'image/jpeg', quality);
          };

          attemptCompression(0.85); // Start with 85% quality
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Fetch data on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error.message);
      alert('Gagal memuat data siswa.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterGender]);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ name: '', nisn: '', gender: 'L', studentPhone: '', parentPhone: '', password: '12345', roles: [] });
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (student) => {
    setEditingId(student.id);
    setFormData({
      name: student.name,
      nisn: student.nisn,
      gender: student.gender,
      studentPhone: student.student_phone || '',
      parentPhone: student.parent_phone || '',
      password: student.password || '',
      roles: student.role ? student.role.split(',').filter(Boolean) : []
    });
    setPhotoFile(null);
    setPhotoPreview(student.photo_url);
    setOpenDropdownId(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data siswa ini?")) {
      try {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        setStudents(students.filter(s => s.id !== id));
      } catch (error) {
        console.error('Error deleting student:', error.message);
        alert('Gagal menghapus siswa.');
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
      const newStudents = [];
      for (let i = 1; i < rows.length; i++) {
        // Split by comma (naive parsing, doesn't handle quoted commas)
        const columns = rows[i].split(',');
        if (columns.length >= 3) {
          const name = columns[0]?.trim();
          const nisn = columns[1]?.trim();
          const genderRaw = columns[2]?.trim().toUpperCase();
          const studentPhone = columns[3]?.trim() || '';
          const parentPhone = columns[4]?.trim() || '';
          
          if (name && nisn) {
            newStudents.push({
              name,
              nisn,
              gender: (genderRaw === 'P' || genderRaw === 'PEREMPUAN') ? 'P' : 'L',
              student_phone: studentPhone,
              parent_phone: parentPhone,
              password: '12345',
              role: ''
            });
          }
        }
      }

      if (newStudents.length > 0) {
        try {
          const { error } = await supabase.from('students').insert(newStudents);
          if (error) throw error;
          alert(`Berhasil mengimpor ${newStudents.length} siswa!`);
          fetchStudents(); // Refresh data
        } catch (error) {
          console.error("CSV Import Error:", error);
          if (error.code === '23505') {
            alert("Gagal mengimpor: Ada NISN dalam file yang sudah ada di database (duplikat).");
          } else {
            alert("Gagal mengimpor data CSV.");
          }
        }
      } else {
        alert("Tidak ada data siswa yang valid untuk diimpor.");
      }
      setIsLoading(false);
      // Reset input file
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const uploadPhoto = async () => {
    if (!photoFile) return photoPreview; // If no new photo, return existing URL/null
    
    try {
      // Compress image to ~200kb max before upload
      const compressedFile = await compressImage(photoFile, 200);
      
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, compressedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error.message);
      alert('Gagal mengunggah foto. Data akan disimpan tanpa foto baru.');
      return photoPreview; // Fallback to existing
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.nisn) {
      alert('Nama dan NISN wajib diisi!');
      return;
    }

    // Pengecekan NISN duplikat di sisi klien terlebih dahulu (akan dicek lagi oleh constraint DB)
    const isDuplicate = students.some(s => s.nisn === formData.nisn && s.id !== editingId);
    if (isDuplicate) {
      alert('NISN sudah terdaftar. Silakan gunakan NISN yang berbeda.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const finalPhotoUrl = await uploadPhoto();

      const studentData = {
        name: formData.name,
        nisn: formData.nisn,
        gender: formData.gender,
        student_phone: formData.studentPhone,
        parent_phone: formData.parentPhone,
        password: formData.password,
        role: formData.roles.join(','),
        photo_url: finalPhotoUrl
      };

      if (editingId) {
        // Update
        const { data, error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingId)
          .select()
          .single();
          
        if (error) throw error;
        
        setStudents(students.map(s => s.id === editingId ? data : s));
      } else {
        // Insert
        const { data, error } = await supabase
          .from('students')
          .insert([studentData])
          .select()
          .single();
          
        if (error) throw error;
        
        setStudents([data, ...students]);
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving student:', error.message);
      alert(error.code === '23505' ? 'NISN sudah terdaftar di database.' : 'Gagal menyimpan data siswa.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 1. Filter students logic
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || student.nisn.includes(searchQuery);
      const matchGender = filterGender === 'All' || student.gender === filterGender;
      return matchSearch && matchGender;
    });
  }, [students, searchQuery, filterGender]);

  // 2. Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

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
            Siswa
          </button>
        <div className="flex-1 relative" ref={mobileImportRef}>
          <button
            className="w-full h-full flex justify-center items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-3 rounded-xl font-title-lg text-title-lg hover:bg-surface-variant/30 transition-colors shadow-sm"
            onClick={() => setOpenImportDropdown(!openImportDropdown)}
          >
            <span className="material-symbols-outlined">upload_file</span>
            CSV
            <span className="material-symbols-outlined">{openImportDropdown ? 'expand_less' : 'expand_more'}</span>
          </button>
          {openImportDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
              <a 
                href="/contoh_data_siswa.csv" download
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                onClick={() => setOpenImportDropdown(false)}
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Template
              </a>
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
            placeholder="Cari nama atau NISN..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:flex justify-between items-center mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Data Siswa</h2>
        </div>
        <div className="flex items-center gap-md">
        <div className="relative" ref={desktopImportRef}>
          <button
            className="flex items-center gap-2 border border-outline-variant text-on-surface-variant px-4 py-2 rounded-full font-label-md text-label-md hover:bg-surface-variant/30 transition-colors shadow-sm"
            onClick={() => setOpenImportDropdown(!openImportDropdown)}
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Import CSV
            <span className="material-symbols-outlined text-[18px]">{openImportDropdown ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
          </button>
          
          {openImportDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
              <a 
                href="/contoh_data_siswa.csv" download
                className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                onClick={() => setOpenImportDropdown(false)}
              >
                <span className="material-symbols-outlined text-[18px]">download</span> Download Template
              </a>
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
              placeholder="Cari nama atau NISN..." 
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
            Tambah
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-sm mb-lg">
        <button 
          onClick={() => setFilterGender('All')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterGender === 'All' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Semua
        </button>
        <button 
          onClick={() => setFilterGender('L')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterGender === 'L' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Laki-laki (L)
        </button>
        <button 
          onClick={() => setFilterGender('P')}
          className={`px-4 py-1.5 rounded-full border font-label-md text-label-md transition-colors ${filterGender === 'P' ? 'border-primary bg-primary-container/10 text-primary' : 'border-outline-variant text-on-surface-variant bg-surface hover:bg-surface-variant/30'}`}
        >
          Perempuan (P)
        </button>
        
      </div>

      {/* Data Table / List */}
      <div className="bg-surface border border-outline-variant/50 rounded-xl overflow-hidden shadow-sm min-h-[300px]" ref={dropdownRef}>
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-surface-container-low border-b border-outline-variant/30 font-label-md text-label-md text-on-surface-variant">
          <div className="col-span-1">No</div>
          <div className="col-span-4">Nama Siswa</div>
          <div className="col-span-2">NISN</div>
          <div className="col-span-1">L/P</div>
          <div className="col-span-3">Akses & Login</div>
          <div className="col-span-1 text-center">Aksi</div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Student Rows */}
            {paginatedStudents.map((student, index) => {
              return (
                <div key={student.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 p-4 border-b border-outline-variant/30 hover:bg-surface-container-lowest/50 transition-colors items-center relative group">
                  <div className="hidden md:block col-span-1 font-body-sm text-on-surface-variant">
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </div>
                  <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                  {student.photo_url && (
                    <img src={student.photo_url} alt={student.name} className="w-10 h-10 rounded-full object-cover border border-outline-variant/50 shrink-0" />
                  )}
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface">{student.name}</h3>
                      <p className="md:hidden font-body-sm text-on-surface-variant mt-1">NISN: {student.nisn} • {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </div>
                  </div>
                  <div className="hidden md:block col-span-2 font-body-sm text-on-surface">
                    <div className="text-on-surface-variant">{student.nisn}</div>
                  </div>
                  <div className="hidden md:block col-span-1 font-body-sm text-on-surface">{student.gender}</div>
                  <div className="col-span-1 md:col-span-3 mt-2 md:mt-0 flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1 mb-1">
                      {student.role ? student.role.split(',').filter(Boolean).map((r, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                          {r}
                        </span>
                      )) : (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-surface-variant text-on-surface-variant border border-outline-variant/50">
                          Tidak Ada Akses
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-outline-variant">key</span>
                      <span className="font-body-sm text-on-surface">{student.password || <span className="text-on-surface-variant/50 italic">Belum diatur</span>}</span>
                    </div>
                  </div>
                  
                  {/* Aksi */}
                  <div className="absolute right-4 top-4 md:static md:col-span-1 flex justify-center">
                    <div className="relative">
                      <button 
                        onClick={() => setOpenDropdownId(openDropdownId === student.id ? null : student.id)}
                        className="p-2 text-outline hover:text-primary hover:bg-surface-variant/50 rounded-full transition-colors focus:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdownId === student.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-surface border border-outline-variant rounded-md shadow-lg py-1 z-10 flex flex-col">
                          <button 
                            onClick={() => handleEditClick(student)}
                            className="px-4 py-2 text-left text-body-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span> Ubah
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(student.id)}
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

            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">search_off</span>
                <p>Data siswa tidak ditemukan.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && !isLoading && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <p className="font-body-sm text-on-surface-variant text-sm">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} dari {filteredStudents.length} total siswa
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

      {/* Modal: Add/Edit Student */}
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
                {editingId ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
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
              <form id="student-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Photo Upload area */}
                <div className="flex flex-col items-center gap-3 mb-2">
                  <label className="w-24 h-24 rounded-full bg-surface-variant border border-dashed border-outline flex flex-col items-center justify-center text-outline cursor-pointer hover:bg-surface-container transition-colors relative overflow-hidden group">
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-white">edit</span>
                        </div>
                      </>
                    ) : (
                      <span className="material-symbols-outlined text-[32px]">add_a_photo</span>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      disabled={isSubmitting}
                    />
                  </label>
                  <div className="flex gap-4 items-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Ambil Foto / Upload (Opsional)</span>
                    {photoPreview && (
                      <button 
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          setPhotoFile(null); // Assuming setPhotoFile exists to clear pending uploads
                        }}
                        className="font-label-sm text-label-sm text-error hover:bg-error/10 px-2 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                {/* Input Fields */}
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Nama Lengkap *</label>
                  <input 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                    placeholder="Masukkan nama lengkap" 
                    type="text" 
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">NISN *</label>
                  <input 
                    name="nisn"
                    value={formData.nisn}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                    placeholder="Nomor Induk Siswa Nasional" 
                    type="text" 
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-2">Jenis Kelamin *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        name="gender" 
                        value="L"
                        checked={formData.gender === 'L'}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="text-primary focus:ring-primary border-outline-variant disabled:opacity-70" 
                        type="radio" 
                      />
                      <span className="font-body-sm text-on-surface">Laki-laki</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        name="gender" 
                        value="P"
                        checked={formData.gender === 'P'}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="text-primary focus:ring-primary border-outline-variant disabled:opacity-70" 
                        type="radio" 
                      />
                      <span className="font-body-sm text-on-surface">Perempuan</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">No. WA Siswa (Opsional)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-outline-variant bg-surface-container-low text-on-surface-variant font-body-md">+62</span>
                      <input 
                        name="studentPhone"
                        value={formData.studentPhone}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full min-w-0 bg-surface-container-lowest border border-outline-variant rounded-r-lg px-3 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                        placeholder="812..." 
                        type="tel" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">No. WA Orang Tua (Opsional)</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-outline-variant bg-surface-container-low text-on-surface-variant font-body-md">+62</span>
                      <input 
                        name="parentPhone"
                        value={formData.parentPhone}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full min-w-0 bg-surface-container-lowest border border-outline-variant rounded-r-lg px-3 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70" 
                        placeholder="812..." 
                        type="tel" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-1.5">Password (Untuk Login Siswa) *</label>
                  <input 
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 text-body-md font-body-md text-on-surface focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-outline/60 disabled:opacity-70"
                    placeholder="Masukkan password untuk siswa..." 
                    type="text" 
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-2">Hak Akses Menu (Pilih yang diizinkan)</label>
                  <div className="grid grid-cols-2 gap-3 bg-surface-container-lowest border border-outline-variant p-4 rounded-lg">
                    {[
                      { id: 'dashboard', label: 'Beranda (Dashboard)' },
                      { id: 'students', label: 'Data Siswa (Students)' },
                      { id: 'attendance', label: 'Presensi (Kehadiran)' },
                      { id: 'class_fund', label: 'Uang Kas' },
                      { id: 'report_attendance', label: 'Laporan Kehadiran' },
                      { id: 'report_class_fund', label: 'Laporan Kas Kelas' }
                    ].map(menu => (
                      <label key={menu.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary disabled:opacity-70"
                          checked={formData.roles.includes(menu.id)}
                          disabled={isSubmitting}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({ ...prev, roles: [...prev.roles, menu.id] }));
                            } else {
                              setFormData(prev => ({ ...prev, roles: prev.roles.filter(r => r !== menu.id) }));
                            }
                          }}
                        />
                        <span className="font-body-sm text-on-surface">{menu.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-outline-variant/30 shrink-0 bg-surface flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-variant/30 transition-colors disabled:opacity-50"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                form="student-form"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Menyimpan...
                  </>
                ) : editingId ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
