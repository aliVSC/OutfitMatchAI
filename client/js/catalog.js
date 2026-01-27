const API = "http://localhost:8013";
const el = (id) => document.getElementById(id);

const STORAGE_KEY_MODE = "catalogMode"; // "recomendado" | "completo"

function setMsg(t, ok=false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

function safeStr(x) {
  return (typeof x === "string") ? x : "";
}

function getMode() {
  return localStorage.getItem(STORAGE_KEY_MODE) || "recomendado";
}

function setMode(mode) {
  localStorage.setItem(STORAGE_KEY_MODE, mode);
  updateModeUI(mode);
}

// ✅ Extra pro: botones inteligentes
function updateModeUI(mode) {
  const btnAll = el("btnAll");
  const btnRec = el("btnRec");

  if (!btnAll || !btnRec) return;

  if (mode === "completo") {
    btnAll.classList.add("hidden");     // ya estás en completo → oculto
    btnRec.classList.remove("hidden");  // muestro volver a recomendados
  } else {
    btnRec.classList.add("hidden");     // ya estás en recomendados → oculto
    btnAll.classList.remove("hidden");  // muestro ver todo
  }
}

function renderCatalog(prendas, contextText = "") {
  const cont = el("catalog");
  cont.innerHTML = "";

  if (contextText) el("context").textContent = contextText;

  if (!prendas || !prendas.length) {
    setMsg("No hay prendas disponibles");
    return;
  }

  prendas.forEach(p => {
    const imgFrente = safeStr(p.imgFrente) || safeStr(p.ImagenUrl);
    const imgAtras  = safeStr(p.imgAtras);

    const div = document.createElement("div");
    div.className = "cardProduct";

    const imgHtml = imgFrente
      ? `<img class="pimg" src="${imgFrente}" alt="${safeStr(p.Nombre)}">`
      : `<div class="pimg placeholder">Sin imagen</div>`;

    div.innerHTML = `
      ${imgHtml}
      <h3>${safeStr(p.Nombre)}</h3>
      <p class="price">$${Number(p.Precio || 0).toFixed(2)}</p>
      <button class="primary">Generar con IA</button>
    `;

    const img = div.querySelector(".pimg");
    if (img && img.tagName === "IMG" && imgAtras) {
      img.addEventListener("mouseenter", () => img.src = imgAtras);
      img.addEventListener("mouseleave", () => img.src = imgFrente);
    }

    div.querySelector("button").onclick = () => {
      localStorage.setItem("prendaId", String(p.Id));
      localStorage.setItem("prendaNombre", safeStr(p.Nombre));
      localStorage.setItem("prendaImgFrente", imgFrente || "");

      // ✅ Guarda el modo actual para volver igual desde tryon
      localStorage.setItem("catalogReturnMode", getMode());

      window.location.href = "tryon.html";
    };

    cont.appendChild(div);
  });

  setMsg("", true);
}

async function loadCatalogRecommended() {
  const clienteId = localStorage.getItem("clienteId");
  if (!clienteId) {
    alert("No hay clienteId. Vuelve a la encuesta.");
    window.location.href = "survey.html";
    return;
  }

  setMsg("Cargando recomendaciones...", true);

  const r = await fetch(`${API}/api/catalogo?clienteId=${clienteId}`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando catálogo");
    return;
  }

  renderCatalog(
    data.prendas,
    `Recomendado para ti · ${data.tipoCuerpo} · ${data.ocasion}`
  );

  setMode("recomendado");
}

async function loadCatalogAll() {
  setMsg("Cargando todo el catálogo...", true);

  const r = await fetch(`${API}/api/catalogo/all`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando catálogo completo");
    return;
  }

  renderCatalog(data.prendas, "Todo el catálogo disponible");
  setMode("completo");
}

async function initCatalog() {
  // ✅ Si venimos desde tryon, respeta el modo anterior
  const returnMode = localStorage.getItem("catalogReturnMode");
  if (returnMode) {
    localStorage.removeItem("catalogReturnMode");
    setMode(returnMode);
  } else {
    updateModeUI(getMode());
  }

  const mode = getMode();
  if (mode === "completo") return loadCatalogAll();
  return loadCatalogRecommended();
}

// Eventos
el("btnBack").onclick = () => window.location.href = "result.html";
el("btnAll").onclick  = () => loadCatalogAll();
el("btnRec").onclick  = () => loadCatalogRecommended();

initCatalog().catch(e => setMsg("Error: " + (e.message || e)));
