// Simple file-based storage using /tmp (available on Vercel serverless)
const fs = require('fs');
const path = require('path');

const STORAGE_DIR = '/tmp/cert-app';

function ensureDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readStore(name) {
  try {
    ensureDir();
    const file = path.join(STORAGE_DIR, `${name}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeStore(name, data) {
  try {
    ensureDir();
    const file = path.join(STORAGE_DIR, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function deleteStore(name) {
  try {
    const file = path.join(STORAGE_DIR, `${name}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

module.exports = { readStore, writeStore, deleteStore };
