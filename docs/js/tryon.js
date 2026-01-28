const API = window.API_BASE || "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok = false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

let finalBase64 = null;
let isGenerating = false;

function setGeneratingUI(on) {
  const btnAI = el("btnAI");
  const btnSave = el("btnSave");
  const btnBack = el("btnBack");
  const btnExit = el("btnExit");

  // mientras genera, no permitimos duplicar requests
  if (btnAI) btnAI.disabled = on;
  if (btnBack) btnBack.disabled = on;
  if (btnExit) btnExit.disabled = on;

  // guardar solo cuando hay resultado, y no durante generación
  if (btnSave) btnSave.disabled = on || !finalBase64;

  // opcional: cambia texto del botón
  if (btnAI) btnAI.textContent = on ? "Generando..." : "Generar con IA";
}

async function renderAI({ silent = false } = {}) {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!clienteId || !prendaId) {
    setMsg("Faltan datos. Vuelve al catálogo.");
    return;
  }

  // ✅ anti doble click / doble request
  if (isGenerating) return;

  isGenerating = true;
  setGeneratingUI(true);
  if (!silent) setMsg("Generando con IA 🤖", true);

  try {
    const r = await fetch(`${API}/api/tryon/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId, prendaId }),
    });

    const data = await r.json();

    if (!r.ok) {
      setMsg(
        (data.error || "Error IA") + (data.detail ? " | " + data.detail : "")
      );
      return;
    }

    finalBase64 = data.imagenResultadoBase64;

    el("resultImg").src = finalBase64;
    el("resultImg").classList.remove("hidden");

    setMsg("", true);
  } catch (e) {
    setMsg("Error: " + (e.message || e));
  } finally {
    isGenerating = false;
    setGeneratingUI(false);
  }
}

async function saveTryOn() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!finalBase64) {
    setMsg("Primero genera con IA.");
    return;
  }

  if (isGenerating) {
    setMsg("Espera a que termine la generación...");
    return;
  }

  setMsg("Guardando...", true);

  const r = await fetch(`${API}/api/tryon/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clienteId,
      prendaId,
      imagenResultadoBase64: finalBase64,
    }),
  });

  const data = await r.json();

  if (!r.ok) {
    setMsg(
      (data.error || "Error guardando") + (data.detail ? " | " + data.detail : "")
    );
    return;
  }

  setMsg("Guardado ✅", true);
  setGeneratingUI(false); // habilita save si ya hay imagen
}

function exitForNewUser() {
  if (isGenerating) {
    setMsg("Espera a que termine la generación...");
    return;
  }

  localStorage.removeItem("clienteId");
  localStorage.removeItem("prendaId");
  localStorage.removeItem("tipoCuerpo");
  localStorage.removeItem("ocasion");
  localStorage.removeItem("autoGenerateAI");
  localStorage.removeItem("prendaNombre");
  localStorage.removeItem("prendaImgFrente");

  finalBase64 = null;
  window.location.href = "survey.html";
}

async function autoGenerateIfNeeded() {
  const flag = localStorage.getItem("autoGenerateAI");
  if (flag === "1") {
    localStorage.removeItem("autoGenerateAI"); // para que no se repita
    await renderAI({ silent: true }); // silent: no muestra "Generando..." si no quieres
  } else {
    // estado inicial del UI
    setGeneratingUI(false);
  }
}

// Eventos
el("btnAI").onclick = () => renderAI();
el("btnSave").onclick = () => saveTryOn().catch((e) => setMsg("Error: " + e.message));
el("btnBack").onclick = () => {
  if (isGenerating) return setMsg("Espera a que termine la generación...");
  window.location.href = "catalog.html";
};
el("btnExit").onclick = exitForNewUser;

// Auto-genera al cargar
autoGenerateIfNeeded().catch((e) => setMsg("Error: " + e.message));