/**
 * STORAGE ENGINE — Layer 3: Persistent file storage
 * Supports: Cloudflare R2 (primary), AWS S3, local fallback
 * Files survive container restarts/redeployments
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STORAGE_MODE = process.env.STORAGE_MODE || 'local'; // 'r2' | 's3' | 'local'
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || '/tmp/empire-storage';

// Ensure local storage dir exists
if (!fs.existsSync(LOCAL_STORAGE_PATH)) fs.mkdirSync(LOCAL_STORAGE_PATH, { recursive: true });

// ── R2 (Cloudflare) ──────────────────────────────────────────────
async function uploadToR2(filePath, key) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
  });
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.srt': 'text/plain' }[ext] || 'application/octet-stream';
  await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: fileBuffer, ContentType: contentType }));
  return `${process.env.R2_PUBLIC_URL || `https://${process.env.R2_BUCKET_NAME}.r2.dev`}/${key}`;
}

// ── S3 (AWS) ─────────────────────────────────────────────────────
async function uploadToS3(filePath, key) {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
  const fileBuffer = fs.readFileSync(filePath);
  await client.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET_NAME, Key: key, Body: fileBuffer }));
  return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
}

// ── LOCAL FALLBACK ────────────────────────────────────────────────
async function uploadToLocal(filePath, key) {
  const destDir = path.join(LOCAL_STORAGE_PATH, path.dirname(key));
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(LOCAL_STORAGE_PATH, key);
  fs.copyFileSync(filePath, destPath);
  return `/storage/${key}`;
}

// ── MAIN UPLOAD ───────────────────────────────────────────────────
async function uploadFile(filePath, key) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  try {
    if (STORAGE_MODE === 'r2' && process.env.R2_ACCOUNT_ID) return await uploadToR2(filePath, key);
    if (STORAGE_MODE === 's3' && process.env.AWS_ACCESS_KEY_ID) return await uploadToS3(filePath, key);
    return await uploadToLocal(filePath, key);
  } catch (e) {
    console.warn(`[Storage] ${STORAGE_MODE} failed, falling back to local: ${e.message}`);
    return await uploadToLocal(filePath, key);
  }
}

async function getFileUrl(key) {
  if (STORAGE_MODE === 'r2') return `${process.env.R2_PUBLIC_URL}/${key}`;
  if (STORAGE_MODE === 's3') return `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
  return `/storage/${key}`;
}

async function deleteFile(key) {
  if (STORAGE_MODE === 'local') {
    const filePath = path.join(LOCAL_STORAGE_PATH, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  // Add R2/S3 delete if needed
}

// Serve local storage files
function getLocalStoragePath() { return LOCAL_STORAGE_PATH; }

module.exports = { uploadFile, getFileUrl, deleteFile, getLocalStoragePath, STORAGE_MODE };
