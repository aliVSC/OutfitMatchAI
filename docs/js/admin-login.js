const API = window.API_BASE || "http://localhost:8013";
const el = (id) => document.getElementById(id);

const STORAGE_ADMIN_KEY = "adminKey";

function setMsg(t, ok=false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

async function login() {
  const key = el("adminKey").value.trim();
  if (!key) return setMsg("Ingresa tu ADMIN KEY.");

  setMsg("Validando...", true);

  const r = await fetch(`${API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    setMsg(data.error || "Clave inválida");
    return;
  }

  localStorage.setItem(STORAGE_ADMIN_KEY, key);
  setMsg("Acceso correcto ✅", true);

  window.location.href = "admin.html";
}

el("btnLogin").onclick = () => login().catch(e => setMsg("Error: " + (e.message || e)));
el("btnBack").onclick = () => (window.location.href = "index.html");

// Enter para login
el("adminKey").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login().catch(err => setMsg("Error: " + (err.message || err)));
});