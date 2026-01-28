const API = window.API_BASE || "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok=false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

const STORAGE_ADMIN_KEY = "adminKey";

// ------------------------
// Helpers de UI (tabs)
// ------------------------
function showView(viewId) {
  ["viewDashboard","viewPrendas","viewClientes"].forEach(id => {
    const v = el(id);
    if (!v) return;
    v.classList.add("hidden");
  });
  el(viewId).classList.remove("hidden");
}

function setActiveTab(activeBtnId) {
  ["tabDashboard","tabPrendas","tabClientes"].forEach(id => {
    const b = el(id);
    if (!b) return;
    b.classList.remove("primary");
    b.classList.add("secondary");
  });
  const a = el(activeBtnId);
  a.classList.remove("secondary");
  a.classList.add("primary");
}

// ------------------------
// Auth
// ------------------------
function getAdminKey() {
  return localStorage.getItem(STORAGE_ADMIN_KEY) || "";
}

function setAdminKey(k) {
  localStorage.setItem(STORAGE_ADMIN_KEY, k);
}

function logout() {
  localStorage.removeItem(STORAGE_ADMIN_KEY);
  window.location.href = "index.html";
}

// ------------------------
// Fetch con admin key
// ------------------------
async function adminFetch(path, opts={}) {
  const key = getAdminKey();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    "x-admin-key": key
  };

  const r = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error((data.error || "Error") + (data.detail ? " | " + data.detail : ""));
  }
  return data;
}

// ------------------------
// Login (simple)
// ------------------------
async function ensureLogin() {
  let key = getAdminKey();

  // Si no hay key guardada, pedirla
  if (!key) {
    key = prompt("Ingresa tu ADMIN KEY:");
    if (!key) throw new Error("Cancelado");
    setAdminKey(key);
  }

  // validar contra backend
  const r = await fetch(`${API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    localStorage.removeItem(STORAGE_ADMIN_KEY);
    throw new Error(data.error || "ADMIN KEY inválida");
  }
}

// ========================
// DASHBOARD
// ========================
async function loadDashboard() {
  setMsg("Cargando dashboard...", true);
  const data = await adminFetch("/api/admin/stats/today");
  const s = data.stats || {};

  el("kpiTotalClientes").textContent = s.totalClientes ?? 0;
  el("kpiClientesHoy").textContent = s.clientesHoy ?? 0;
  el("kpiPrendasActivas").textContent = s.prendasActivas ?? 0;
  el("kpiTryonsHoy").textContent = s.tryonsHoy ?? 0;

  setMsg("", true);
}

// ========================
// PRENDAS
// ========================
function getPrendaForm() {
  return {
    Id: el("pId").value.trim(),
    Nombre: el("pNombre").value.trim(),
    Categoria: el("pCategoria").value.trim(),
    Color: el("pColor").value.trim(),
    Precio: el("pPrecio").value === "" ? null : Number(el("pPrecio").value),
    Stock: el("pStock").value === "" ? null : Number(el("pStock").value),
    ImagenUrl: el("pImagenUrl").value.trim(),
    OverlayUrl: el("pOverlayUrl").value.trim(),
    Activo: Number(el("pActivo").value || "1")
  };
}

function fillPrendaForm(p) {
  el("pId").value = p.Id ?? "";
  el("pNombre").value = p.Nombre ?? "";
  el("pCategoria").value = p.Categoria ?? "";
  el("pColor").value = p.Color ?? "";
  el("pPrecio").value = p.Precio ?? "";
  el("pStock").value = p.Stock ?? "";
  el("pImagenUrl").value = p.ImagenUrl ?? p.imgFrente ?? "";
  el("pOverlayUrl").value = p.OverlayUrl ?? "";
  el("pActivo").value = p.Activo ? "1" : "0";
}

function clearPrendaForm() {
  fillPrendaForm({});
}

async function savePrenda() {
  const f = getPrendaForm();
  setMsg("Guardando prenda...", true);

  // normalizar strings vacíos
  const payload = {
    Nombre: f.Nombre || null,
    Categoria: f.Categoria || null,
    Color: f.Color || null,
    Precio: f.Precio,
    Stock: f.Stock,
    Activo: f.Activo ? 1 : 0,
    ImagenUrl: f.ImagenUrl || null,
    OverlayUrl: f.OverlayUrl || null
  };

  if (!f.Id) {
    const r = await adminFetch("/api/admin/prendas", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    setMsg(`Creada ✅ (ID: ${r.id})`, true);
  } else {
    await adminFetch(`/api/admin/prendas/${Number(f.Id)}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    setMsg("Actualizada ✅", true);
  }

  await loadPrendas();
}

async function togglePrenda(id, activo) {
  await adminFetch(`/api/admin/prendas/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ Activo: activo ? 1 : 0 })
  });
  await loadPrendas();
}

async function loadPrendas() {
  setMsg("Cargando prendas...", true);
  const data = await adminFetch("/api/admin/prendas");
  const prendas = data.prendas || [];

  const cont = el("prendasList");
  cont.innerHTML = "";

  if (!prendas.length) {
    cont.innerHTML = `<div class="card">No hay prendas</div>`;
    setMsg("", true);
    return;
  }

  prendas.forEach(p => {
    const img = p.imgFrente || p.ImagenUrl || "";
    const div = document.createElement("div");
    div.className = "cardProduct";

    div.innerHTML = `
      ${img ? `<img class="pimg" src="${img}" alt="${p.Nombre || ""}">` : `<div class="pimg placeholder">Sin imagen</div>`}
      <h3>${p.Nombre || "(sin nombre)"}</h3>
      <p class="meta">ID: ${p.Id} · ${p.Categoria || "-"} · Stock: ${p.Stock ?? "-"}</p>
      <p class="price">$${Number(p.Precio || 0).toFixed(2)} · ${p.Activo ? "Activa ✅" : "Inactiva ❌"}</p>

      <div class="row">
        <button class="secondary btnEdit">Editar</button>
        <button class="secondary btnToggle">${p.Activo ? "Desactivar" : "Activar"}</button>
      </div>
    `;

    div.querySelector(".btnEdit").onclick = () => fillPrendaForm(p);
    div.querySelector(".btnToggle").onclick = () => togglePrenda(p.Id, !p.Activo);

    cont.appendChild(div);
  });

  setMsg("", true);
}

// ========================
// CLIENTES
// ========================
async function loadClientes() {
  setMsg("Cargando clientes...", true);
  const data = await adminFetch("/api/admin/clientes");
  const clientes = data.clientes || [];

  const cont = el("clientesList");
  if (!clientes.length) {
    cont.innerHTML = "No hay clientes registrados.";
    setMsg("", true);
    return;
  }

  // render simple
  cont.innerHTML = `
    <div style="overflow:auto;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">ID</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Nombre</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Email</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Creación</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">Fotos</th>
            <th style="text-align:left; padding:8px; border-bottom:1px solid #eee;">TryOns</th>
          </tr>
        </thead>
        <tbody>
          ${clientes.map(c => `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.Id}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${(c.Nombres||"")+" "+(c.Apellidos||"")}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.Email || "-"}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.FechaCreacion ? new Date(c.FechaCreacion).toLocaleString() : "-"}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.Fotos ?? 0}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.TryOns ?? 0}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  setMsg("", true);
}

// ========================
// INIT
// ========================
async function init() {
  try {
    await ensureLogin();

    // tabs
    el("tabDashboard").onclick = async () => {
      setActiveTab("tabDashboard");
      showView("viewDashboard");
      await loadDashboard();
    };

    el("tabPrendas").onclick = async () => {
      setActiveTab("tabPrendas");
      showView("viewPrendas");
      await loadPrendas();
    };

    el("tabClientes").onclick = async () => {
      setActiveTab("tabClientes");
      showView("viewClientes");
      await loadClientes();
    };

    el("btnLogout").onclick = logout;

    // prendas actions
    el("btnGuardarPrenda").onclick = () => savePrenda().catch(e => setMsg("Error: " + e.message));
    el("btnLimpiarPrenda").onclick = clearPrendaForm;
    el("btnRefrescarPrendas").onclick = () => loadPrendas().catch(e => setMsg("Error: " + e.message));
    el("btnRefrescarClientes").onclick = () => loadClientes().catch(e => setMsg("Error: " + e.message));

    // arranque: dashboard
    setActiveTab("tabDashboard");
    showView("viewDashboard");
    await loadDashboard();

  } catch (e) {
    setMsg("Error: " + (e.message || e));
    alert("No se pudo entrar al Admin: " + (e.message || e));
    logout();
  }
}

init();
