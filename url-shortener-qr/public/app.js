const $ = (id) => document.getElementById(id);

// ===== Shortener (arriba) =====
const urlInput = $("urlInput");
const btnShorten = $("btnShorten");
const status = $("status");

const result = $("result");
const originalBox = $("originalBox");
const shortLink = $("shortLink");
const qrImg = $("qrImg");

const btnCopy = $("btnCopy");
const btnDownload = $("btnDownload");
const btnOpenQr = $("btnOpenQr");

let currentCode = null;
let currentShortUrl = null;

function setStatus(msg, isError = false) {
  status.textContent = msg || "";
  status.className = "status" + (isError ? " error" : "");
}

function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:(.*?);base64/) || [])[1] || "image/png";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// ===== Historial (abajo) =====
const btnRefresh = $("btnRefresh");
const btnClearView = $("btnClearView");
const historyBody = $("historyBody");

const searchInput = $("searchInput");
const btnClearSearch = $("btnClearSearch");
const historyMeta = $("historyMeta");

let currentQuery = "";
let debounceTimer = null;

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

function setHistoryMeta(text) {
  if (!historyMeta) return;
  historyMeta.textContent = text || "";
}

async function loadHistory() {
  try {
    const q = (currentQuery || "").trim();
    const url = q
      ? `/api/links?take=25&skip=0&q=${encodeURIComponent(q)}`
      : `/api/links?take=25&skip=0`;

    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setHistoryMeta("");
      historyBody.innerHTML = "";
      return setStatus(data?.error || "No pude cargar el historial.", true);
    }

    historyBody.innerHTML = "";

    setHistoryMeta(
      q
        ? `Mostrando ${data.items.length} resultado(s) para: "${q}" · Total: ${data.total}`
        : `Mostrando ${data.items.length} enlace(s) recientes · Total: ${data.total}`
    );

    if (!data.items.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="5" style="padding:16px 10px; color:rgba(255,255,255,0.55);">
          No hay resultados.
        </td>
      `;
      historyBody.appendChild(tr);
      return;
    }

    for (const item of data.items) {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td class="mono">
          <a href="${item.shortUrl}" target="_blank" rel="noreferrer">${item.code}</a>
        </td>

        <td>
          <div class="ellipsis" title="${item.originalUrl}">
            ${item.originalUrl}
          </div>
        </td>

        <td>
          <span class="badge">${item.clicks}</span>
        </td>

        <td class="mono" style="color: rgba(255,255,255,0.55);">
          ${formatDate(item.createdAt)}
        </td>

        <td>
          <div class="stack">
            <button class="btn btn-sm" data-copy="${item.shortUrl}">Copiar</button>
            <button class="btn btn-sm btn-ghost" data-open="${item.shortUrl}">Abrir</button>
            <button class="btn btn-sm" data-qr="/api/links/${item.code}/qr">QR</button>
            <button class="btn btn-sm btn-danger" data-del="${item.code}" title="Borra en BD">Borrar</button>
          </div>
        </td>
      `;

      historyBody.appendChild(tr);
    }
  } catch (e) {
    console.error(e);
    setStatus("No pude cargar el historial.", true);
  }
}

// Delegación de eventos para botones dentro de la tabla
historyBody?.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const copy = btn.getAttribute("data-copy");
  const open = btn.getAttribute("data-open");
  const qr = btn.getAttribute("data-qr");
  const del = btn.getAttribute("data-del");

  if (copy) {
    await navigator.clipboard.writeText(copy);
    return setStatus("Copiado ✅");
  }

  if (open) {
    window.open(open, "_blank");
    return;
  }

  if (qr) {
    window.open(qr, "_blank");
    return;
  }

  if (del) {
    if (!confirm(`¿Borrar el enlace "${del}"?`)) return;

    const res = await fetch(`/api/links/${del}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) return setStatus(data?.error || "No se pudo borrar.", true);

    setStatus("Borrado ✅");
    loadHistory();
  }
});

btnRefresh?.addEventListener("click", loadHistory);
btnClearView?.addEventListener("click", () => {
  historyBody.innerHTML = "";
  setHistoryMeta("");
  setStatus("Vista limpiada.");
});

// Buscar con debounce (300ms)
searchInput?.addEventListener("input", (e) => {
  currentQuery = e.target.value;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadHistory();
  }, 300);
});

btnClearSearch?.addEventListener("click", () => {
  currentQuery = "";
  if (searchInput) searchInput.value = "";
  loadHistory();
});

// ===== Acciones del resultado (QR) =====
async function shorten() {
  const url = urlInput.value.trim();
  if (!url) return setStatus("Pega una URL para continuar.", true);

  btnShorten.disabled = true;
  setStatus("Generando…");
  result.style.display = "none";

  try {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.error || "Error al crear el enlace";
      return setStatus(msg, true);
    }

    currentCode = data.code;
    currentShortUrl = data.shortUrl;

    originalBox.textContent = data.originalUrl;
    shortLink.textContent = data.shortUrl;
    shortLink.href = data.shortUrl;

    qrImg.src = data.qrDataUrl;

    result.style.display = "flex";
    setStatus("Listo ✅");

    // refresca historial
    loadHistory();
  } catch (e) {
    console.error(e);
    setStatus("No se pudo conectar con el servidor. ¿Está encendido?", true);
  } finally {
    btnShorten.disabled = false;
  }
}

btnShorten?.addEventListener("click", shorten);
urlInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") shorten();
});

btnCopy?.addEventListener("click", async () => {
  if (!currentShortUrl) return;
  try {
    await navigator.clipboard.writeText(currentShortUrl);
    setStatus("Enlace copiado ✅");
  } catch {
    setStatus("No se pudo copiar (permiso del navegador).", true);
  }
});

btnDownload?.addEventListener("click", () => {
  if (!qrImg.src || !currentCode) return;

  const blob = dataUrlToBlob(qrImg.src);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `qr-${currentCode}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  setStatus("Descarga iniciada ✅");
});

btnOpenQr?.addEventListener("click", () => {
  if (!currentCode) return;
  window.open(`/api/links/${currentCode}/qr`, "_blank");
});

// Auto cargar al abrir la web
loadHistory();

console.log("✅ app.js cargado");
