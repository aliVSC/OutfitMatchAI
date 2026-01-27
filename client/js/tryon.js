const API = "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok = false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

let finalBase64 = null;

async function renderAI() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!clienteId || !prendaId) {
    setMsg("Faltan datos. Vuelve al catálogo.");
    return;
  }

  setMsg("Generando con IA 🤖", true);

  const r = await fetch(`${API}/api/tryon/ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId, prendaId })
  });

  const data = await r.json();

  if (!r.ok) {
    setMsg((data.error || "Error IA") + (data.detail ? " | " + data.detail : ""));
    return;
  }

  finalBase64 = data.imagenResultadoBase64;

  el("resultImg").src = finalBase64;
  el("resultImg").classList.remove("hidden");

  setMsg("", true);
}

async function saveTryOn() {
  const clienteId = Number(localStorage.getItem("clienteId"));
  const prendaId = Number(localStorage.getItem("prendaId"));

  if (!finalBase64) {
    setMsg("Primero genera con IA.");
    return;
  }

  setMsg("Guardando...", true);

  const r = await fetch(`${API}/api/tryon/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clienteId, prendaId, imagenResultadoBase64: finalBase64 })
  });

  const data = await r.json();

  if (!r.ok) {
    setMsg((data.error || "Error guardando") + (data.detail ? " | " + data.detail : ""));
    return;
  }

  setMsg("Guardado", true);
}

// NUEVO: salir y limpiar datos para otro usuario
function exitForNewUser() {
  // Limpia lo necesario para que otra persona empiece desde 0
  localStorage.removeItem("clienteId");
  localStorage.removeItem("prendaId");

  // Si guardas otras cosas en localStorage, límpialas también:
  localStorage.removeItem("tipoCuerpo");
  localStorage.removeItem("ocasion");

  finalBase64 = null;

  // Regresa al inicio del flujo (encuesta)
  window.location.href = "survey.html";
}

el("btnAI").onclick = () => renderAI().catch(e => setMsg("Error: " + e.message));
el("btnSave").onclick = () => saveTryOn().catch(e => setMsg("Error: " + e.message));
el("btnBack").onclick = () => window.location.href = "catalog.html";
el("btnExit").onclick = exitForNewUser;
