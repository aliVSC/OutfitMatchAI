const API = "http://localhost:8013";

const el = (id) => document.getElementById(id);

function setMsg(t, ok = false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar imagen: " + src));
    img.src = src;
  });
}

/**
 * Convierte una imagen (url relativa o absoluta) a base64 DataURL.
 * - Funciona con rutas tipo: assets/overlay/blazer.png
 */
async function imageUrlToBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo leer la imagen de la prenda (fetch): " + url);

  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result); // data:image/png;base64,...
    reader.readAsDataURL(blob);
  });
}

let finalBase64 = null;

/**
 * Overlay MVP: canvas con superposición.
 */
async function renderTryOnOverlay() {
  const clienteId = localStorage.getItem("clienteId");
  const prendaId = localStorage.getItem("prendaId");

  if (!clienteId || !prendaId) {
    alert("Faltan datos. Vuelve al catálogo.");
    window.location.href = "catalog.html";
    return;
  }

  setMsg("Cargando contexto...", true);

  const r = await fetch(`${API}/api/tryon/contexto?clienteId=${clienteId}&prendaId=${prendaId}`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando contexto");
    return;
  }

  const { fotoBase64, prenda } = data;
  const overlayUrl = prenda.OverlayUrl;

  el("info").textContent = `Prenda: ${prenda.Nombre} | Método: Overlay (MVP)`;

  if (!overlayUrl) {
    setMsg("Esta prenda no tiene OverlayUrl. Agrega PNG transparente en OverlayUrl.");
    return;
  }

  setMsg("Cargando imágenes...", true);

  const userImg = await loadImage(fotoBase64);
  const clothImg = await loadImage(overlayUrl);

  const canvas = el("mixCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = userImg.naturalWidth;
  canvas.height = userImg.naturalHeight;

  // 1) usuario
  ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);

  // 2) overlay centrado
  const targetW = canvas.width * 0.70;
  const scale = targetW / clothImg.naturalWidth;
  const targetH = clothImg.naturalHeight * scale;

  const x = (canvas.width - targetW) / 2;
  const y = canvas.height * 0.25;

  ctx.drawImage(clothImg, x, y, targetW, targetH);

  finalBase64 = canvas.toDataURL("image/png");

  el("resultImg").src = finalBase64;
  el("resultImg").classList.remove("hidden");

  setMsg("Resultado generado ✅ (Overlay)", true);
}

/**
 * Nano Banana IA: llama al backend /api/tryon/nano
 * Requiere que tu backend ya tenga endpoint POST /api/tryon/nano
 */
async function renderTryOnAI() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!clienteId || !prendaId) {
    setMsg("Faltan datos. Vuelve al catálogo.");
    return;
  }

  setMsg("Cargando contexto para IA...", true);

  // Traemos prenda + overlayUrl desde backend
  const r = await fetch(`${API}/api/tryon/contexto?clienteId=${clienteId}&prendaId=${prendaId}`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando contexto");
    return;
  }

  const overlayUrl = data.prenda?.OverlayUrl;
  const nombrePrenda = data.prenda?.Nombre || "Prenda";

  el("info").textContent = `Prenda: ${nombrePrenda} | Método: IA (Nano Banana)`;

  if (!overlayUrl) {
    setMsg("Esta prenda no tiene OverlayUrl. Para IA necesitas una imagen (ideal PNG).");
    return;
  }

  setMsg("Convirtiendo imagen de prenda a Base64...", true);

  // Convertimos overlayUrl (que está en el frontend /assets/overlay/...) a base64
  // OJO: overlayUrl debe ser accesible desde el navegador
  const prendaBase64 = await imageUrlToBase64(overlayUrl);

  setMsg("Enviando a IA... (puede tardar un poco) 🤖", true);

  const r2 = await fetch(`${API}/api/tryon/nano`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId, prendaId, prendaBase64 })
  });

  const data2 = await r2.json();

  if (!r2.ok) {
    setMsg((data2.error || "Error IA") + (data2.detail ? " | " + data2.detail : ""));
    return;
  }

  finalBase64 = data2.imagenResultadoBase64;

  el("resultImg").src = finalBase64;
  el("resultImg").classList.remove("hidden");

  setMsg("Resultado generado con IA ✅", true);
}

async function saveTryOn() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!finalBase64) {
    setMsg("Primero genera la prueba (Overlay o IA).");
    return;
  }

  setMsg("Guardando resultado...", true);

  const r = await fetch(`${API}/api/tryon/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId, prendaId, imagenResultadoBase64: finalBase64 })
  });

  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error guardando resultado");
    return;
  }

  setMsg("Guardado ✅", true);
}

function backToCatalog() {
  window.location.href = "catalog.html";
}

// Eventos
el("btnGenerate").addEventListener("click", () =>
  renderTryOnOverlay().catch(e => setMsg(e.message))
);

el("btnAI").addEventListener("click", () =>
  renderTryOnAI().catch(e => setMsg(e.message))
);

el("btnSave").addEventListener("click", () =>
  saveTryOn().catch(e => setMsg(e.message))
);

el("btnBack").addEventListener("click", backToCatalog);

// Auto: intenta overlay al abrir
renderTryOnOverlay().catch(e => setMsg(e.message));
