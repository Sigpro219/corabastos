import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";

const PHOTO_DB_NAME = "corabastos_photos_db";
const PHOTO_STORE_NAME = "photos";
const PHOTO_DB_VERSION = 1;

export function sanitizePhotoStorageKey(photoKey: string): string {
  return photoKey.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120) || "meter_photo";
}

function openPhotosIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          db.createObjectStore(PHOTO_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Compresión HTML5 <canvas> en cliente (SPEC.md §1.2 y §4.2). Prohibido Base64 en Firestore. */
export function compressEvidenceImage(file: File, maxDim = 800, quality = 0.72): Promise<Blob> {
  if (typeof document === "undefined" || typeof Image === "undefined") return Promise.resolve(file);
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compresión fallida."))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Archivo de imagen inválido."));
    };
    img.src = objectUrl;
  });
}

export async function saveLocalPhotoBlob(photoKey: string, blob: Blob): Promise<void> {
  const db = await openPhotosIndexedDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).put(blob, photoKey);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function getLocalPhotoUrl(photoKey: string): Promise<string | null> {
  const db = await openPhotosIndexedDb();
  if (!db) return null;
  return new Promise<string | null>((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE_NAME, "readonly");
      const req = tx.objectStore(PHOTO_STORE_NAME).get(photoKey);
      req.onsuccess = () => {
        db.close();
        const res: unknown = req.result;
        resolve(res instanceof Blob && typeof URL !== "undefined" ? URL.createObjectURL(res) : null);
      };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

export async function clearAllLocalPhotos(): Promise<void> {
  const db = await openPhotosIndexedDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(PHOTO_STORE_NAME, "readwrite");
      tx.objectStore(PHOTO_STORE_NAME).clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); resolve(); };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function uploadEvidencePhotoToStorage(
  photoKey: string,
  blob: Blob,
  periodo = "2025-06"
): Promise<string | null> {
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  if (!auth?.currentUser || !storage) return null;
  try {
    const sanitizedKey = sanitizePhotoStorageKey(photoKey);
    const storageRef = ref(storage, `tenants/corabastos/evidencias/${periodo}/${sanitizedKey}.jpg`);
    await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
    return await getDownloadURL(storageRef);
  } catch {
    return null;
  }
}

export async function persistFieldEvidencePhoto(
  photoKey: string,
  file: File,
  periodo = "2025-06"
): Promise<{ photoLocalKey: string; photoStorageUrl?: string; photoCapturedAt: string }> {
  const compressed = await compressEvidenceImage(file);
  await saveLocalPhotoBlob(photoKey, compressed);
  const cloudUrl = await uploadEvidencePhotoToStorage(photoKey, compressed, periodo);
  return {
    photoLocalKey: photoKey,
    ...(cloudUrl ? { photoStorageUrl: cloudUrl } : {}),
    photoCapturedAt: new Date().toISOString(),
  };
}
