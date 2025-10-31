// --- PERUBAHAN BESAR ADA DI SINI ---
// Kita import file _bg.js (BUKAN vectortracer.js)
// Kita import 'init' (fungsi inisialisasi) dan 'ColorImageConverter' (kelas utamanya)
import init, { ColorImageConverter } from 'https://cdn.jsdelivr.net/npm/vectortracer@0.1.2/pkg/vectortracer_bg.js';

// --- BAGIAN 1: LOGIKA LISENSI ---
// (Ini semua sama, tidak ada yg berubah)
const KUNCI_RAHASIA_ANDA = "NDHADN-6BII6-BISBI23BICU-BKCSJ8BCKS";
const layarKunci = document.getElementById('layar-kunci');
const layarAplikasi = document.getElementById('layar-aplikasi');
const inputKunci = document.getElementById('input-kunci');
const tombolBuka = document.getElementById('tombol-buka');
const pesanError = document.getElementById('pesan-error');
const areaHasil = document.getElementById('area-hasil');

/**
 * Fungsi ini adalah inti aplikasi kita.
 * Ini HANYA akan dipanggil SETELAH kunci lisensi terverifikasi.
 */
async function inisialisasiAplikasi() {
    // 1. Tampilkan layar aplikasi
    layarKunci.classList.add('layar-sembunyi');
    layarAplikasi.classList.remove('layar-sembunyi');

    // 2. Muat komponen inti VTracer (WASM)
    try {
        areaHasil.innerHTML = "<p>Memuat komponen inti VTracer...</p>";
        
        // --- INI PERUBAHAN KEDUA ---
        // Kita 'fetch' file .wasm secara manual menggunakan URL-nya
        const wasmResponse = await fetch('https://cdn.jsdelivr.net/npm/vectortracer@0.1.2/pkg/vectortracer_bg.wasm');
        
        // Kita panggil fungsi 'init' (dari import) dan berikan hasil fetch .wasm
        // Ini akan "menghidupkan" modul WASM
        await init(wasmResponse); 
        
        areaHasil.innerHTML = "<p>Komponen berhasil dimuat. Silakan pilih gambar.</p>";
    } catch (err) {
        console.error("Gagal memuat file VTracer .wasm!", err);
        // Tampilkan error di dalam UI, JANGAN pakai alert
        areaHasil.innerHTML = `<p style="color:red; font-weight:bold;">ERROR: Gagal memuat komponen inti VTracer. Coba refresh halaman.</p>`;
        // Nonaktifkan tombol-tombol aplikasi jika gagal
        document.getElementById('tombol-trace').disabled = true;
        document.getElementById('input-gambar').disabled = true;
        return; // Hentikan fungsi jika gagal
    }

    // 3. SETELAH WASM BERHASIL, baru siapkan sisa aplikasi
    // --- BAGIAN 2: LOGIKA MESIN VTRACER ---
    // (Ini semua sama, tidak ada yg berubah)
    const inputGambar = document.getElementById('input-gambar');
    const infoFile = document.getElementById('info-file');
    const tombolTrace = document.getElementById('tombol-trace');
    const tombolDownload = document.getElementById('tombol-download');
    
    let daftarGambar = []; 

    inputGambar.onchange = async function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            daftarGambar = [];
            infoFile.innerText = "(Belum ada file dipilih)";
            return;
        }

        infoFile.innerText = `Membaca ${files.length} gambar...`;
        daftarGambar = []; 
        
        const filePromises = Array.from(files).map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        const imageData = ctx.getImageData(0, 0, img.width, img.height);
                        const namaFile = file.name.split('.').slice(0, -1).join('.');
                        resolve({ data: imageData, nama: namaFile });
                    };
                    img.onerror = reject;
                    img.src = event.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        try {
            daftarGambar = await Promise.all(filePromises);
            infoFile.innerText = `${daftarGambar.length} gambar siap diproses!`;
            console.log("Gambar siap diproses:", daftarGambar);
        } catch (err) {
            console.error("Gagal membaca file gambar:", err);
            infoFile.innerText = "Gagal membaca salah satu gambar.";
            alert("Gagal membaca salah satu file gambar. Coba lagi.");
        }
    };

    // Fungsi inti untuk memproses gambar dengan VTracer
    function prosesGambarVTracer(imageData, settings) {
        return new Promise((resolve, reject) => {
            // --- INI PERUBAHAN KETIGA ---
            // Kita gunakan 'ColorImageConverter' yang sudah kita import di atas
            // BUKAN 'vectortracer.ColorImageConverter'
            const converter = new ColorImageConverter(imageData, settings);
            
            // (Sisa fungsi ini sama persis)
            function tick() {
                try {
                    converter.progress(); 
                    if (converter.isFinished()) {
                        const result = converter.getResult(); 
                        converter.free(); 
                        resolve(result); 
                    } else {
                        setTimeout(tick, 0); 
                    }
                } catch (err) {
                    converter.free(); 
                    reject(err); 
                }
            }
            
            converter.init(); 
            tick(); 
        });
    }

    // Fungsi saat tombol "Proses" diklik
    // (Ini semua sama, tidak ada yg berubah)
    tombolTrace.onclick = async function() {
        if (!daftarGambar || daftarGambar.length === 0) {
            alert("Pilih gambar dulu, dong!");
            return;
        }

        tombolTrace.innerText = `Memproses ${daftarGambar.length} gambar...`;
        tombolTrace.disabled = true;
        areaHasil.innerHTML = "<p>Sedang memproses... Harap tunggu...</p>";
        tombolDownload.classList.add('layar-sembunyi');

        const settings = {
            filter_speckle: parseInt(document.getElementById('setting-speckle').value),
            color_precision: parseInt(document.getElementById('setting-color').value),
            path_precision: parseInt(document.getElementById('setting-path').value),
        };

        const zip = new JSZip(); 

        try {
            for (let i = 0; i < daftarGambar.length; i++) {
                const item = daftarGambar[i]; 
                const urutan = `(${i + 1}/${daftarGambar.length})`;
                console.log(`Memproses ${item.nama} ${urutan}...`);
                tombolTrace.innerText = `Memproses: ${item.nama} ${urutan}`;
                
                const hasilSVG = await prosesGambarVTracer(item.data, settings);
                zip.file(`${item.nama}.svg`, hasilSVG);
            }

            tombolTrace.innerText = "Membuat file ZIP...";
            const blob = await zip.generateAsync({ type: 'blob' });
            
            const url = URL.createObjectURL(blob);
            tombolDownload.href = url;
            tombolDownload.download = `hasil-trace-batch.zip`;
            tombolDownload.innerText = `Download ${daftarGambar.length} Hasil (.zip)`;
            tombolDownload.classList.remove('layar-sembunyi');
            areaHasil.innerHTML = `<p>Selesai! ${daftarGambar.length} gambar berhasil diproses dan siap di-download.</p>`;

        } catch (err) {
            console.error(err);
            alert("Waduh, ada error! Coba lagi.");
            areaHasil.innerHTML = `<p style="color:var(--warna-error);">Error: ${err.message}</p>`;
        } finally {
            tombolTrace.innerText = "Proses Jadi Vektor!";
            tombolTrace.disabled = false;
        }
    };

} // --- Akhir dari fungsi inisialisasiAplikasi ---


// --- LOGIKA PEMERIKSAAN KUNCI (JALAN PERTAMA KALI) ---
// (Ini semua sama, tidak ada yg berubah)
if (localStorage.getItem('kunci_valid') === 'iya') {
    inisialisasiAplikasi(); 
}

tombolBuka.onclick = function() {
    if (inputKunci.value === KUNCI_RAHASIA_ANDA) {
        localStorage.setItem('kunci_valid', 'iya');
        inisialisasiAplikasi(); 
    } else {
        pesanError.classList.remove('pesan-sembunyi');
        setTimeout(() => {
            pesanError.classList.add('pesan-sembunyi');
        }, 3000);
    }
};

inputKunci.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        tombolBuka.click(); 
    }
});
