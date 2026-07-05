const API_URL = '/api/products';
const BRAND_API_URL = '/api/brands';
let products = [];
let brandsList = [];
const adminToken = localStorage.getItem('adminToken');

// Middleware frontend untuk mengecek akses
if (!adminToken) {
    window.location.href = 'login.html';
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
    };
}

function handleAuthError(response) {
    if (response.status === 401) {
        alert("Sesi Anda telah berakhir. Silakan login kembali.");
        logout();
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// Load products and brands
async function loadProducts() {
    try {
        const response = await fetch(API_URL);
        products = await response.json();
        renderTable();
        
        await loadBrands();
    } catch (err) {
        console.error("Failed to fetch products", err);
        alert("Gagal memuat data dari server.");
    }
}

async function loadBrands() {
    try {
        const response = await fetch(BRAND_API_URL);
        brandsList = await response.json();
        renderBrandTable();
        populateBrandDropdown();
    } catch (err) {
        console.error("Failed to fetch brands", err);
    }
}

function populateBrandDropdown() {
    const brandSelect = document.getElementById('brand');
    brandSelect.innerHTML = '';
    brandsList.forEach(b => {
        const option = document.createElement('option');
        option.value = b.name; // Keep it simple by storing name in product
        option.textContent = b.name;
        brandSelect.appendChild(option);
    });
}

// Render Table
function renderTable() {
    const tbody = document.getElementById('product-table-body');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Gambar"><img src="${product.image}" alt="${product.name}" width="50" style="border-radius:4px;"></td>
            <td data-label="ID / Nama"><strong>${product.name}</strong><br><small>${product.id}</small></td>
            <td data-label="Harga">Rp${parseInt(product.price).toLocaleString('id-ID')}</td>
            <td data-label="Top Notes">${product.topNotes}</td>
            <td data-label="Aksi">
                <button class="btn btn-edit" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteProduct('${product.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Logic
const modal = document.getElementById('product-modal');
const form = document.getElementById('product-form');

function openForm() {
    document.getElementById('form-mode').value = 'add';
    document.getElementById('modal-title').innerText = 'Tambah Parfum Baru';
    form.reset();
    document.getElementById('product-id').value = '';
    document.getElementById('image').value = 'assets/babaParfum.webp';
    document.getElementById('current-image-path').innerText = '';
    document.getElementById('imageFile').value = '';
    
    // Reset variants
    document.getElementById('variants-container').innerHTML = '';
    addVariantField("Full Size (50ml)", ""); // Default empty field
    
    modal.style.display = 'flex';
}

function closeForm() {
    modal.style.display = 'none';
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    document.getElementById('form-mode').value = 'edit';
    document.getElementById('modal-title').innerText = 'Edit Parfum: ' + product.name;
    
    document.getElementById('product-id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('brand').value = product.brand;
    document.getElementById('image').value = product.image;
    document.getElementById('current-image-path').innerText = `Gambar saat ini: ${product.image}`;
    document.getElementById('topNotes').value = product.topNotes;
    document.getElementById('middleNotes').value = product.middleNotes;
    document.getElementById('baseNotes').value = product.baseNotes;
    document.getElementById('notesSummary').value = product.notesSummary;
    document.getElementById('story').value = product.story;
    
    // Load variants
    document.getElementById('variants-container').innerHTML = '';
    if (product.variants && product.variants.length > 0) {
        product.variants.forEach(v => {
            let status = 'available';
            if (v.status) {
                status = v.status;
            } else if (v.available === false) {
                status = 'sold_out';
            }
            addVariantField(v.name, v.price, status);
        });
    } else {
        addVariantField("Full Size (50ml)", product.price, 'available');
    }
    
    modal.style.display = 'flex';
}

function addVariantField(name = '', price = '', status = 'available') {
    const container = document.getElementById('variants-container');
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.style.marginBottom = '10px';
    div.className = 'variant-item';
    
    const availSelected = status === 'available' ? 'selected' : '';
    const unavailSelected = status === 'sold_out' ? 'selected' : '';
    const comingSelected = status === 'coming_soon' ? 'selected' : '';
    
    div.innerHTML = `
        <input type="text" class="variant-name" placeholder="Nama Size (misal: Decant 10ml)" value="${name}" required style="flex: 2; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <input type="number" class="variant-price" placeholder="Harga (Rp)" value="${price}" required style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        <select class="variant-status" style="flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="available" ${availSelected}>Tersedia</option>
            <option value="sold_out" ${unavailSelected}>Habis</option>
            <option value="coming_soon" ${comingSelected}>Coming Soon</option>
        </select>
        <button type="button" onclick="this.parentElement.remove()" style="background: #ff4d4d; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer;">X</button>
    `;
    container.appendChild(div);
}

// Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mode = document.getElementById('form-mode').value;
    const id = document.getElementById('product-id').value;
    
    let imagePath = document.getElementById('image').value;
    const imageFile = document.getElementById('imageFile').files[0];

    // Jika ada file gambar baru yang diunggah
    if (imageFile) {
        const formData = new FormData();
        formData.append('imageFile', imageFile);
        
        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                },
                body: formData
            });
            if (handleAuthError(uploadRes)) return;
            
            const uploadData = await uploadRes.json();
            if (uploadRes.ok) {
                imagePath = uploadData.imagePath;
            } else {
                alert("Gagal mengunggah gambar: " + uploadData.error);
                return;
            }
        } catch (err) {
            console.error(err);
            alert("Error saat mengunggah gambar.");
            return;
        }
    }
    
    // Collect variants
    const variantNames = document.querySelectorAll('.variant-name');
    const variantPrices = document.querySelectorAll('.variant-price');
    const variantStatuses = document.querySelectorAll('.variant-status');
    let variants = [];
    let minPrice = Infinity;
    
    for (let i = 0; i < variantNames.length; i++) {
        const vName = variantNames[i].value.trim();
        const vPrice = parseInt(variantPrices[i].value);
        const vStatus = variantStatuses[i].value;
        if (vName && !isNaN(vPrice)) {
            variants.push({ name: vName, price: vPrice, status: vStatus });
            // minPrice hanya dari yang tersedia
            if (vStatus === 'available' && vPrice < minPrice) {
                minPrice = vPrice;
            }
        }
    }
    
    if (variants.length === 0) {
        alert("Minimal harus ada satu varian/ukuran!");
        return;
    }
    
    // Jika semua habis, minPrice pakai harga terendah dari semua varian (fallback)
    if (minPrice === Infinity) {
        minPrice = Math.min(...variants.map(v => v.price));
    }

    const productData = {
        name: document.getElementById('name').value,
        price: minPrice, // Use lowest variant price as display price
        brand: document.getElementById('brand').value,
        image: imagePath,
        topNotes: document.getElementById('topNotes').value,
        middleNotes: document.getElementById('middleNotes').value,
        baseNotes: document.getElementById('baseNotes').value,
        notesSummary: document.getElementById('notesSummary').value,
        story: document.getElementById('story').value,
        variants: variants
    };
    
    try {
        let response;
        if (mode === 'add') {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });
        } else {
            response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(productData)
            });
        }
        
        if (handleAuthError(response)) return;
        
        if (response.ok) {
            closeForm();
            loadProducts();
            alert("Data berhasil disimpan!");
        } else {
            const err = await response.json();
            alert("Error: " + err.error);
        }
    } catch (err) {
        console.error("Save failed", err);
        alert("Gagal menyimpan data.");
    }
});

// Delete Logic
async function deleteProduct(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus parfum ini?")) return;
    
    try {
        const response = await fetch(`${API_URL}/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (handleAuthError(response)) return;
        
        if (response.ok) {
            loadProducts();
        } else {
            alert("Gagal menghapus.");
        }
    } catch (err) {
        console.error("Delete failed", err);
    }
}

// --- BRAND LOGIC ---
function renderBrandTable() {
    const tbody = document.getElementById('brand-table-body');
    tbody.innerHTML = '';
    
    brandsList.forEach(b => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Logo"><img src="${b.logo}" style="width: 50px; height: 50px; object-fit: contain;"></td>
            <td data-label="ID Brand">${b.id}</td>
            <td data-label="Nama">${b.name}</td>
            <td data-label="Aksi">
                <button class="btn btn-save" onclick="editBrand('${b.id}')">Edit</button>
                <button class="btn btn-delete" onclick="deleteBrand('${b.id}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openBrandForm() {
    document.getElementById('brand-form-mode').value = 'add';
    document.getElementById('brand-id-input').value = '';
    document.getElementById('brand-name').value = '';
    document.getElementById('brand-image').value = '';
    document.getElementById('brand-current-image-path').innerText = '';
    document.getElementById('brand-imageFile').value = '';
    document.getElementById('brand-modal-title').innerText = 'Tambah Brand';
    document.getElementById('brand-modal').style.display = 'flex';
}

function closeBrandForm() {
    document.getElementById('brand-modal').style.display = 'none';
}

function editBrand(id) {
    const b = brandsList.find(br => br.id === id);
    if (!b) return;
    
    document.getElementById('brand-form-mode').value = 'edit';
    document.getElementById('brand-id-input').value = b.id;
    document.getElementById('brand-name').value = b.name;
    document.getElementById('brand-image').value = b.logo;
    document.getElementById('brand-current-image-path').innerText = "Gambar saat ini: " + b.logo;
    
    document.getElementById('brand-modal-title').innerText = 'Edit Brand';
    document.getElementById('brand-modal').style.display = 'flex';
}

document.getElementById('brand-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('brand-save-btn');
    saveBtn.innerText = "Menyimpan...";
    saveBtn.disabled = true;
    
    const mode = document.getElementById('brand-form-mode').value;
    const id = document.getElementById('brand-id-input').value;
    
    let logoPath = document.getElementById('brand-image').value;
    const imageFile = document.getElementById('brand-imageFile').files[0];
    
    if (imageFile) {
        const formData = new FormData();
        formData.append('imageFile', imageFile);
        
        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` },
                body: formData
            });
            if (handleAuthError(uploadRes)) return;
            
            const uploadData = await uploadRes.json();
            if (uploadRes.ok) {
                logoPath = uploadData.imagePath;
            } else {
                alert("Upload gambar brand gagal: " + uploadData.error);
                saveBtn.innerText = "Simpan Brand";
                saveBtn.disabled = false;
                return;
            }
        } catch (err) {
            console.error(err);
            alert("Kesalahan jaringan saat upload.");
            saveBtn.innerText = "Simpan Brand";
            saveBtn.disabled = false;
            return;
        }
    }
    
    const brandData = {
        name: document.getElementById('brand-name').value,
        logo: logoPath
    };
    
    try {
        let response;
        if (mode === 'add') {
            response = await fetch(BRAND_API_URL, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(brandData)
            });
        } else {
            response = await fetch(`${BRAND_API_URL}/${id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(brandData)
            });
        }
        
        if (handleAuthError(response)) return;
        
        if (response.ok) {
            closeBrandForm();
            loadBrands(); // reload brands
            alert("Brand berhasil disimpan!");
        } else {
            const err = await response.json();
            alert("Error: " + err.error);
        }
    } catch (err) {
        console.error("Save brand failed", err);
        alert("Gagal menyimpan brand.");
    } finally {
        saveBtn.innerText = "Simpan Brand";
        saveBtn.disabled = false;
    }
});

async function deleteBrand(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus brand ini? Pastikan tidak ada parfum yang masih memakai kategori brand ini.")) return;
    
    try {
        const response = await fetch(`${BRAND_API_URL}/${id}`, { 
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (handleAuthError(response)) return;
        
        if (response.ok) {
            loadBrands();
        } else {
            alert("Gagal menghapus brand.");
        }
    } catch (err) {
        console.error("Delete failed", err);
    }
}

// Init
window.onload = loadProducts;
