import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import dotenv from "dotenv";


dotenv.config();

console.log("env", process.env.NODE_ENV);


const __dirname = path.resolve();

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitized);
  }
});

const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Middleware
if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: "http://localhost:5173",
    }),
  );
}

app.use(express.json());

// Serve static files from React build

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    console.log(`✓ Uploaded: ${req.file.originalname}`);
    res.json({
      success: true,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      uploadDate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/files', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir)
      .filter(f => fs.statSync(path.join(uploadsDir, f)).isFile())
      .map(filename => {
        const stats = fs.statSync(path.join(uploadsDir, filename));
        const parts = filename.split('-');
        return {
          filename,
          originalname: parts.slice(2).join('-') || filename,
          size: stats.size,
          uploadDate: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read files' });
  }
});

app.get('/api/download/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    const parts = req.params.filename.split('-');
    const originalname = parts.slice(2).join('-') || req.params.filename;
    res.download(filePath, originalname);
  } catch (error) {
    res.status(500).json({ error: 'Download failed' });
  }
});

app.delete('/api/files/:filename', (req, res) => {
  try {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(filePath);
    console.log(`✓ Deleted: ${req.params.filename}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "frontend/dist")));

  app.get("/*splat", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 File Sharing Server Started!');
  console.log('================================');
  console.log(`Local:   http://localhost:${PORT}`);
  console.log('================================\n');
});

