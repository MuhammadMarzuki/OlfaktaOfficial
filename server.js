const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- MONGODB SETUP ---
const productVariantSchema = new mongoose.Schema({
    name: String,
    price: Number,
    available: Boolean,
    status: String
}, { _id: false });

const productSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: String,
    brand: String,
    bgColor: String,
    topNotes: String,
    middleNotes: String,
    baseNotes: String,
    notesSummary: String,
    story: String,
    variants: [productVariantSchema]
});

const brandSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    logo: String
});

const Product = mongoose.model('Product', productSchema);
const Brand = mongoose.model('Brand', brandSchema);

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        // Seed data if empty
        try {
            const productCount = await Product.countDocuments();
            if (productCount === 0) {
                const dbPath = path.join(__dirname, 'database.json');
                if (fs.existsSync(dbPath)) {
                    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
                    await Product.insertMany(data);
                    console.log('Products seeded from JSON');
                }
            }
            const brandCount = await Brand.countDocuments();
            if (brandCount === 0) {
                const brandPath = path.join(__dirname, 'brands.json');
                if (fs.existsSync(brandPath)) {
                    const data = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
                    await Brand.insertMany(data);
                    console.log('Brands seeded from JSON');
                }
            }
        } catch (e) {
            console.error("Seeding error:", e);
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));


// --- AUTH MIDDLEWARE ---
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "Olfakta123!"; // Ganti di Vercel
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "olfakta_secret_token_2026"; // Ganti di Vercel

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ token: ADMIN_TOKEN });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${ADMIN_TOKEN}`) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized access" });
    }
};

// --- REST API ENDPOINTS ---

// GET all brands
app.get('/api/brands', async (req, res) => {
    try {
        const brands = await Brand.find({}, '-_id -__v');
        res.json(brands);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new brand (Admin Create)
app.post('/api/brands', requireAuth, async (req, res) => {
    try {
        const newBrand = req.body;
        if (!newBrand.id) {
            newBrand.id = newBrand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        const existing = await Brand.findOne({ id: newBrand.id });
        if (existing) {
            return res.status(400).json({ error: "Brand ID already exists." });
        }

        const brand = await Brand.create(newBrand);
        res.status(201).json({ message: "Brand created successfully", brand });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update a brand (Admin Edit)
app.put('/api/brands/:id', requireAuth, async (req, res) => {
    try {
        const updatedBrand = await Brand.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, id: req.params.id },
            { new: true, select: '-_id -__v' }
        );
        if (updatedBrand) {
            res.json({ message: "Brand updated successfully", brand: updatedBrand });
        } else {
            res.status(404).json({ error: "Brand not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a brand (Admin Delete)
app.delete('/api/brands/:id', requireAuth, async (req, res) => {
    try {
        const result = await Brand.findOneAndDelete({ id: req.params.id });
        if (result) {
            res.json({ message: "Brand deleted successfully" });
        } else {
            res.status(404).json({ error: "Brand not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({}, '-_id -__v');
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET single product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }, '-_id -__v');
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST a new product (Admin Create)
app.post('/api/products', requireAuth, async (req, res) => {
    try {
        const newProduct = req.body;
        if (!newProduct.id) {
            newProduct.id = newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }

        const existing = await Product.findOne({ id: newProduct.id });
        if (existing) {
            return res.status(400).json({ error: "Product ID already exists. Use a different name or specify an ID." });
        }

        if (!newProduct.variants) newProduct.variants = [];
        if (!newProduct.price) newProduct.price = 0;

        const product = await Product.create(newProduct);
        res.status(201).json({ message: "Product created successfully", product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update a product (Admin Edit)
app.put('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const updatedProduct = await Product.findOneAndUpdate(
            { id: req.params.id },
            { ...req.body, id: req.params.id },
            { new: true, select: '-_id -__v' }
        );
        if (updatedProduct) {
            res.json({ message: "Product updated successfully", product: updatedProduct });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE a product (Admin Delete)
app.delete('/api/products/:id', requireAuth, async (req, res) => {
    try {
        const result = await Product.findOneAndDelete({ id: req.params.id });
        if (result) {
            res.json({ message: "Product deleted successfully" });
        } else {
            res.status(404).json({ error: "Product not found" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Scent Profiling AI
app.post('/api/scent-profile', async (req, res) => {
    const { userInput } = req.body;

    if (!userInput) {
        return res.status(400).json({ error: "Input kosong" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return res.status(500).json({ error: "API Key Gemini belum dikonfigurasi oleh admin." });
    }

    try {
        const products = await Product.find({}, 'id name topNotes middleNotes baseNotes story');

        let catalogText = "Katalog Parfum Olfakta:\n";
        products.forEach(p => {
            catalogText += `- ID: ${p.id}, Nama: ${p.name}, Top Notes: ${p.topNotes}, Middle Notes: ${p.middleNotes}, Base Notes: ${p.baseNotes}, Cerita: ${p.story}\n`;
        });

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Anda adalah seorang ahli parfum untuk brand "Olfakta". Tugas Anda adalah merekomendasikan SATU parfum terbaik dari katalog kami berdasarkan keinginan pengguna.

${catalogText}

Permintaan pengguna: "${userInput}"

Berikan respons dalam format JSON baku persis seperti ini (tanpa markdown backticks \`\`\`json):
{
  "recommendedId": "ID_PARFUM_YANG_COCOK_ATAU_NULL",
  "reason": "Penjelasan mengapa parfum ini cocok, ditulis dengan bahasa Indonesia yang elegan dan ramah."
}

Aturan:
1. "recommendedId" harus cocok secara persis dengan salah satu ID di katalog.
2. Jika tidak ada yang cocok sama sekali dari segi notes atau cerita, kembalikan "recommendedId": null, dan di "reason" jelaskan dengan jujur bahwa kami belum memiliki aroma yang sangat persis, tapi usulkan aroma terdekat atau katakan dengan sopan.
3. JANGAN mengembalikan teks apa pun selain JSON murni.
`;

        const result = await model.generateContent(prompt);
        let aiResponseText = result.response.text();

        aiResponseText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiResponse = JSON.parse(aiResponseText);

        res.json({
            recommendedId: aiResponse.recommendedId,
            reason: aiResponse.reason
        });

    } catch (err) {
        console.error("Gemini AI Error:", err);
        res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan AI." });
    }
});

// Konfigurasi Cloudinary (Otomatis menggunakan CLOUDINARY_URL dari .env)
cloudinary.config();

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'olfakta_assets',
        allowedFormats: ['jpg', 'png', 'jpeg', 'webp'],
    },
});
const upload = multer({ storage: storage });

app.post('/api/upload', requireAuth, upload.single('imageFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
    }
    res.json({ imagePath: req.file.path });
});


// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(`🚀 Server berjalan di: http://localhost:${PORT}`);
        console.log(`📁 Akses Halaman Admin: http://localhost:${PORT}/admin.html`);
        console.log(`=========================================`);
    });
}

module.exports = app;
