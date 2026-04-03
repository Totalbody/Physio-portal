// src/portalAPI.js
// Storage adapter for Physio Portal
// Connects to Vercel Blob via the proxy API routes
// Falls back to localStorage if API is not configured

// ═══════════════════════════════════════════════════════
// CONFIGURATION — Update these after deploying API routes
// ═══════════════════════════════════════════════════════
const PORTAL_API = window.__PORTAL_API__ || "https://tbp-cliniko-proxy-j6f9.vercel.app/api/portal";
const PORTAL_SECRET = window.__PORTAL_SECRET__ || "tbp-portal-2026";

const headers = {
  "Content-Type": "application/json",
  "X-Portal-Secret": PORTAL_SECRET,
};

// ── Load entire portal state from API ────────────────
export async function loadPortalState() {
  try {
    const resp = await fetch(PORTAL_API + "/store?secret=" + encodeURIComponent(PORTAL_SECRET), {
      headers: { "X-Portal-Secret": PORTAL_SECRET },
    });
    if (!resp.ok) throw new Error("API " + resp.status);
    const state = await resp.json();
    console.log("[Portal] State loaded:", Object.keys(state.files || {}).length, "files,", Object.keys(state.data || {}).length, "data keys");
    return {
      files: state.files || {},
      data: state.data || {},
    };
  } catch (e) {
    console.warn("[Portal] API unavailable, using localStorage fallback:", e.message);
    return null; // null = use localStorage fallback
  }
}

// ── Upload a file (cert, contract, resource etc) ─────
export async function uploadFile(fileKey, fileName, fileType, dataUrl) {
  try {
    const resp = await fetch(PORTAL_API + "/upload", {
      method: "POST",
      headers,
      body: JSON.stringify({ fileKey, fileName, fileType, fileData: dataUrl }),
    });
    if (!resp.ok) throw new Error("Upload failed: " + resp.status);
    const result = await resp.json();
    if (result.ok && result.file) {
      console.log("[Portal] Uploaded:", fileKey, "→", result.file.blobUrl);
      return result.file;
    }
    throw new Error(result.error || "Upload failed");
  } catch (e) {
    console.error("[Portal] Upload error:", e);
    return null;
  }
}

// ── Delete a file ────────────────────────────────────
export async function deleteFile(fileKey) {
  try {
    const resp = await fetch(
      PORTAL_API + "/upload?fileKey=" + encodeURIComponent(fileKey) + "&secret=" + encodeURIComponent(PORTAL_SECRET),
      { method: "DELETE", headers: { "X-Portal-Secret": PORTAL_SECRET } }
    );
    if (!resp.ok) throw new Error("Delete failed: " + resp.status);
    console.log("[Portal] Deleted:", fileKey);
    return true;
  } catch (e) {
    console.error("[Portal] Delete error:", e);
    return false;
  }
}

// ── Save structured data (employee info, audits, etc) ─
export async function saveData(key, value) {
  try {
    const resp = await fetch(PORTAL_API + "/store", {
      method: "POST",
      headers,
      body: JSON.stringify({ key, value }),
    });
    if (!resp.ok) throw new Error("Save failed: " + resp.status);
    console.log("[Portal] Data saved:", key);
    return true;
  } catch (e) {
    console.error("[Portal] Save error:", e);
    return false;
  }
}

// ── Delete structured data ───────────────────────────
export async function deleteData(key) {
  try {
    const resp = await fetch(
      PORTAL_API + "/store?key=" + encodeURIComponent(key) + "&secret=" + encodeURIComponent(PORTAL_SECRET),
      { method: "DELETE", headers: { "X-Portal-Secret": PORTAL_SECRET } }
    );
    return true;
  } catch (e) {
    console.error("[Portal] Delete data error:", e);
    return false;
  }
}

// ── Migrate localStorage to API (one-time) ───────────
export async function migrateLocalStorage() {
  const state = { files: {}, data: {} };
  let count = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      const raw = localStorage.getItem(key);
      const val = JSON.parse(raw);

      if (key.startsWith("cert_")) {
        // This is a file record — needs actual upload
        if (val && val.dataUrl && val.fileName) {
          console.log("[Migrate] Uploading file:", key);
          const result = await uploadFile(key, val.fileName, val.fileType, val.dataUrl);
          if (result) {
            state.files[key] = result;
            count++;
          }
        }
      } else if (key.startsWith("empinfo_") || key.startsWith("ori_") || key.startsWith("gen_") || key.startsWith("isrv_") || key.startsWith("equip_") || key.startsWith("jd_")) {
        // Check if it's a file (has dataUrl) or data
        if (val && val.dataUrl) {
          const result = await uploadFile(key, val.fileName, val.fileType, val.dataUrl);
          if (result) {
            state.files[key] = result;
            count++;
          }
        } else {
          await saveData(key, val);
          state.data[key] = val;
          count++;
        }
      }
    } catch (e) {
      // Not JSON or not relevant — skip
    }
  }

  console.log("[Migrate] Migrated", count, "items from localStorage to API");
  return state;
}
