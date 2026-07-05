const WHATSAPP_NUMBER = "+6288210559920"; 
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// ==========================================
// CMS DATA (Simulasi Database)
// ==========================================
let productsData = [];

// Render Products dynamically
function renderProducts(containerId, filters = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filteredProducts = productsData;
    
    // Filter by brand if provided
    if (filters.brand) {
        filteredProducts = filteredProducts.filter(p => p.brand === filters.brand);
    }
    
    if (filters.limit) {
        filteredProducts = filteredProducts.slice(0, filters.limit);
    }
    
    if (filteredProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">Tidak ada produk ditemukan.</p>';
        return;
    }

    container.innerHTML = '';
    filteredProducts.forEach(product => {
        const bgStyle = product.bgColor ? `style="background-color: ${product.bgColor};"` : '';
        
        let variantsHtml = '';
        let hasAvailable = false;
        let hasComingSoon = false;
        
        product.variants.forEach(v => {
            let status = 'available';
            if (v.status) {
                status = v.status;
            } else if (v.available === false) {
                status = 'sold_out';
            }
            
            if (status === 'available') hasAvailable = true;
            if (status === 'coming_soon') hasComingSoon = true;
            
            const disabledAttr = status !== 'available' ? 'disabled' : '';
            const availText = status === 'sold_out' ? ' (Habis)' : (status === 'coming_soon' ? ' (Coming Soon)' : '');
            variantsHtml += `<option value="${v.price}" data-variant="${v.name}" ${disabledAttr}>${v.name} - Rp${v.price.toLocaleString('id-ID')}${availText}</option>`;
        });
        
        let overlayHtml = '';
        let imgStyle = '';
        let btnClass = 'add-btn add-to-cart-btn';
        let btnText = 'Tambah ke Keranjang';
        let btnDisabled = '';
        
        if (!hasAvailable) {
            btnDisabled = 'disabled style="background: #999; cursor: not-allowed;"';
            btnClass = 'add-btn sold-out-btn';
            
            if (hasComingSoon) {
                btnText = 'Coming Soon';
                imgStyle = 'opacity: 0.8;';
                overlayHtml = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(255,200,0,0.9); color: #000; padding: 10px 20px; font-weight: 800; font-size: 1.2rem; border-radius: 5px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Coming<br>Soon</div>`;
            } else {
                btnText = 'Sold Out';
                imgStyle = 'opacity: 0.5; filter: grayscale(100%);';
                overlayHtml = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 10px 20px; font-weight: bold; font-size: 1.5rem; border-radius: 5px; text-transform: uppercase; letter-spacing: 2px; text-align: center;">Sold Out</div>`;
            }
        }

        container.innerHTML += `
        <section id="${product.id}" class="featured-expressive animate-on-scroll slide-up" ${bgStyle}>
            <div class="expressive-product-layout">
                <div class="featured-visual" style="position: relative;">
                    <img src="${product.image}" alt="${product.name}" class="image-placeholder animate-on-scroll fade-in" style="${imgStyle}">
                    ${overlayHtml}
                </div>
                <div class="featured-details">
                    <h2>${product.name}</h2>
                    <p class="price" style="font-size: 1.8rem; font-weight: 800; color: var(--clr-accent); margin-bottom: 20px;">Rp${product.price.toLocaleString('id-ID')}</p>
                    
                    <div class="product-notes animate-on-scroll slide-up">
                        <p><strong>Top Notes:</strong> ${product.topNotes}</p>
                        <p><strong>Middle Notes:</strong> ${product.middleNotes}</p>
                        <p><strong>Base Notes:</strong> ${product.baseNotes}</p>
                        <p style="margin-top: 10px; font-size: 0.85rem;"><em>${product.notesSummary}</em></p>
                    </div>
                    
                    <div class="product-story animate-on-scroll fade-in"><p>${product.story}</p></div>
                    <div class="actions animate-on-scroll slide-up">
                        <select class="variant-select">
                            ${variantsHtml}
                        </select>
                        <button class="${btnClass}" data-base-product="${product.name}" ${btnDisabled}>${btnText}</button>
                    </div>
                </div>
            </div>
        </section>
        `;
    });
    
    // No longer assigning to html
    initAnimations(); // Re-initialize animations for new elements
}

async function renderBrands(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const response = await fetch('/api/brands');
        if (!response.ok) throw new Error("Gagal memuat brands");
        
        const brands = await response.json();
        let html = '<div class="brands-grid">';
        
        brands.forEach(b => {
            html += `
            <div class="brand-card animate-on-scroll slide-up"
                 onclick="window.location.href='semua-produk.html?brand=${encodeURIComponent(b.name)}'">
                <img src="${b.logo}" alt="${b.name}">
                <h3>${b.name}</h3>
                <span class="brand-cta">Lihat Produk &rarr;</span>
            </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        initAnimations();
    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='text-align:center;'>Gagal memuat daftar brand.</p>";
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelector('.cart-count').innerText = count;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2500);
}

// 1. Logika Baru: Mengubah harga yang tampil saat dropdown ukuran diganti
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('variant-select')) {
        const select = e.target;
        const container = select.closest('.featured-details');
        const priceDisplay = container.querySelector('.price');
        const newPrice = parseInt(select.value);
        priceDisplay.innerText = `Rp${newPrice.toLocaleString('id-ID')}`;
    }
});

// 2. Logika Baru: Tambah ke keranjang berdasarkan varian decant
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const btn = e.target;
        const baseName = btn.getAttribute('data-base-product');
        
        // Cari dropdown ukuran di dalam box produk yang sama
        const container = btn.closest('.actions');
        const select = container.querySelector('.variant-select');
        
        const selectedOption = select.options[select.selectedIndex];
        const variantName = selectedOption.getAttribute('data-variant');
        const price = parseInt(selectedOption.value);
        
        // Gabungkan nama parfum dan ukurannya (Contoh: "Baba Parfum - Decant 2ml")
        const fullName = `${baseName} - ${variantName}`;
        
        const existing = cart.find(item => item.name === fullName);
        if (existing) { 
            existing.quantity++; 
        } else { 
            cart.push({ name: fullName, price: price, quantity: 1 }); 
        }
        
        saveCart();
        showToast(`${fullName} berhasil ditambahkan!`);
        
        // Efek visual tombol
        const originalText = btn.innerText;
        btn.innerText = 'Ditambahkan ✓';
        btn.style.backgroundColor = '#4CAF50';
        btn.style.color = '#fff';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.backgroundColor = ''; 
            btn.style.color = '';
        }, 2000);
    }
});

// Modal Logics
function openCart() {
    document.getElementById('cart-modal').style.display = 'flex';
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:#888; margin: 30px 0;'>Keranjang Anda masih kosong.</p>";
        document.getElementById('cart-total').innerHTML = "";
        return;
    }
    
    container.innerHTML = "";
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        subtotal += item.price * item.quantity;
        container.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${item.name}</strong>
                    <small>Rp${item.price.toLocaleString('id-ID')}</small>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span class="qty-number">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            </div>`;
    });
    
    document.getElementById('cart-total').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-top: 2px dashed #eee; padding-top: 15px;">
            <span>Total:</span>
            <span style="color: var(--clr-accent);">Rp${subtotal.toLocaleString('id-ID')}</span>
        </div>
    `;
}

function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    saveCart();
    renderCart();
}

function checkout() {
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const addr = document.getElementById('cust-address').value;
    const pay = document.getElementById('payment-method').value;
    
    if (!name || !phone || !addr) { 
        alert("Mohon lengkapi data diri Anda."); 
        return; 
    }
    
    let msg = "Halo OLFAKTA! Saya ingin memesan:\n\n";
    let grandTotal = 0; 
    
    cart.forEach(i => {
        const itemTotal = i.price * i.quantity;
        grandTotal += itemTotal;
        msg += `${i.name} x${i.quantity} = Rp${itemTotal.toLocaleString('id-ID')}\n`;
    });
    
    msg += `\n====================\n`;
    msg += `Total Pesanan: Rp${grandTotal.toLocaleString('id-ID')}\n`;
    msg += `====================\n\n`;
    msg += `Nama Lengkap: ${name}\nNo HP: ${phone}\nAlamat: ${addr}\nMetode Pembayaran: ${pay}`;
    
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), '_blank');
    
    if (confirm("Apakah pesanan sudah berhasil dikirim?")) {
        cart = []; saveCart(); location.reload();
    }
}

document.addEventListener('DOMContentLoaded', updateCartCount);

// ==========================================
// FITUR LIVE SEARCH (Untuk halaman produk)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    updateCartCount();
    initAnimations();
    
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            productsData = await response.json();
            
            // Auto render based on page
            if (document.getElementById('home-products-container')) {
                renderProducts('home-products-container', { limit: 3 }); // Home page shows 3
            }
            if (document.getElementById('all-products-container')) {
                const urlParams = new URLSearchParams(window.location.search);
                const filterBrand = urlParams.get('brand');
                if (filterBrand) {
                    // Update header if filtered by brand
                    const title = document.getElementById('page-title');
                    if (title) title.innerText = "Produk dari " + decodeURIComponent(filterBrand);
                    renderProducts('all-products-container', { brand: filterBrand }); 
                } else {
                    renderProducts('all-products-container', {}); // Show all
                }
            }
            if (document.getElementById('brands-container')) {
                renderBrands('brands-container');
            }
        }
    } catch (err) {
        console.error("Gagal memuat produk dari server:", err);
    }
    
    // Fetch Brands for Homepage
    if (document.getElementById('home-brands-container')) {
        try {
            const resBrands = await fetch('/api/brands');
            if (resBrands.ok) {
                const brands = await resBrands.json();
                const container = document.getElementById('home-brands-container');
                brands.forEach(b => {
                    const el = document.createElement('div');
                    el.className = 'brand-item';
                    el.style = "cursor: pointer; padding: 20px; border: 1px solid #ddd; border-radius: 10px; transition: transform 0.2s; background: #fff;";
                    el.onmouseover = () => el.style.transform = "scale(1.05)";
                    el.onmouseout = () => el.style.transform = "scale(1)";
                    el.onclick = () => window.location.href = `semua-produk.html?brand=${encodeURIComponent(b.name)}`;
                    
                    el.innerHTML = `
                        <img src="${b.logo}" alt="${b.name}" style="width: 120px; height: 120px; object-fit: contain;">
                        <p style="text-align: center; font-weight: 600; margin-top: 10px; color: var(--clr-text);">${b.name}</p>
                    `;
                    container.appendChild(el);
                });
            }
        } catch (err) {
            console.error("Gagal memuat brands:", err);
        }
    }

    const searchInput = document.getElementById('search-input');
    const filterChips = document.querySelectorAll('.filter-chip');
    let activeFilter = 'all';
    
    // Jika user sedang berada di halaman Semua Produk (yang ada kolom search)
    if (searchInput) {
        // Create No Results message element
        const noResultsMsg = document.createElement('div');
        noResultsMsg.id = 'no-results-msg';
        noResultsMsg.innerHTML = '<div style="font-size: 3rem; margin-bottom:10px;">🔍</div><p>Tidak ditemukan parfum yang cocok dengan kriteria pencarian Anda.</p>';
        const mainContainer = document.getElementById('all-products-container');
        if (mainContainer) {
            mainContainer.parentNode.insertBefore(noResultsMsg, mainContainer.nextSibling);
        }

        const filterProducts = () => {
            const query = searchInput.value.toLowerCase().trim();
            const searchWords = query.split(' ').filter(w => w.length > 0);
            const products = document.querySelectorAll('.featured-expressive');
            let hasVisible = false;
            
            products.forEach(product => {
                const name = product.querySelector('h2') ? product.querySelector('h2').innerText.toLowerCase() : '';
                const notes = product.querySelector('.product-notes') ? product.querySelector('.product-notes').innerText.toLowerCase() : '';
                const story = product.querySelector('.product-story') ? product.querySelector('.product-story').innerText.toLowerCase() : '';
                
                const combinedText = `${name} ${notes} ${story}`;
                
                // Cek filter chip
                const matchesFilter = activeFilter === 'all' || combinedText.includes(activeFilter);
                
                // Cek search text (semua kata harus ada, bukan cuma persis 1 string)
                const matchesSearch = searchWords.length === 0 || searchWords.every(word => combinedText.includes(word));
                
                if (matchesFilter && matchesSearch) {
                    product.style.display = ''; 
                    hasVisible = true;
                } else {
                    product.style.display = 'none'; 
                }
            });
            
            // Tampilkan pesan no results jika tidak ada produk yang cocok dan data produk sudah dimuat
            if (!hasVisible && products.length > 0) {
                noResultsMsg.style.display = 'block';
            } else {
                noResultsMsg.style.display = 'none';
            }
        };

        searchInput.addEventListener('input', filterProducts);
        
        filterChips.forEach(chip => {
            chip.addEventListener('click', function() {
                filterChips.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                activeFilter = this.getAttribute('data-filter');
                filterProducts();
            });
        });
    }
});

// ==========================================
// FITUR HAMBURGER MENU
// ==========================================
function toggleMenu() {
    const nav = document.querySelector('.main-nav');
    nav.classList.toggle('active');
}

// ==========================================
// FITUR SCENT PROFILING AI (Simulated)
// ==========================================
async function analyzeScentProfile() {
    const input = document.getElementById('ai-scent-input').value;
    
    if (!input.trim()) {
        alert("Mohon ceritakan aroma yang Anda inginkan terlebih dahulu.");
        return;
    }

    const loadingBtn = document.getElementById('ai-submit-btn');
    const originalText = loadingBtn.innerText;
    loadingBtn.innerText = "Gemini AI Sedang Menganalisa...";
    loadingBtn.disabled = true;

    try {
        const response = await fetch('/api/scent-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userInput: input })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Gagal menghubungi AI.");
            loadingBtn.innerText = originalText;
            loadingBtn.disabled = false;
            return;
        }

        let recommendation = "";
        let reason = data.reason;

        if (data.recommendedId === null || data.recommendedId === "null") {
            recommendation = "Kami Jujur...";
        } else {
            // Find the product name based on ID
            const matchedProduct = productsData.find(p => p.id === data.recommendedId);
            if (matchedProduct) {
                recommendation = matchedProduct.name;
            } else {
                recommendation = "Rekomendasi Spesial";
            }
        }

        // Tampilkan hasil
        const resultContainer = document.getElementById("quiz-result");
        resultContainer.style.display = "block";
        resultContainer.classList.add("fade-in");
        
        document.getElementById("recom-name").innerText = recommendation;
        document.getElementById("recom-reason").innerHTML = reason;

        // Animasi pop up
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan jaringan saat menghubungi server AI.");
    } finally {
        // Reset button
        loadingBtn.innerText = originalText;
        loadingBtn.disabled = false;
    }
}

// ==========================================
// FITUR ANIMASI (Intersection Observer)
// ==========================================
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once animated
                // observer.unobserve(entry.target); 
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}