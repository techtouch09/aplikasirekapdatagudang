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
    const idx = document.getElementById('m_index').value;
    const tanggal = document.getElementById('m_tanggal').value;
    const kode = document.getElementById('m_kode').value.trim();
    const nama = document.getElementById('m_nama').value;
    const satuan = document.getElementById('m_satuan').value;

    if (idx === "") { 
        if(db.master.find(item => item.kode.toLowerCase() === kode.toLowerCase())) { alert('Kode barang sudah terdaftar!'); return; }
        db.master.push({ tanggal, kode, nama, satuan });
    } else { 
        const oldKode = db.master[idx].kode;
        if(oldKode !== kode) {
            ['masuk','keluar','rusak'].forEach(t => db[t].forEach(x => { if(x.kode === oldKode) x.kode = kode; }));
        }
        db.master[idx] = { tanggal, kode, nama, satuan };
        document.getElementById('m_index').value = "";
        document.getElementById('titleMaster').innerText = "Tambah Master Barang Baru";
        document.getElementById('btnSubmitMaster').innerText = "Simpan Master Barang";
    }
    saveData(); this.reset();
});

function editMaster(i) {
    document.getElementById('m_index').value = i;
    document.getElementById('m_tanggal').value = db.master[i].tanggal || '';
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
});

function editMasuk(i) {
    document.getElementById('in_index').value = i;
    document.getElementById('in_tanggal').value = db.masuk[i].tanggal;
    document.getElementById('in_kode').value = db.masuk[i].kode;
    document.getElementById('in_qty').value = db.masuk[i].qty;
    document.getElementById('in_ket').value = db.masuk[i].ket;
    document.getElementById('titleMasuk').innerText = "Ubah Data Transaksi Masuk";
    document.getElementById('btnSubmitMasuk').innerText = "Perbarui Data Masuk";
}

function hapusMasuk(i) { if(confirm('Hapus log riwayat barang masuk ini?')) { db.masuk.splice(i, 1); saveData(); } }

// 3. BARANG KELUAR
document.getElementById('formKeluar').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('out_index').value;
    const kode = document.getElementById('out_kode').value;
    const qty = parseInt(document.getElementById('out_qty').value);
    const data = {
        tanggal: document.getElementById('out_tanggal').value, kode, qty,
        ket: document.getElementById('out_ket').value
    };

    const currentIdx = idx === "" ? -1 : parseInt(idx);
    const validStok = hitungStokBagus(kode, currentIdx, 'keluar');
    
    if(qty > validStok) { 
        alert(`Gagal Menyimpan! Sisa Stok Bagus untuk item ini hanya tersisa: ${validStok} Pcs. Anda mencoba mengeluarkan: ${qty} Pcs.`); 
        return; 
    }

    if (idx === "") { db.keluar.push(data); } 
    else {
        db.keluar[idx] = data;
        document.getElementById('out_index').value = "";
        document.getElementById('titleKeluar').innerText = "Input Barang Keluar (Produksi)";
        document.getElementById('btnSubmitKeluar').innerText = "Simpan Barang Keluar";
    }
    saveData(); this.reset();
});

function editKeluar(i) {
    document.getElementById('out_index').value = i;
    document.getElementById('out_tanggal').value = db.keluar[i].tanggal;
    document.getElementById('out_kode').value = db.keluar[i].kode;
    document.getElementById('out_qty').value = db.keluar[i].qty;
    document.getElementById('out_ket').value = db.keluar[i].ket;
    document.getElementById('titleKeluar').innerText = "Ubah Data Transaksi Keluar";
    document.getElementById('btnSubmitKeluar').innerText = "Perbarui Data Keluar";
}

function hapusKeluar(i) { if(confirm('Hapus log riwayat barang keluar ini?')) { db.keluar.splice(i, 1); saveData(); } }

// 4. BARANG RUSAK
document.getElementById('formRusak').addEventListener('submit', function(e) {
    e.preventDefault();
    const idx = document.getElementById('bad_index').value;
    const kode = document.getElementById('bad_kode').value;
    const qty = parseInt(document.getElementById('bad_qty').value);
    const data = {
        tanggal: document.getElementById('bad_tanggal').value, kode, qty,
        ket: document.getElementById('bad_ket').value
    };

    const currentIdx = idx === "" ? -1 : parseInt(idx);
    
    let totalMasuk = db.masuk.filter(x => x.kode.trim() === kode.trim()).reduce((sum, i) => sum + i.qty, 0);
    let totalKeluar = db.keluar.filter(x => x.kode.trim() === kode.trim()).reduce((sum, i) => sum + i.qty, 0);
    let totalRusakLain = db.rusak.filter((x, idx) => x.kode.trim() === kode.trim() && idx !== currentIdx).reduce((sum, i) => sum + i.qty, 0);
    
    const batasMaksimalRusak = totalMasuk - totalKeluar - totalRusakLain;

    if(qty > batasMaksimalRusak) { 
        alert(`Gagal! Jumlah barang rusak melampaui sisa fisik barang di gudang. Batas maksimum input rusak saat ini: ${batasMaksimalRusak} Pcs.`); 
        return; 
    }

    if (idx === "") { db.rusak.push(data); } 
    else {
        db.rusak[idx] = data;
        document.getElementById('bad_index').value = "";
        document.getElementById('titleRusak').innerText = "Input Barang Rusak (Karantina)";
        document.getElementById('btnSubmitRusak').innerText = "Simpan Rekam Rusak";
    }
    saveData(); this.reset();
});

function editRusak(i) {
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
    if(filteredMaster.length === 0) {
        document.getElementById('tableMasterBody').innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-slate-400 italic font-medium">Data barang tidak ditemukan...</td></tr>`;
    } else {
        document.getElementById('tableMasterBody').innerHTML = filteredMaster.map((item, index) => {
            const originalIndex = db.master.findIndex(m => m.kode === item.kode);
            return `
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-3 text-slate-500 font-medium text-center">${index + 1}</td>
                    <td class="px-6 py-3 text-slate-600 font-medium">${formatTanggalIndo(item.tanggal)}</td>
                    <td class="px-6 py-3 font-mono font-bold text-blue-600">${item.kode}</td>
                    <td class="px-6 py-3 font-medium">${item.nama}</td>
                    <td class="px-6 py-3 text-green-600 font-bold">${hitungStokBagus(item.kode)}</td>
                    <td class="px-6 py-3 text-red-500 font-bold">${hitungStokRusak(item.kode)}</td>
                    <td class="px-6 py-3 text-slate-500">${item.satuan}</td>
                    <td class="px-6 py-3 text-center space-x-1 whitespace-nowrap">
                        <button onclick="editMaster(${originalIndex})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Edit</button>
                        <button onclick="hapusMaster(${originalIndex})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Hapus</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ================= 2. TABEL MINI: PASOKAN MASUK (BERANDA) =================
    const masterMasukBody = document.getElementById('tableMasterMasukBody');
    if (masterMasukBody) {
        if (filteredMasuk.length === 0) {
            masterMasukBody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 italic">Tidak ada pasokan cocok</td></tr>`;
        } else {
            const sortedMasuk = [...filteredMasuk].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
            masterMasukBody.innerHTML = sortedMasuk.map((item, index) => `
                <tr class="hover:bg-green-50/50 transition-colors">
                    <td class="px-3 py-2 text-slate-400 text-center font-medium text-xs">${index + 1}</td>
                    <td class="px-4 py-2">
                        <div class="font-medium text-slate-700">${formatTanggalIndo(item.tanggal)}</div>
                        <div class="font-mono text-[10px] text-blue-600 font-semibold">${item.kode}</div>
                    </td>
                    <td class="px-4 py-2 font-bold text-green-700 text-right pr-6">+${item.qty}</td>
                    <td class="px-4 py-2 text-slate-600 font-medium">${item.ket}</td>
                </tr>
            `).join('');
        }
    }

    // ================= 3. TABEL MINI: ALOKASI KELUAR (BERANDA) =================
    const masterKeluarBody = document.getElementById('tableMasterKeluarBody');
    if (masterKeluarBody) {
        if (filteredKeluar.length === 0) {
            masterKeluarBody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 italic">Tidak ada alokasi cocok</td></tr>`;
        } else {
            const sortedKeluar = [...filteredKeluar].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
            masterKeluarBody.innerHTML = sortedKeluar.map((item, index) => `
                <tr class="hover:bg-amber-50/50 transition-colors">
                    <td class="px-3 py-2 text-slate-400 text-center font-medium text-xs">${index + 1}</td>
                    <td class="px-4 py-2">
                        <div class="font-medium text-slate-700">${formatTanggalIndo(item.tanggal)}</div>
                        <div class="font-mono text-[10px] text-blue-600 font-semibold">${item.kode}</div>
                    </td>
                    <td class="px-4 py-2 font-bold text-amber-700 text-right pr-6">-${item.qty}</td>
                    <td class="px-4 py-2 text-slate-600 font-medium">${item.ket}</td>
                </tr>
            `).join('');
        }
    }

    // ================= 4. TABEL UTAMA: RIWAYAT BARANG MASUK =================
    document.getElementById('tableMasukBody').innerHTML = db.masuk.map((item, i) => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-3 text-center text-slate-500 font-medium">${i + 1}</td>
            <td class="px-6 py-3">${formatTanggalIndo(item.tanggal)}</td>
            <td class="px-6 py-3 font-mono">${item.kode}</td>
            <td class="px-6 py-3">${db.master.find(m => m.kode.trim() === item.kode.trim())?.nama || 'Unknown'}</td>
            <td class="px-6 py-3 font-bold text-green-600">+${item.qty}</td>
            <td class="px-6 py-3 text-slate-500">${item.ket}</td>
            <td class="px-6 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="editMasuk(${i})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Edit</button>
                <button onclick="hapusMasuk(${i})" class="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded font-semibold cursor-pointer">Hapus</button>
            </td>
        </tr>
    `).join('');

    // ================= 5. TABEL UTAMA: RIWAYAT BARANG KELUAR =================
    document.getElementById('tableKeluarBody').innerHTML = db.keluar.map((item, i) => `
        <tr class="hover:bg-slate-50">
            <td class="px-6 py-3 text-center text-slate-500 font-medium">${i + 1}</td>
            <td class="px-6 py-3">${formatTanggalIndo(item.tanggal)}</td>
            <td class="px-6 py-3 font-mono">${item.kode}</td>
            <td class="px-6 py-3">${db.master.find(m => m.kode.trim() === item.kode.trim())?.nama || 'Unknown'}</td>
            <td class="px-6 py-3 font-bold text-amber-600">-{item.qty}</td>
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
// ================= LOGIKA REPORT GENERATION (DENGAN KOLOM STOK BAGUS) =================
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
        <div style="font-family: Arial, sans-serif; color: #000; padding: 10px;">
            <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">PT. GALANGAN KAPAL NUSANTARA</h2>
                <p style="margin: 5px 0 0 0; font-size: 11px;">LOGISTIK & PERGUDANGAN - PROYEK BANGUNAN BARU</p>
                <p style="margin: 2px 0 0 0; font-size: 10px; font-style: italic;">Periode Laporan: ${formatTanggalIndo(start)} s/d ${formatTanggalIndo(end)}</p>
            </div>

            <h3 class="report-section-title">1. Log Barang Masuk</h3>
            <div class="table-responsive">
                <table class="report-table" border="1" cellpadding="6" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>No</th><th>Tanggal</th><th>Kode</th><th>Nama Barang</th><th>Qty</th><th>Stok Bagus</th><th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dataMasukFiltered.length === 0 ? '<tr><td colspan="7" align="center">Tidak ada transaksi</td></tr>' : 
                        dataMasukFiltered.map((x, i) => `
                            <tr>
                                <td align="center">${i + 1}</td><td>${formatTanggalIndo(x.tanggal)}</td>
                                <td class="code-text">${x.kode}</td><td>${db.master.find(m => m.kode === x.kode)?.nama || 'Unknown'}</td>
                                <td style="font-weight: bold; color: green; text-align: center;">+${x.qty}</td>
                                <td style="font-weight: bold; text-align: center;">${getStokBagus(x.kode)}</td>
                                <td>${x.ket}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h3 class="report-section-title">2. Log Barang Keluar</h3>
            <div class="table-responsive">
                <table class="report-table" border="1" cellpadding="6" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>No</th><th>Tanggal</th><th>Kode</th><th>Nama Barang</th><th>Qty</th><th>Stok Bagus</th><th>Keperluan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dataKeluarFiltered.length === 0 ? '<tr><td colspan="7" align="center">Tidak ada transaksi</td></tr>' : 
                        dataKeluarFiltered.map((x, i) => `
                            <tr>
                                <td align="center">${i + 1}</td><td>${formatTanggalIndo(x.tanggal)}</td>
                                <td class="code-text">${x.kode}</td><td>${db.master.find(m => m.kode === x.kode)?.nama || 'Unknown'}</td>
                                <td style="font-weight: bold; color: blue; text-align: center;">-${x.qty}</td>
                                <td style="font-weight: bold; text-align: center;">${getStokBagus(x.kode)}</td>
                                <td>${x.ket}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h3 class="report-section-title">3. Log Barang Rusak</h3>
            <div class="table-responsive">
                <table class="report-table" border="1" cellpadding="6" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>No</th><th>Tanggal</th><th>Kode</th><th>Nama Barang</th><th>Qty</th><th>Stok Bagus</th><th>Kronologi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dataRusakFiltered.length === 0 ? '<tr><td colspan="7" align="center">Tidak ada data</td></tr>' : 
                        dataRusakFiltered.map((x, i) => `
                            <tr>
                                <td align="center">${i + 1}</td><td>${formatTanggalIndo(x.tanggal)}</td>
                                <td class="code-text">${x.kode}</td><td>${db.master.find(m => m.kode === x.kode)?.nama || 'Unknown'}</td>
                                <td style="color: red; font-weight: bold; text-align: center;">${x.qty} Pcs</td>
                                <td style="font-weight: bold; text-align: center;">${getStokBagus(x.kode)}</td>
                                <td>${x.ket}</td>
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

function toggleMenu() {
    const navMenu = document.getElementById('nav-menu');
    const menuBtn = document.querySelector('.menu-toggle');
    navMenu.classList.toggle('menu-aktif');
    menuBtn.classList.toggle('toggle-aktif');
}