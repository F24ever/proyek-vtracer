// Kita bungkus semuanya dalam fungsi async 'IIFE'
// Ini lebih rapi dan aman
(async function() {

    // PERBAIKAN FINAL (GANTI CDN KE UNPKG):
    try {
        await vectortracer.default('https://unpkg.com/vectortracer@0.1.2/pkg/vectortracer_bg.wasm');
    } catch (err) {
        console.error("Gagal memuat file VTracer .wasm!", err);
        alert("ERROR: Gagal memuat komponen inti VTracer. Coba refresh halaman.");
        return; 
    }
    // --- AKHIR PERBAIKAN ---

    
    // --- BAGIAN 1: LOGIKA LISENSI ---
    // Kode ini aman dijalankan di sini karena script.js pakai 'defer',
    // yang artinya DOM sudah pasti siap.
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
    const inputGambar = document.getElementById('input-gambar');
    const infoFile = document.getElementById('info-file');
    const tombolTrace = document.getElementById('tombol-trace');
    const areaHasil = document.getElementById('area-hasil');
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
                        const namaFile = file.name.split('.')[0]; 
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
                const item = daftarGambar.length;
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

// Ini adalah penutup dari (async function() { ... })
})();
