const API = "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok=false) {
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

let finalBase64 = null;

async function renderTryOn() {
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

  ctx.drawImage(userImg, 0, 0, canvas.width, canvas.height);

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

async function saveTryOn() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!finalBase64) {
    setMsg("Primero genera la prueba.");
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

el("btnGenerate").addEventListener("click", () => renderTryOn().catch(e => setMsg(e.message)));
el("btnSave").addEventListener("click", () => saveTryOn().catch(e => setMsg(e.message)));
el("btnBack").addEventListener("click", backToCatalog);

// auto
renderTryOn().catch(e => setMsg(e.message));
