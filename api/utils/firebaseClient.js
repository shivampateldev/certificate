const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

class FileFirestore {
  constructor() {
    const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
    if (isVercel) {
      this.dataPath = '/tmp';
    } else {
      this.dataPath = path.join(__dirname, '..', '..', 'server', 'data');
      if (!fs.existsSync(this.dataPath)) {
        try {
          fs.mkdirSync(this.dataPath, { recursive: true });
        } catch (e) {
          this.dataPath = __dirname;
        }
      }
    }
    console.log(`[FileFirestore] Local database storage path: ${this.dataPath}`);
  }

  _getFilePath(collectionName) {
    return path.join(this.dataPath, `${collectionName}.json`);
  }

  _readData(collectionName) {
    const filePath = this._getFilePath(collectionName);
    if (!fs.existsSync(filePath)) return [];
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  _writeData(collectionName, data) {
    const filePath = this._getFilePath(collectionName);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (e) {
      console.error('[FileFirestore] Failed to write database file:', e);
      return false;
    }
  }

  collection(collectionName) {
    const self = this;
    
    return {
      async add(data) {
        const list = self._readData(collectionName);
        const id = 'doc_' + Math.random().toString(36).substring(2, 11);
        const newDoc = { id, ...data };
        list.push(newDoc);
        self._writeData(collectionName, list);
        return { id };
      },

      async get() {
        const list = self._readData(collectionName);
        const docs = list.map(item => {
          const { id, ...data } = item;
          return {
            id,
            exists: true,
            data: () => data
          };
        });

        return {
          empty: docs.length === 0,
          docs,
          forEach(callback) {
            docs.forEach(doc => callback(doc));
          }
        };
      },

      where(field, operator, value) {
        return {
          async get() {
            let list = self._readData(collectionName);
            list = list.filter(item => {
              const itemVal = item[field];
              if (operator === '==' || operator === '===') return itemVal === value;
              if (operator === '>=') return new Date(itemVal) >= new Date(value);
              if (operator === '<=') return new Date(itemVal) <= new Date(value);
              if (operator === '>') return new Date(itemVal) > new Date(value);
              if (operator === '<') return new Date(itemVal) < new Date(value);
              return true;
            });

            const docs = list.map(item => {
              const { id, ...data } = item;
              return {
                id,
                exists: true,
                data: () => data
              };
            });

            return {
              empty: docs.length === 0,
              docs,
              forEach(callback) {
                docs.forEach(doc => callback(doc));
              }
            };
          }
        };
      },

      doc(docId) {
        return {
          async get() {
            const list = self._readData(collectionName);
            const found = list.find(item => String(item.id) === String(docId));
            if (found) {
              const { id, ...data } = found;
              return {
                id,
                exists: true,
                data: () => data
              };
            } else {
              return {
                id: docId,
                exists: false,
                data: () => null
              };
            }
          },

          async set(docData, options = {}) {
            const list = self._readData(collectionName);
            const idx = list.findIndex(item => String(item.id) === String(docId));
            
            if (idx !== -1) {
              if (options.merge) {
                list[idx] = { ...list[idx], ...docData };
              } else {
                list[idx] = { id: docId, ...docData };
              }
            } else {
              list.push({ id: docId, ...docData });
            }
            
            self._writeData(collectionName, list);
            return { success: true };
          },

          async update(docData) {
            const list = self._readData(collectionName);
            const idx = list.findIndex(item => String(item.id) === String(docId));
            
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...docData };
              self._writeData(collectionName, list);
              return { success: true };
            } else {
              throw new Error(`Document with ID ${docId} not found`);
            }
          },

          async delete() {
            let list = self._readData(collectionName);
            list = list.filter(item => String(item.id) !== String(docId));
            self._writeData(collectionName, list);
            return { success: true };
          }
        };
      }
    };
  }
}

let initialized = false;

if (!admin.apps.length) {
  // 1. Try to search for a local serviceAccountKey.json in common locations
  const possiblePaths = [
    path.join(__dirname, "serviceAccountKey.json"),
    path.join(__dirname, "..", "serviceAccountKey.json"),
    path.join(process.cwd(), "serviceAccountKey.json")
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const serviceAccount = require(p);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        console.log(`Firebase Admin initialized with local serviceAccountKey at ${p}`);
        initialized = true;
        break;
      } catch (e) {
        console.error(`Error loading serviceAccountKey from ${p}:`, e);
      }
    }
  }

  // 2. Fallback to FIREBASE_SERVICE_ACCOUNT environment variable (JSON stringified)
  if (!initialized && process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT env variable.");
      initialized = true;
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", e);
    }
  }

  // 3. Fallback to standard project ID initialization
  if (!initialized) {
    try {
      admin.initializeApp({
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "ificatemanagement"
      });
      console.log("Firebase Admin initialized with default projectId.");
    } catch (e) {
      console.error("Firebase Admin fallback initialization error:", e);
      admin.initializeApp();
    }
  }
}

// Instantiate either real Firestore or FileFirestore fallback
let db;
if (initialized) {
  db = admin.firestore();
} else {
  db = new FileFirestore();
  console.log("ℹ [firebaseClient] Active service account credentials not found. Falling back to FileFirestore JSON database.");
}

module.exports = { admin, db };
