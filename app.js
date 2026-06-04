// ================= CORE DATABASE & SECURITY =================
let db = { master: [], masuk: [], keluar: [], rusak: [] };

if(localStorage.getItem('gudang_db')) {
    db = JSON.parse(localStorage.getItem('gudang_db'));
}

window.addEventListener('DOMContentLoaded', () => {
    const loginStatus = localStorage.getItem('isLoggedIn');
    if (loginStatus === 'true') {
        showApp();
        switchTab(localStorage.getItem('currentTab') || 'beranda');
    } else {
        localStorage.removeItem('currentTab'); 
        showLogin();
    }
    refreshAllTables();
    populateSelectOptions();
});

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if (document.getElementById('username').value === 'GUDANG' && document.getElementById('password').value === 'Kernaden17') {
        localStorage.setItem('isLoggedIn', 'true');
        showApp();
        switchTab('beranda');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
});

function showLogin() { document.getElementById('loginPage').style.display = 'flex'; document.getElementById('mainApp').style.display = 'none'; }
function showApp() { document.getElementById('loginPage').style.display = 'none'; document.getElementById('mainApp').style.display = 'flex'; }
function logout() { localStorage.removeItem('isLoggedIn'); localStorage.removeItem('currentTab'); showLogin(); }

function switchTab(tabId) {
    if (localStorage.getItem('isLoggedIn') !== 'true') { showLogin(); return; }
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-300', 'hover:bg-slate-800');
    });
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    if(document.getElementById('btn-' + tabId)) document.getElementById('btn-' + tabId).classList.add('bg-blue-600', 'text-white');
    localStorage.setItem('currentTab', tabId);
    if(tabId === 'laporan') populateSelectOptions();
}

function saveData() {
    localStorage.setItem('gudang_db', JSON.stringify(db));
    refreshAllTables();
    populateSelectOptions();
}

// ================= FUNGSI BANTU FORMAT TANGGAL (DD/MM/YYYY) =================
function formatTanggalIndo(dateString) {
    if (!dateString) return '-';
    if (dateString.includes('-')) {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    return dateString;
}

// ================= STOK ENGINE =================
function hitungStokBagus(kode, ignoreIndex = -1, type = '') {
    let kodeClean = kode.trim();
    let totalMasuk = db.masuk.filter((x, idx) => x.kode.trim() === kodeClean && !(type === 'masuk' && idx === ignoreIndex)).reduce((sum, i) => sum + i.qty, 0);
    let totalKeluar = db.keluar.filter((x, idx) => x.kode.trim() === kodeClean && !(type === 'keluar' && idx === ignoreIndex)).reduce((sum, i) => sum + i.qty, 0);
    return totalMasuk - totalKeluar;
}

function hitungStokRusak(kode) {
    return db.rusak.reduce((sum, i) => i.kode.trim() === kode.trim() ? sum + i.qty : sum, 0);
}

function resetSearchFilter() {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('searchStartDate').value = '';
    document.getElementById('searchEndDate').value = '';
    refreshAllTables();
}

// ================= HANDLER FORMULIR CRUD MULTI-MODUL =================

// 1. DATA MASTER BARANG
document.getElementById('formMaster').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 1. Ambil data dari form
    const idx = document.getElementById('m_index').value;
    const data = { 
        tanggal: document.getElementById('m_tanggal').value,
        kode: document.getElementById('m_kode').value.trim(),
        nama: document.getElementById('m_nama').value,
        satuan: document.getElementById('m_satuan').value 
    };

    // 2. Logika Simpan (Tambah vs Update)
    if (idx === "") { 
        // Tambah Baru: Validasi duplikasi kode
        if(db.master.find(item => item.kode.toLowerCase() === data.kode.toLowerCase())) { 
            alert('Kode barang sudah terdaftar!'); 
            return; 
        }
        db.master.push(data);
    } else { 
        // Update: Cek apakah kode berubah (perlu update referensi di tabel lain)
        const oldKode = db.master[idx].kode;
        if(oldKode !== data.kode) {
            // Update kode di riwayat transaksi agar data tidak terputus
            ['masuk','keluar','rusak'].forEach(t => {
                db[t].forEach(x => { if(x.kode === oldKode) x.kode = data.kode; });
            });
        }
        db.master[idx] = data;
    }

    // 3. Simpan data & Reset UI
    // Contoh di dalam formMaster submit handler:
saveData(); 
this.reset();
toggleForm('formMasterContainer', false);

// Reset teks tombol master setelah simpan
const btnToggleMaster = document.getElementById('btnToggleMaster');
if (btnToggleMaster) {
    btnToggleMaster.innerText = "+ Tambah Master Barang Baru";
    btnToggleMaster.className = "bg-blue-600 text-white py-2 px-6 rounded-xl hover:bg-blue-700 transition";
}
    
    // Reset state index dan teks tombol kembali ke mode "Tambah"
    document.getElementById('m_index').value = "";
    document.getElementById('titleMaster').innerText = "Tambah Master Barang Baru";
    document.getElementById('btnSubmitMaster').innerText = "Simpan Master Barang";
    
    // 4. Tutup form secara otomatis
    toggleForm('formMasterContainer', false);
    
    // Tambahan: Refresh tampilan agar perubahan langsung terlihat
    refreshAllTables();
});

function editMaster(i) {
    toggleForm('formMasterContainer', true); // Buka otomatis
    document.getElementById('m_index').value = i;
    document.getElementById('m_tanggal').value = db.master[i].tanggal;
    document.getElementById('m_kode').value = db.master[i].kode;
    document.getElementById('m_nama').value = db.master[i].nama;
    document.getElementById('m_satuan').value = db.master[i].satuan;
    document.getElementById('titleMaster').innerText = "Ubah Data Master Barang";
    document.getElementById('btnSubmitMaster').innerText = "Perbarui Master Barang";
}

function hapusMaster(i) {
    if(confirm('Hapus item ini? Semua riwayat transaksi dengan kode ini juga akan ikut terhapus otomatis.')) {
        const kode = db.master[i].kode;
        db.masuk = db.masuk.filter(x => x.kode !== kode);
        db.keluar = db.keluar.filter(x => x.kode !== kode);
        db.rusak = db.rusak.filter(x => x.kode !== kode);
        db.master.splice(i, 1);
        saveData();
    }
}

// 2. BARANG MASUK
document.getElementById('formMasuk').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('in_index').value;
    const data = {
        tanggal: document.getElementById('in_tanggal').value,
        kode: document.getElementById('in_kode').value,
        qty: parseInt(document.getElementById('in_qty').value),
        ket: document.getElementById('in_ket').value
    };
    if (idx === "") { db.masuk.push(data); } 
    else {
        db.masuk[idx] = data;
        document.getElementById('in_index').value = "";
        document.getElementById('titleMasuk').innerText = "Input Barang Masuk (Suplai)";
        document.getElementById('btnSubmitMasuk').innerText = "Simpan Barang Masuk";
    }
    saveData(); this.reset();
    toggleForm('formMasukContainer', false); // Tutup otomatis
});

function editMasuk(i) {
    // 1. Validasi keberadaan data sebelum proses
    if (!db.masuk[i]) {
        alert("Data tidak ditemukan!");
        return;
    }

    // 2. Buka form dan scroll ke area input
    toggleForm('formMasukContainer', true);

    // 3. Isi data ke form
    const item = db.masuk[i];
    document.getElementById('in_index').value = i;
    document.getElementById('in_tanggal').value = item.tanggal;
    document.getElementById('in_kode').value = item.kode;
    document.getElementById('in_qty').value = item.qty;
    document.getElementById('in_ket').value = item.ket;

    // 4. Ubah label UI agar user tahu mereka sedang dalam mode 'Edit'
    const title = document.getElementById('titleMasuk');
    const btn = document.getElementById('btnSubmitMasuk');
    
    if (title) title.innerText = "Ubah Data Transaksi Masuk";
    if (btn) btn.innerText = "Perbarui Data Masuk";
}
function hapusMasuk(i) {
    if (confirm('Hapus log riwayat barang masuk ini? (Peringatan: Data barang keluar dengan kode yang sama juga akan terhapus)')) {
        // 1. Ambil kode barang dari item yang akan dihapus
        const kodeBarang = db.masuk[i].kode;

        // 2. Hapus item dari db.masuk
        db.masuk.splice(i, 1);

        // 3. Hapus SEMUA item di db.keluar yang kodenya sama dengan kodeBarang
        // Kita gunakan filter agar hanya menyisakan data yang kodenya BERBEDA
        db.keluar = db.keluar.filter(item => item.kode !== kodeBarang);

        // 4. Simpan perubahan dan refresh tampilan
        saveData();
        
        // Panggil fungsi render ulang tabel jika Anda memilikinya, contoh:
        // renderTabel(); 
    }
}

// 3. BARANG KELUAR
document.getElementById('formKeluar').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('out_index').value;
    const data = {
        tanggal: document.getElementById('out_tanggal').value,
        kode: document.getElementById('out_kode').value,
        qty: parseInt(document.getElementById('out_qty').value),
        ket: document.getElementById('out_ket').value
    };
    const currentIdx = idx === "" ? -1 : parseInt(idx);
    if(data.qty > hitungStokBagus(data.kode, currentIdx, 'keluar')) { alert('Stok tidak cukup!'); return; }
    
    if (idx === "") { db.keluar.push(data); } 
    else {
        db.keluar[idx] = data;
        document.getElementById('out_index').value = "";
        document.getElementById('titleKeluar').innerText = "Input Barang Keluar (Produksi)";
        document.getElementById('btnSubmitKeluar').innerText = "Simpan Barang Keluar";
    }
    saveData(); this.reset();
    toggleForm('formKeluarContainer', false);
});

function editKeluar(i) {
    const item = db.keluar[i];
    document.getElementById('out_index').value = i;
    document.getElementById('out_tanggal').value = item.tanggal;
    document.getElementById('out_kode').value = item.kode;
    document.getElementById('out_qty').value = item.qty;
    document.getElementById('out_ket').value = item.ket;
    
    document.getElementById('titleKeluar').innerText = "Ubah Data Transaksi Keluar";
    document.getElementById('btnSubmitKeluar').innerText = "Perbarui Data";
    
    toggleForm('formKeluarContainer', true);
}
function hapusKeluar(i) { if(confirm('Hapus log barang keluar ini?')) { db.keluar.splice(i, 1); saveData(); } }
document.getElementById('formRusak').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('bad_index').value;
    const data = {
        tanggal: document.getElementById('bad_tanggal').value,
        kode: document.getElementById('bad_kode').value,
        qty: parseInt(document.getElementById('bad_qty').value),
        ket: document.getElementById('bad_ket').value
    };
    // (Tambahkan logika validasi stok rusak di sini sesuai kebutuhan Anda)
    
    if (idx === "") { db.rusak.push(data); } 
    else {
        db.rusak[idx] = data;
        document.getElementById('bad_index').value = "";
        document.getElementById('titleRusak').innerText = "Input Barang Rusak (Karantina)";
        document.getElementById('btnSubmitRusak').innerText = "Simpan Rekam Rusak";
    }
    saveData(); this.reset();
    toggleForm('formRusakContainer', false);
});

function editRusak(i) {
    toggleForm('formRusakContainer', true);
    document.getElementById('bad_index').value = i;
    document.getElementById('bad_tanggal').value = db.rusak[i].tanggal;
    document.getElementById('bad_kode').value = db.rusak[i].kode;
    document.getElementById('bad_qty').value = db.rusak[i].qty;
    document.getElementById('bad_ket').value = db.rusak[i].ket;
    document.getElementById('titleRusak').innerText = "Ubah Data Log Barang Rusak";
    document.getElementById('btnSubmitRusak').innerText = "Perbarui Data Rusak";
}

function hapusRusak(i) { if(confirm('Hapus log barang rusak ini?')) { db.rusak.splice(i, 1); saveData(); } }

// ================= SYNC DATA KE ELEMENT UI =================
function populateSelectOptions() {
    const options = db.master.map(item => `<option value="${item.kode}">${item.kode} - ${item.nama}</option>`).join('');
    ['in_kode', 'out_kode', 'bad_kode'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerHTML = options; });
    if(document.getElementById('filterItem')) document.getElementById('filterItem').innerHTML = '<option value="ALL">-- Semua Item --</option>' + options;
}

function refreshAllTables() {
    const keyword = document.getElementById('searchKeyword').value.toLowerCase().trim();
    const startDate = document.getElementById('searchStartDate').value;
    const endDate = document.getElementById('searchEndDate').value;

    const filteredMaster = db.master.filter(item => {
        const matchKeyword = item.nama.toLowerCase().includes(keyword) || item.kode.toLowerCase().includes(keyword);
        let matchDate = true;
        if (startDate) matchDate = matchDate && (item.tanggal >= startDate);
        if (endDate) matchDate = matchDate && (item.tanggal <= endDate);
        return matchKeyword && matchDate;
    });

    const filteredMasuk = db.masuk.filter(item => {
        const masterItem = db.master.find(m => m.kode.trim().toLowerCase() === item.kode.trim().toLowerCase());
        const namaBarang = masterItem ? masterItem.nama.toLowerCase() : '';
        const kodeBarang = item.kode.toLowerCase();
        
        const matchKeyword = namaBarang.includes(keyword) || kodeBarang.includes(keyword);
        let matchDate = true;
        if (startDate) matchDate = matchDate && (item.tanggal >= startDate);
        if (endDate) matchDate = matchDate && (item.tanggal <= endDate);
        
        return matchKeyword && matchDate;
    });

    const filteredKeluar = db.keluar.filter(item => {
        const masterItem = db.master.find(m => m.kode.trim().toLowerCase() === item.kode.trim().toLowerCase());
        const namaBarang = masterItem ? masterItem.nama.toLowerCase() : '';
        const kodeBarang = item.kode.toLowerCase();
        
        const matchKeyword = namaBarang.includes(keyword) || kodeBarang.includes(keyword);
        let matchDate = true;
        if (startDate) matchDate = matchDate && (item.tanggal >= startDate);
        if (endDate) matchDate = matchDate && (item.tanggal <= endDate);
        
        return matchKeyword && matchDate;
    });

    // ================= 1. TABEL: STOK BARANG TERKINI (BERANDA) =================
if (filteredMaster.length === 0) {
    document.getElementById('tableMasterBody').innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-slate-400 italic font-medium">Data barang tidak ditemukan...</td></tr>`;
} else {
    document.getElementById('tableMasterBody').innerHTML = filteredMaster.map((item, index) => {
        const originalIndex = db.master.findIndex(m => m.kode === item.kode);
        
        // Memanggil fungsi baru yang mendukung banyak tanggal
        const datesMasuk = getAllDates(item.kode, 'masuk');
        const datesKeluar = getAllDates(item.kode, 'keluar');
        const datesRusak = getAllDates(item.kode, 'rusak');

        return `
            <tr class="hover:bg-slate-50 border-b">
                <td class="px-3 py-3 text-slate-500 font-medium text-center">${index + 1}</td>
                <td class="px-3 py-3 text-slate-600 font-medium">${formatTanggalIndo(item.tanggal)}</td>
                <td class="px-3 py-3 font-mono font-bold text-blue-600">${item.kode}</td>
                <td class="px-4 py-3 text-slate-700 font-medium">${item.nama}</td>
               
               
                <td class="px-3 py-3 text-center space-x-1 whitespace-nowrap">
                    <button onclick="editMaster(${originalIndex})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold">Edit</button>
                    <button onclick="hapusMaster(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold">Hapus</button>
                </td>
            </tr>
        `;
    }).join('');
}

function getAllDates(kode, type) {
    const data = db[type] || [];
    const filtered = data.filter(item => item.kode.trim().toLowerCase() === kode.trim().toLowerCase());
    
    if (filtered.length === 0) return "-";
    
    // Urutkan dari yang terbaru ke terlama
    const sorted = filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    // Ambil maksimal 2 tanggal terbaru agar tampilan tetap rapi, 
    // atau hilangkan slice(0, 2) jika ingin menampilkan semuanya
    return sorted.map(item => formatTanggalIndo(item.tanggal)).slice(0, 2).join('<br>');
}
 // ================= 3B. TABEL MINI: BARANG RUSAK (BERANDA) =================
const masterRusakBody = document.getElementById('tableMasterRusakBody');

if (masterRusakBody) {
    // 1. Lakukan Filter pada db.rusak agar sesuai dengan pencarian global
    const filteredRusak = db.rusak.filter(item => {
        const masterItem = db.master.find(m => m.kode.trim().toLowerCase() === item.kode.trim().toLowerCase());
        const namaBarang = masterItem ? masterItem.nama.toLowerCase() : '';
        const kodeBarang = item.kode.toLowerCase();
        
        const matchKeyword = namaBarang.includes(keyword) || kodeBarang.includes(keyword);
        let matchDate = true;
        if (startDate) matchDate = matchDate && (item.tanggal >= startDate);
        if (endDate) matchDate = matchDate && (item.tanggal <= endDate);
        
        return matchKeyword && matchDate;
    });

    // 2. Sortir data yang sudah difilter
    const sortedRusak = [...filteredRusak].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // 3. Render ke HTML
    if (sortedRusak.length === 0) {
        masterRusakBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-4 py-4 text-center text-slate-400 italic">
                    Tidak ada data barang rusak yang cocok
                </td>
            </tr>
        `;
    } else {
        masterRusakBody.innerHTML = sortedRusak.map((item, index) => {
            // Cari nama barang di master
            const barang = db.master.find(m => m.kode.trim() === item.kode.trim());
            const namaBarang = barang ? barang.nama : "Barang tidak dikenal";

            return `
                <tr class="hover:bg-rose-50 transition-colors">
                    <td class="px-3 py-2 text-center text-slate-500">${index + 1}</td>
                    <td class="px-4 py-2">
                        <div class="font-medium text-slate-700">${formatTanggalIndo(item.tanggal)}</div>
                        <div class="font-mono text-[10px] text-rose-600 font-semibold">${item.kode}</div>
                        <div class="text-[10px] text-slate-500 italic">${namaBarang}</div>
                    </td>
                    <td class="px-4 py-2 text-right pr-6 font-bold text-rose-600">${item.qty}</td>
                    <td class="px-4 py-2 text-slate-600">${item.ket}</td>
                </tr>
            `;
        }).join('');
    }
}


const masterMasukBody = document.getElementById('tableMasterMasukBody');
if (masterMasukBody) {
    if (filteredMasuk.length === 0) {
        masterMasukBody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 italic">Tidak ada pasokan cocok</td></tr>`;
    } else {
        const sortedMasuk = [...filteredMasuk].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        masterMasukBody.innerHTML = sortedMasuk.map((item, index) => {
            const barang = db.master.find(m => m.kode.trim() === item.kode.trim());
            const namaBarang = barang ? barang.nama : "Barang tidak dikenal";
            const sisaStok = hitungStokBagus(item.kode); // Hitung Sisa Stok
            
            return `
                <tr class="hover:bg-green-50/50 transition-colors">
                    <td class="px-3 py-2 text-slate-400 text-center font-medium text-xs">${index + 1}</td>
                    <td class="px-4 py-2">
                        <div class="font-medium text-slate-700">${formatTanggalIndo(item.tanggal)}</div>
                        <div class="font-mono text-[10px] text-blue-600 font-semibold">${item.kode}</div>
                        <div class="text-[10px] text-slate-500 italic">${namaBarang}</div>
                    </td>
                    <td class="px-4 py-2 text-right pr-6">
                        <div class="font-bold text-green-700">+${item.qty}</div>
                        <div class="text-[9px] text-slate-400 uppercase font-bold">sisa stok: ${sisaStok}</div>
                    </td>
                    <td class="px-4 py-2 text-slate-600 font-medium">${item.ket}</td>
                </tr>
            `;
        }).join('');
    }
}

    // ================= 3. TABEL MINI: ALOKASI KELUAR (BERANDA) =================
    const masterKeluarBody = document.getElementById('tableMasterKeluarBody');
    if (masterKeluarBody) {
        if (filteredKeluar.length === 0) {
            masterKeluarBody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 italic">Tidak ada alokasi cocok</td></tr>`;
        } else {
            const sortedKeluar = [...filteredKeluar].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
            masterKeluarBody.innerHTML = sortedKeluar.map((item, index) => {
                const barang = db.master.find(m => m.kode.trim() === item.kode.trim());
                const namaBarang = barang ? barang.nama : "Barang tidak dikenal";
                const sisaStok = hitungStokBagus(item.kode); // Hitung Sisa Stok
                
                return `
                    <tr class="hover:bg-amber-50/50 transition-colors">
                        <td class="px-3 py-2 text-slate-400 text-center font-medium text-xs">${index + 1}</td>
                        <td class="px-4 py-2">
                            <div class="font-medium text-slate-700">${formatTanggalIndo(item.tanggal)}</div>
                            <div class="font-mono text-[10px] text-blue-600 font-semibold">${item.kode}</div>
                            <div class="text-[10px] text-slate-500 italic">${namaBarang}</div>
                        </td>
                        <td class="px-4 py-2 text-right pr-6">
                        <div class="font-bold text-green-700">+${item.qty}</div>
                        <div class="text-[9px] text-slate-400 uppercase font-bold">Sisa stok: ${sisaStok}</div>
                    </td>
                        <td class="px-4 py-2 text-slate-600 font-medium">${item.ket}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    // ================= 4. TABEL UTAMA: RIWAYAT BARANG MASUK =================
    function hitungStokBagus(kode) {
        const totalMasuk = db.masuk
            .filter(m => m.kode.trim() === kode.trim())
            .reduce((sum, m) => sum + parseInt(m.qty || 0), 0);
    
        const totalKeluar = db.keluar
            .filter(k => k.kode.trim() === kode.trim())
            .reduce((sum, k) => sum + parseInt(k.qty || 0), 0);
    
        return totalMasuk - totalKeluar;
    }

document.getElementById('tableMasukBody').innerHTML = db.masuk.map((item, i) => {
    const barang = db.master.find(m => m.kode.trim() === item.kode.trim());
    const sisaStok = hitungStokBagus(item.kode); // Hanya Masuk - Keluar
    
    return `
        <tr class="hover:bg-slate-50 border-b">
            <td class="px-6 py-3 text-center text-slate-500 font-medium">${i + 1}</td>
            <td class="px-6 py-3 text-slate-600">${formatTanggalIndo(item.tanggal)}</td>
            <td class="px-6 py-3 font-mono font-bold text-blue-600">${item.kode}</td>
            <td class="px-6 py-3 font-medium">${barang?.nama || 'Unknown'}</td>
            <td class="px-6 py-3 font-bold text-green-600">+${item.qty}</td>
            
            <td class="px-6 py-3 text-center font-bold text-slate-700">
                ${sisaStok}
            </td>
            
            <td class="px-6 py-3 text-slate-500">${item.ket}</td>
            <td class="px-6 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="editMasuk(${i})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Edit</button>
                <button onclick="hapusMasuk(${i})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Hapus</button>
            </td>
        </tr>
    `;
}).join('');



    // ================= 5. TABEL UTAMA: RIWAYAT BARANG KELUAR =================
    document.getElementById('tableKeluarBody').innerHTML = db.keluar.map((item, i) => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-3 text-center text-slate-500 font-medium">${i + 1}</td>
            <td class="px-6 py-3">${formatTanggalIndo(item.tanggal)}</td>
            <td class="px-6 py-3 font-mono">${item.kode}</td>
            <td class="px-6 py-3">${db.master.find(m => m.kode.trim() === item.kode.trim())?.nama || 'Unknown'}</td>
            <td class="px-6 py-3 font-bold text-amber-600">- ${item.qty}</td>
            <td class="px-6 py-3 text-slate-500">${item.ket}</td>
            <td class="px-6 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="editKeluar(${i})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Edit</button>
                <button onclick="hapusKeluar(${i})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Hapus</button>
            </td>
        </tr>
    `).join('');

    // ================= 6. TABEL UTAMA: RIWAYAT BARANG RUSAK =================
    document.getElementById('tableRusakBody').innerHTML = db.rusak.map((item, i) => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-3 text-center text-slate-500 font-medium">${i + 1}</td>
            <td class="px-6 py-3">${formatTanggalIndo(item.tanggal)}</td>
            <td class="px-6 py-3 font-mono">${item.kode}</td>
            <td class="px-6 py-3">${db.master.find(m => m.kode.trim() === item.kode.trim())?.nama || 'Unknown'}</td>
            <td class="px-6 py-3 font-bold text-rose-600">${item.qty} Pcs</td>
            <td class="px-6 py-3 text-slate-500">${item.ket}</td>
            <td class="px-6 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="editRusak(${i})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Edit</button>
                <button onclick="hapusRusak(${i})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Hapus</button>
            </td>
        </tr>
    `).join('');
}



// ================= LOGIKA REPORT GENERATION (DENGAN NO URUT) =================
// ================= LOGIKA REPORT GENERATION (DENGAN KOLOM STOK BARANG) =================
function generateReport() {
    const start = document.getElementById('filterStart').value;
    const end = document.getElementById('filterEnd').value;
    const itemFilter = document.getElementById('filterItem').value;
    if(!start || !end) { alert('Tentukan rentang tanggal laporan!'); return; }

    const filterKondisi = (x) => (x.tanggal >= start && x.tanggal <= end) && (itemFilter === 'ALL' || x.kode === itemFilter);
    const dataMasukFiltered = db.masuk.filter(filterKondisi);
    const dataKeluarFiltered = db.keluar.filter(filterKondisi);
    const dataRusakFiltered = db.rusak.filter(filterKondisi);

    // Fungsi helper untuk mengambil stok terbaru dari master
    const getStokBagus = (kode) => {
        const item = db.master.find(m => m.kode.trim() === kode.trim());
        return item ? hitungStokBagus(item.kode) : 0;
    };

    let htmlReport = `
    <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px;">

    <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">
        REKAP DATA STOREMAN
    </h2>

    <p style="margin: 5px 0 0 0; font-size: 11px;">
        PT. AKMAL JAYA SENTOSA - LOGISTIK & PERGUDANGAN
    </p>

    <p style="margin: 2px 0 0 0; font-size: 10px; font-style: italic;">
        Periode: ${formatTanggalIndo(start)} s/d ${formatTanggalIndo(end)}
    </p>

    <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #444;">
        Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}
    </p>

</div>

<h3 class="report-section-title">2. Log Barang Keluar</h3>
<div class="table-container">
    <table class="report-table" border="1" cellpadding="6">
        <thead>
            <tr style="background-color: #f8fafc;">
                <th class="col-no">No</th>
                <th class="col-tgl">Tanggal</th>
                <th class="col-kode">Kode</th>
                <th class="col-nama">Nama Barang</th>
                <th class="col-qty">Qty</th>
                <th class="col-stok">Stok Keluar</th>
                <th class="col-stok">Sisa Stok</th>
                <th class="col-ket">Keperluan</th>
            </tr>
        </thead>
        <tbody>
            ${dataKeluarFiltered.length === 0 ? '<tr><td colspan="8" align="center" style="padding: 20px;">Tidak ada transaksi</td></tr>' : 
            dataKeluarFiltered.map((x, i) => {
                const stokAkhir = getStokBagus(x.kode);
                const stokAwal = stokAkhir + x.qty;
                return `
                <tr>
                    <td class="col-no" align="center">${i + 1}</td>
                    <td class="col-tgl" align="center">${formatTanggalIndo(x.tanggal)}</td>
                    <td class="col-kode" align="center">${x.kode}</td>
                    <td class="col-nama" style="text-align: left; padding-left: 10px;">${db.master.find(m => m.kode === x.kode)?.nama || 'Unknown'}</td>
                    <td class="col-qty" style="font-weight: bold; color: blue;" align="center">-${x.qty}</td>
                    <td class="col-stok" align="center">${stokAwal}</td>
                    <td class="col-stok" style="font-weight: bold;" align="center">${stokAkhir}</td>
                    <td class="col-ket" style="text-align: left; padding-left: 10px;">${x.ket}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>
</div>

<h3 class="report-section-title">3. Log Barang Rusak</h3>
<div class="table-container">
    <table class="report-table" border="1" cellpadding="6">
        <thead>
            <tr style="background-color: #f8fafc;">
                <th class="col-no">No</th>
                <th class="col-tgl">Tanggal</th>
                <th class="col-kode">Kode</th>
                <th class="col-nama">Nama Barang</th>
                <th class="col-stok">Barang Rusak</th>
                <th class="col-stok">Sisa Stok</th>
                <th class="col-ket">Kronologi</th>
            </tr>
        </thead>
        <tbody>
            ${dataRusakFiltered.length === 0 ? '<tr><td colspan="7" align="center" style="padding: 20px;">Tidak ada data</td></tr>' : 
            dataRusakFiltered.map((x, i) => `
                <tr>
                    <td class="col-no" align="center">${i + 1}</td>
                    <td class="col-tgl" align="center">${formatTanggalIndo(x.tanggal)}</td>
                    <td class="col-kode" align="center">${x.kode}</td>
                    <td class="col-nama" style="text-align: left; padding-left: 10px;">${db.master.find(m => m.kode === x.kode)?.nama || 'Unknown'}</td>
                    <td class="col-stok" style="color: red; font-weight: bold;" align="center">${x.qty} Pcs</td>
                    <td class="col-stok" style="font-weight: bold;" align="center">${getStokBagus(x.kode)}</td>
                    <td class="col-ket" style="text-align: left; padding-left: 10px;">${x.ket}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</div>
        </div>`;

    document.getElementById('previewReport').innerHTML = htmlReport;
    document.getElementById('previewContainer').classList.remove('hidden');
    document.getElementById('printArea').innerHTML = htmlReport;
}

function exportTable(type) {
    let reportContent = document.getElementById('previewReport').innerHTML;

    const fullHtml = `<html><head><meta charset="utf-8">${styles}</head><body>${reportContent}</body></html>`;

    let blob, fileName;
    if (type === 'word') {
        // Menggunakan msexcel untuk Word agar tabel dan garis terbaca lebih baik
        blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
        fileName = 'Laporan_Gudang.doc';
    } else {
        blob = new Blob(['\ufeff', fullHtml], { type: 'application/vnd.ms-excel' });
        fileName = 'Laporan_Gudang.xls';
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}


function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    const menuBtn = document.querySelector('.menu-toggle');
    navMenu.classList.toggle('menu-aktif');
    menuBtn.classList.toggle('toggle-aktif');
}

function toggleForm(containerId, show = null) {
    const container = document.getElementById(containerId);
    if (show !== null) {
        container.classList.toggle('hidden', !show);
    } else {
        container.classList.toggle('hidden');
    }
    // Scroll ke atas agar form terlihat saat dibuka
    if (!container.classList.contains('hidden')) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Fungsi universal untuk toggle form
function toggleForm(containerId, forceShow = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (forceShow !== null) {
        container.classList.toggle('hidden', !forceShow);
    } else {
        container.classList.toggle('hidden');
    }
    
    if (!container.classList.contains('hidden')) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Event Listener untuk tombol Tambah (Toggle manual)
document.getElementById('btnToggleMasuk')?.addEventListener('click', () => toggleForm('formMasukContainer'));
document.getElementById('btnToggleKeluar')?.addEventListener('click', () => toggleForm('formKeluarContainer'));
document.getElementById('btnToggleRusak')?.addEventListener('click', () => toggleForm('formRusakContainer'));

// Perbarui Event Submit agar menutup form otomatis setelah simpan
['Masuk', 'Keluar', 'Rusak'].forEach(type => {
    document.getElementById(`form${type}`).addEventListener('submit', function(e) {
        // ... (Logika simpan data Anda tetap di sini) ...
        
        saveData(); 
        this.reset();
        toggleForm(`form${type}Container`, false); // Menutup form otomatis
    });
});

// Tambahkan event listener ini di dalam DOMContentLoaded
const btnToggleMaster = document.getElementById('btnToggleMaster');
const btnCancelMaster = document.getElementById('btnCancelMaster');

btnToggleMaster.addEventListener('click', () => {
    toggleForm('formMasterContainer');
    // Update teks tombol
    const isHidden = document.getElementById('formMasterContainer').classList.contains('hidden');
    btnToggleMaster.innerText = isHidden ? "+ Tambah Master Barang Baru" : "Tutup Form";
    btnToggleMaster.className = isHidden ? "bg-blue-600 text-white py-2 px-6 rounded-xl hover:bg-blue-700 transition" 
                                         : "bg-red-500 text-white py-2 px-6 rounded-xl hover:bg-red-600 transition";
});

btnCancelMaster.addEventListener('click', () => {
    document.getElementById('formMaster').reset();
    document.getElementById('m_index').value = ""; // Bersihkan index
    toggleForm('formMasterContainer', false);
    // Kembalikan teks tombol ke semula
    btnToggleMaster.innerText = "+ Tambah Master Barang Baru";
    btnToggleMaster.className = "bg-blue-600 text-white py-2 px-6 rounded-xl hover:bg-blue-700 transition";
});

// Menutup form jika klik di luar container form
// Perbaikan Listener Klik Luar
document.addEventListener('click', function(event) {
    const containers = ['formMasterContainer', 'formMasukContainer', 'formKeluarContainer', 'formRusakContainer'];
    const togglers = ['btnToggleMaster', 'btnToggleMasuk', 'btnToggleKeluar', 'btnToggleRusak'];

    containers.forEach((containerId, index) => {
        const container = document.getElementById(containerId);
        const toggler = document.getElementById(togglers[index]);

        // Jika klik terjadi di luar form DAN bukan di tombol pembukanya
        if (container && !container.classList.contains('hidden')) {
            if (!container.contains(event.target) && event.target !== toggler) {
                // Jangan tutup otomatis jika sedang mode edit, agar tidak menghapus input
                const isEditing = document.getElementById(containerId.replace('Container', '') + '_index')?.value !== "";
                if (!isEditing) {
                    toggleForm(containerId, false);
                }
            }
        }
    });
});

const btnToggleSearch = document.getElementById("btnToggleSearch");
const searchContainer = document.getElementById("searchContainer");

// Tombol tampil/sembunyi pencarian
btnToggleSearch.addEventListener("click", (e) => {

    e.stopPropagation();

    searchContainer.classList.toggle("hidden");

    if (searchContainer.classList.contains("hidden")) {

        btnToggleSearch.innerHTML = "🔍 Pencarian Barang";

    } else {

        btnToggleSearch.innerHTML = "✖ Tutup Pencarian";

    }

});

// Mencegah klik di dalam form menutup form
searchContainer.addEventListener("click", (e) => {
    e.stopPropagation();
});

// Klik di luar area pencarian = tutup otomatis
document.addEventListener("click", () => {

    if (!searchContainer.classList.contains("hidden")) {

        searchContainer.classList.add("hidden");

        btnToggleSearch.innerHTML = "🔍 Pencarian Barang";

    }

});

/* ======================================================
   PENCARIAN BARANG MASUK
====================================================== */

const btnToggleSearchMasuk =
document.getElementById("btnToggleSearchMasuk");

const searchMasukContainer =
document.getElementById("searchMasukContainer");

if(btnToggleSearchMasuk && searchMasukContainer){

    btnToggleSearchMasuk.addEventListener("click",(e)=>{

        e.stopPropagation();

        searchMasukContainer.classList.toggle("hidden");

        btnToggleSearchMasuk.innerHTML =
        searchMasukContainer.classList.contains("hidden")
        ? "🔍 Pencarian Barang Masuk"
        : "✖ Tutup Pencarian";

    });

    searchMasukContainer.addEventListener("click",(e)=>{
        e.stopPropagation();
    });

    document.addEventListener("click",(e)=>{

        if(
            !searchMasukContainer.contains(e.target) &&
            !btnToggleSearchMasuk.contains(e.target)
        ){

            searchMasukContainer.classList.add("hidden");

            btnToggleSearchMasuk.innerHTML =
            "🔍 Pencarian Barang Masuk";
        }
    });
}


/* ======================================================
   FUNGSI FORMAT TANGGAL
====================================================== */

function convertDateToISO(dateText){

    if(!dateText) return "";

    // yyyy-mm-dd
    if(dateText.includes("-")){
        return dateText.trim();
    }

    // dd/mm/yyyy
    if(dateText.includes("/")){

        const p = dateText.split("/");

        if(p.length === 3){

            const dd = p[0].padStart(2,"0");
            const mm = p[1].padStart(2,"0");
            const yyyy = p[2];

            return `${yyyy}-${mm}-${dd}`;
        }
    }

    return "";
}


/* ======================================================
   FILTER BARANG MASUK
====================================================== */
function filterTableUniversal(tableBodyId, keywordId, startId, endId, dateColIdx = 1) {
    const keyword = document.getElementById(keywordId)?.value.toLowerCase().trim() || "";
    const startDate = document.getElementById(startId)?.value || "";
    const endDate = document.getElementById(endId)?.value || "";
    const rows = document.querySelectorAll(`#${tableBodyId} tr`);

    rows.forEach(row => {
        // Ambil data tanggal dan teks dari baris
        const dateCell = row.cells[dateColIdx]?.textContent.trim();
        const tanggal = convertDateToISO(dateCell); // Pastikan fungsi ini ada
        
        // Gabungkan semua teks dalam baris untuk pencarian keyword (kode/nama/ket)
        const rowText = row.innerText.toLowerCase();

        let tampil = true;

        // Filter Keyword
        if (keyword && !rowText.includes(keyword)) {
            tampil = false;
        }

        // Filter Tanggal
        if (startDate && tanggal < startDate) tampil = false;
        if (endDate && tanggal > endDate) tampil = false;

        row.style.display = tampil ? "" : "none";
    });
}

document.getElementById("searchMasukKeyword")
?.addEventListener("input", filterTableMasuk);

document.getElementById("searchMasukStartDate")
?.addEventListener("change", filterTableMasuk);

document.getElementById("searchMasukEndDate")
?.addEventListener("change", filterTableMasuk);

function filterTableMasuk(){

    const keyword =
    document.getElementById("searchMasukKeyword")
    ?.value.toLowerCase().trim() || "";

    const startDate =
    document.getElementById("searchMasukStartDate")
    ?.value || "";

    const endDate =
    document.getElementById("searchMasukEndDate")
    ?.value || "";

    const rows =
    document.querySelectorAll("#tableMasukBody tr");

    rows.forEach(row=>{

        const tanggal =
        convertDateToISO(
            row.cells[1]?.textContent.trim()
        );

        const kode =
        row.cells[2]?.textContent.toLowerCase() || "";

        const nama =
        row.cells[3]?.textContent.toLowerCase() || "";

        let tampil = true;

        // Cari kode / nama
        if(
            keyword &&
            !kode.includes(keyword) &&
            !nama.includes(keyword)
        ){
            tampil = false;
        }

        // Dari tanggal
        if(
            startDate &&
            tanggal &&
            tanggal < startDate
        ){
            tampil = false;
        }

        // Sampai tanggal
        if(
            endDate &&
            tanggal &&
            tanggal > endDate
        ){
            tampil = false;
        }

        row.style.display = tampil ? "" : "none";

    });

}


/* ======================================================
   FILTER BARANG KELUAR
====================================================== */

function filterTableKeluar() {
    // 1. Ambil nilai input
    const keyword = document.getElementById("searchKeluarKeyword")?.value.toLowerCase().trim() || "";
    const startDate = document.getElementById("searchKeluarStartDate")?.value || "";
    const endDate = document.getElementById("searchKeluarEndDate")?.value || "";

    // 2. Loop semua baris pada tabel barang keluar
    const rows = document.querySelectorAll("#tableKeluarBody tr");

    rows.forEach(row => {
        // 3. Ambil data dari sel tabel (Pastikan index sel sesuai dengan HTML Anda)
        const tanggalRaw = row.cells[1]?.textContent.trim() || "";
        const tanggal = convertDateToISO(tanggalRaw);
        
        const kode = row.cells[2]?.textContent.toLowerCase().trim() || "";
        const nama = row.cells[3]?.textContent.toLowerCase().trim() || "";

        let tampil = true;

        // 4. Logika Filter Keyword (Kode atau Nama)
        if (keyword && !kode.includes(keyword) && !nama.includes(keyword)) {
            tampil = false;
        }

        // 5. Logika Filter Tanggal
        if (startDate && tanggal && tanggal < startDate) {
            tampil = false;
        }

        if (endDate && tanggal && tanggal > endDate) {
            tampil = false;
        }

        // 6. Tampilkan atau sembunyikan baris
        row.style.display = tampil ? "" : "none";
    });
}

/* ======================================================
   PENCARIAN BARANG KELUAR
====================================================== */

const btnToggleSearchKeluar =
document.getElementById("btnToggleSearchKeluar");

const searchKeluarContainer =
document.getElementById("searchKeluarContainer");

if(btnToggleSearchKeluar && searchKeluarContainer){

    btnToggleSearchKeluar.addEventListener("click",(e)=>{

        e.stopPropagation();

        searchKeluarContainer.classList.toggle("hidden");

        btnToggleSearchKeluar.innerHTML =
        searchKeluarContainer.classList.contains("hidden")
        ? "🔍 Pencarian Barang Keluar"
        : "✖ Tutup Pencarian";

    });

    searchKeluarContainer.addEventListener("click",(e)=>{
        e.stopPropagation();
    });

    document.addEventListener("click",(e)=>{

        if(
            !searchKeluarContainer.contains(e.target) &&
            !btnToggleSearchKeluar.contains(e.target)
        ){

            searchKeluarContainer.classList.add("hidden");

            btnToggleSearchKeluar.innerHTML =
            "🔍 Pencarian Barang Keluar";
        }

    });

}


/* Event Filter Keluar */

document.getElementById("searchKeluarKeyword")
?.addEventListener("input", filterTableKeluar);

document.getElementById("searchKeluarStartDate")
?.addEventListener("change", filterTableKeluar);

document.getElementById("searchKeluarEndDate")
?.addEventListener("change", filterTableKeluar);

/* ======================================================
   FILTER BARANG RUSAK
====================================================== */

function filterTableRusak() {
    // 1. Ambil nilai input dari elemen filter
    const keyword = document.getElementById("searchRusakKeyword")?.value.toLowerCase().trim() || "";
    const startDate = document.getElementById("searchRusakStartDate")?.value || "";
    const endDate = document.getElementById("searchRusakEndDate")?.value || "";

    // 2. Ambil semua baris data di dalam tbody barang rusak
    const rows = document.querySelectorAll("#tableRusakBody tr");

    rows.forEach(row => {
        // 3. Ambil data dari sel tabel (Pastikan index sel sudah sesuai dengan struktur HTML Anda)
        const tanggalRaw = row.cells[1]?.textContent.trim() || "";
        const tanggal = convertDateToISO(tanggalRaw);
        
        const kode = row.cells[2]?.textContent.toLowerCase().trim() || "";
        const nama = row.cells[3]?.textContent.toLowerCase().trim() || "";

        let tampil = true;

        // 4. Logika Filter Keyword (Kode atau Nama Barang)
        if (keyword && !kode.includes(keyword) && !nama.includes(keyword)) {
            tampil = false;
        }

        // 5. Logika Filter Tanggal (Start Date)
        if (startDate && tanggal && tanggal < startDate) {
            tampil = false;
        }

        // 6. Logika Filter Tanggal (End Date)
        if (endDate && tanggal && tanggal > endDate) {
            tampil = false;
        }

        // 7. Tampilkan atau sembunyikan baris berdasarkan hasil filter
        row.style.display = tampil ? "" : "none";
    });
}

/* ======================================================
   PENCARIAN BARANG RUSAK
====================================================== */

const btnToggleSearchRusak =
document.getElementById("btnToggleSearchRusak");

const searchRusakContainer =
document.getElementById("searchRusakContainer");

if(btnToggleSearchRusak && searchRusakContainer){

    btnToggleSearchRusak.addEventListener("click",(e)=>{

        e.stopPropagation();

        searchRusakContainer.classList.toggle("hidden");

        btnToggleSearchRusak.innerHTML =
        searchRusakContainer.classList.contains("hidden")
        ? "🔍 Pencarian Barang Rusak"
        : "✖ Tutup Pencarian";

    });

    searchRusakContainer.addEventListener("click",(e)=>{
        e.stopPropagation();
    });

    document.addEventListener("click",(e)=>{

        if(
            !searchRusakContainer.contains(e.target) &&
            !btnToggleSearchRusak.contains(e.target)
        ){

            searchRusakContainer.classList.add("hidden");

            btnToggleSearchRusak.innerHTML =
            "🔍 Pencarian Barang Rusak";
        }

    });

}


/* Event Filter Rusak */

document.getElementById("searchRusakKeyword")
?.addEventListener("input", filterTableRusak);

document.getElementById("searchRusakStartDate")
?.addEventListener("change", filterTableRusak);

document.getElementById("searchRusakEndDate")
?.addEventListener("change", filterTableRusak);
/* ======================================================
   RESET
====================================================== */

function resetSearchMasuk(){

    document.getElementById("searchMasukKeyword").value = "";
    document.getElementById("searchMasukStartDate").value = "";
    document.getElementById("searchMasukEndDate").value = "";

    filterTableMasuk();
}

function resetSearchKeluar(){

    document.getElementById("searchKeluarKeyword").value = "";
    document.getElementById("searchKeluarStartDate").value = "";
    document.getElementById("searchKeluarEndDate").value = "";

    filterTableKeluar();
}

function resetSearchRusak(){

    document.getElementById("searchRusakKeyword").value = "";
    document.getElementById("searchRusakStartDate").value = "";
    document.getElementById("searchRusakEndDate").value = "";

    filterTableRusak();
}


function scrollTableToBottom() {
    const container = document.querySelector('.max-h-\\[500px\\]');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function scrollTableToBottom() {
    const container = document.getElementById('stokTableContainer');
    if (container) {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// ================= 7. TABEL OTOMATIS: RE-STOK =================
const tableRestokBody = document.getElementById('tableRestokBody');
if (tableRestokBody) {
    // Ambil barang yang stoknya <= 3
    const dataReStok = db.master.filter(item => hitungStokBagus(item.kode) <= 3);

    if (dataReStok.length === 0) {
        tableRestokBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-slate-400 italic">
                    Stok aman, tidak ada barang yang perlu di-restok.
                </td>
            </tr>`;
    } else {
        tableRestokBody.innerHTML = dataReStok.map((item, index) => {
            const stok = hitungStokBagus(item.kode);
            return `
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-3 text-center">${index + 1}</td>
                    <td class="px-6 py-3 font-mono font-bold">${item.kode}</td>
                    <td class="px-6 py-3">${item.nama}</td>
                    <td class="px-6 py-3 font-bold ${stok <= 0 ? 'text-red-600' : 'text-amber-600'}">
                        ${stok} ${item.satuan}
                    </td>
                    <td class="px-6 py-3 text-center">
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${stok <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                            ${stok <= 0 ? 'HABIS' : 'KRITIS'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Tambahkan/Update fungsi switchTabMobile Anda
function switchTabMobile(tabName) {
    // 1. Sembunyikan semua konten
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Tampilkan section yang dipilih
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // 3. Logika Khusus: Refresh data jika membuka tab Alur Aplikasi
    if (tabName === 'restok') {
        // Panggil fungsi untuk menghitung ulang barang kritis
        renderRestokTable(); 
    }
}

// Fungsi render tabel Re-Stok yang sudah dilengkapi fitur KLIK
function renderRestokTable() {
    const tableRestokBody = document.getElementById('tableRestokBody');
    if (!tableRestokBody) return;

    const dataReStok = db.master.filter(item => hitungStokBagus(item.kode) <= 3);

    if (dataReStok.length === 0) {
        tableRestokBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-slate-400 italic">Stok aman, tidak ada barang yang perlu di-restok.</td></tr>`;
    } else {
        tableRestokBody.innerHTML = dataReStok.map((item, index) => {
            const stok = hitungStokBagus(item.kode);
            return `
                <tr onclick="autoFillMasuk('${item.kode}')" class="hover:bg-blue-50 cursor-pointer transition-colors border-b">
                    <td class="px-6 py-3 text-center">${index + 1}</td>
                    <td class="px-6 py-3 font-mono font-bold text-blue-600">${item.kode}</td>
                    <td class="px-6 py-3">${item.nama}</td>
                    <td class="px-6 py-3 font-bold ${stok <= 0 ? 'text-red-600' : 'text-amber-600'}">
                        ${stok} ${item.satuan}
                    </td>
                    <td class="px-6 py-3 text-center">
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${stok <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                            ${stok <= 0 ? 'HABIS' : 'KRITIS'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// Fungsi untuk isi form otomatis saat baris Re-Stok diklik
function autoFillMasuk(kode) {
    switchTabMobile('masuk');
    
    // Buka form jika masih tertutup
    const formContainer = document.getElementById('formMasukContainer');
    if (formContainer && formContainer.classList.contains('hidden')) {
        document.getElementById('btnToggleMasuk')?.click();
    }

    // Isi kode
    const inputKode = document.getElementById('in_kode');
    if (inputKode) {
        inputKode.value = kode;
        inputKode.focus();
    }
}

function switchTabMobile(tabName) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-' + tabName)?.classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
    document.getElementById('btn-' + tabName)?.classList.add('bg-indigo-600', 'text-white');
}



function switchTabMobile(tabName) {
    // 1. Sembunyikan semua section dengan class 'tab-content'
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });

    // 2. Tampilkan section yang ID-nya diawali dengan 'tab-' diikuti nama tab
    const selectedTab = document.getElementById('tab-' + tabName);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // 3. (Opsional) Tambahkan efek aktif pada tombol navigasi
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white'); // sesuaikan dengan class aktif Anda
        btn.classList.add('text-slate-600');
    });
    
    const activeBtn = document.getElementById('btn-' + tabName);
    if (activeBtn) {
        activeBtn.classList.add('bg-indigo-600', 'text-white');
    }
}

