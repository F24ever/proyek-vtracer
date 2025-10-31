// 1. TAMBAHKAN 'async' DI SINI
document.addEventListener('DOMContentLoaded', async function() {

    // 2. TAMBAHKAN BLOK 'try...catch' UNTUK MEMUAT FILE .wasm
    // Ini adalah "bahan bakar" untuk VTracer-nya.
    try {
        await vectortracer.default('https://cdn.jsdelivr.net/npm/vectortracer@0.1.2/pkg/vectortracer_bg.wasm');
    } catch (err) {
        console.error("Gagal memuat file VTracer .wasm!", err);
        alert("ERROR: Gagal memuat komponen inti VTracer. Coba refresh halaman.");
        return; // Hentikan eksekusi jika gagal
    }
    // --- AKHIR PERBAIKAN ---

    
    // --- BAGIAN 1: LOGIKA LISENSI ---
    // (Tidak ada perubahan di bagian ini, sudah bagus)
    const KUNCI_RAHASIA_ANDA = "NDHADN-6BII6-BISBI23BICU-BKCSJ8BCKS";
    const layarKunci = document.getElementById('layar-kunci');
    const layarAplikasi = document.getElementById('layar-aplikasi');
    const inputKunci = document.getElementById('input-kunci');
    const tombolBuka = document.getElementById('tombol-buka');
    const pesanError = document.getElementById('pesan-error');

    function bukaAplikasi() {
        layarKunci.classList.add('layar-sembunyi');
        layarAplikasi.classList.remove('layar-sembunyi');
    }

    if (localStorage.getItem('kunci_valid') === 'iya') {
        bukaAplikasi();
    }

    tombolBuka.onclick = function() {
        if (inputKunci.value === KUNCI_RAHASIA_ANDA) {
            localStorage.setItem('kunci_valid', 'iya');
            bukaAplikasi();
        } else {
            pesanError.classList.remove('pesan-sembunyi');
        }
    };

    // --- BAGIAN 2: LOGIKA MESIN VTRACER ---
    // (Kodemu di sini sudah SANGAT BAGUS! Tidak perlu diubah)

    // Ambil elemen aplikasi
    const inputGambar = document.getElementById('input-gambar');
    const infoFile = document.getElementById('info-file');
    const tombolTrace = document.getElementById('tombol-trace');
    const areaHasil = document.getElementById('area-hasil');
    const tombolDownload = document.getElementById('tombol-download');
    
    // Variabel untuk menyimpan BANYAK data gambar
    let daftarGambar = [];

    // --- FUNGSI BARU: Saat pengguna memilih gambar (BATCH) ---
    inputGambar.onchange = async function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            daftarGambar = [];
            infoFile.innerText = "(Belum ada file dipilih)";
            return;
        }

        infoFile.innerText = `Membaca ${files.length} gambar...`;
        daftarGambar = []; // Kosongkan daftar lama
        
        // Buat array 'Promise' untuk membaca setiap file
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
                        
                        // Simpan nama file (tanpa ekstensi)
                        const namaFile = file.name.split('.')[0]; 
                        
                        // Resolve dengan data dan nama
                        resolve({ data: imageData, nama: namaFile });
                    };
                    img.onerror = reject;
                    img.src = event.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        // Tunggu semua file selesai dibaca
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

    // --- FUNGSI BARU: Helper untuk VTracer (INI ADALAH FIX UTAMA) ---
    function prosesGambarVTracer(imageData, settings) {
        return new Promise((resolve, reject) => {
            const converter = new vectortracer.ColorImageConverter(imageData, settings);

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

    // --- FUNGSI BARU: Saat tombol "Proses" diklik (BATCH + ZIP) ---
    tombolTrace.onclick = async function() {
        if (!daftarGambar || daftarGambar.length === 0) {
            alert("Pilih gambar dulu, dong!");
            return;
        }

        tombolTrace.innerText = `Memproses ${daftarGambar.length} gambar...`;
        tombolTrace.disabled = true;
        areaHasil.innerHTML = "<p>Sedang memproses... Harap tunggu...</p>";
        tombolDownload.classList.add('layar-sembunyi');

        // Ambil nilai pengaturan dari input
        const settings = {
            filter_speckle: parseInt(document.getElementById('setting-speckle').value),
            color_precision: parseInt(document.getElementById('setting-color').value),
            path_precision: parseInt(document.getElementById('setting-path').value),
        };

        // Siapkan file ZIP
        const zip = new JSZip();

        try {
            // Loop setiap gambar di dalam daftar
            for (let i = 0; i < daftarGambar.length; i++) {
                const item = daftarGambar[i];
                const urutan = `(${i + 1}/${daftarGambar.length})`;
                
                console.log(`Memproses ${item.nama} ${urutan}...`);
                tombolTrace.innerText = `Memproses: ${item.nama} ${urutan}`;
                
                // Panggil "MESIN" VTracer yang sudah diperbaiki
                const hasilSVG = await prosesGambarVTracer(item.data, settings);
                
                // Tambahkan hasil SVG ke file ZIP
                zip.file(`${item.nama}.svg`, hasilSVG);
            }

            // Setelah semua selesai, buat file ZIP
            tombolTrace.innerText = "Membuat file ZIP...";
            const blob = await zip.generateAsync({ type: 'blob' });
            
            // Siapkan link download untuk ZIP
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
});
