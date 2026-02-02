const API = window.API_BASE || "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok = false) {
  const m = el("msg");
  if (!m) return;
  m.textContent = t;
  m.className = ok ? "msg ok" : "msg";
}

const STORAGE_ADMIN_KEY = "adminKey";
let editingPrendaId = null;

// =========================
// UI helpers
// =========================
function showView(viewId) {
  ["viewDashboard", "viewPrendas", "viewClientes"].forEach((id) => {
    const v = el(id);
    if (!v) return;
    v.classList.add("hidden");
  });
  el(viewId)?.classList.remove("hidden");
}

function setActiveTab(activeBtnId) {
  ["tabDashboard", "tabPrendas", "tabClientes"].forEach((id) => {
    const b = el(id);
    if (!b) return;
    b.classList.remove("primary");
    b.classList.add("secondary");
  });
  const a = el(activeBtnId);
  if (!a) return;
  a.classList.remove("secondary");
  a.classList.add("primary");
}

function openPrendaForm() {
  el("prendaFormWrap")?.classList.remove("hidden");
}

function closePrendaForm() {
  el("prendaFormWrap")?.classList.add("hidden");
}

// =========================
// Auth
// =========================
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

// =========================
// Fetch con admin key
// =========================
async function adminFetch(path, opts = {}) {
  const key = getAdminKey();
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
    "x-admin-key": key,
  };

  const r = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      (data.error || "Error") + (data.detail ? " | " + data.detail : "")
    );
  }
  return data;
}

// =========================
// Login (simple)
// =========================
async function ensureLogin() {
  let key = getAdminKey();
  if (!key) {
    key = prompt("admin12345");
    if (!key) throw new Error("Cancelado");
    setAdminKey(key);
  }

  const r = await fetch(`${API}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    localStorage.removeItem(STORAGE_ADMIN_KEY);
    throw new Error(data.error || "ADMIN KEY inválida");
  }
}

// =========================
// Helpers imágenes (File -> base64)
// =========================
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ""));
    fr.onerror = () => reject(new Error("No se pudo leer archivo"));
    fr.readAsDataURL(file);
  });
}

function showPreview(imgId, dataUrl) {
  const img = el(imgId);
  if (!img) return;
  img.src = dataUrl;
  img.classList.remove("hidden");
}

function hidePreview(imgId) {
  const img = el(imgId);
  if (!img) return;
  img.src = "";
  img.classList.add("hidden");
}

// =========================
// TAGS (ocasión)
// =========================
function getSelectedTags() {
  // checkboxes: <input class="tagCheck" value="casual" ...>
  const checks = Array.from(document.querySelectorAll(".tagCheck"));
  return checks
    .filter((c) => c.checked)
    .map((c) => String(c.value || "").trim().toLowerCase())
    .filter(Boolean);
}

function clearTagsUI() {
  const checks = Array.from(document.querySelectorAll(".tagCheck"));
  checks.forEach((c) => (c.checked = false));
}

function setTagsUIFromCsv(tagsCsv) {
  clearTagsUI();
  const csv = String(tagsCsv || "").trim();
  if (!csv) return;

  const selected = csv
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

  const checks = Array.from(document.querySelectorAll(".tagCheck"));
  checks.forEach((c) => {
    const v = String(c.value || "").trim().toLowerCase();
    c.checked = selected.includes(v);
  });
}

function renderTagsChips(tagsCsv) {
  const csv = String(tagsCsv || "").trim();
  if (!csv) return `<span class="hint">Sin tags</span>`;

  const items = csv
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return items
    .map((t) => `<span class="tagChipMini">${escapeHtml(t)}</span>`)
    .join(" ");
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// DASHBOARD
// =========================
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

// =========================
// PRENDAS
// =========================
function setEditHint() {
  const h = el("editHint");
  if (!h) return;

  h.textContent = editingPrendaId
    ? `Editando prenda ID: ${editingPrendaId} (si NO eliges nuevas imágenes, se conservan las actuales)`
    : "Creando prenda nueva";
}

function getPrendaForm() {
  return {
    Nombre: el("pNombre").value.trim(),
    Categoria: el("pCategoria").value.trim(),
    Color: el("pColor").value.trim(),
    Precio: el("pPrecio").value === "" ? null : Number(el("pPrecio").value),
    Stock: el("pStock").value === "" ? null : Number(el("pStock").value),
    Activo: Number(el("pActivo").value || "1"),
  };
}

function clearPrendaForm() {
  editingPrendaId = null;
  setEditHint();

  el("pNombre").value = "";
  el("pCategoria").value = "";
  el("pColor").value = "";
  el("pPrecio").value = "";
  el("pStock").value = "";
  el("pActivo").value = "1";

  // tags
  clearTagsUI();

  // files
  el("imgFrente").value = "";
  el("imgAtras").value = "";
  el("imgExtras").value = "";
  el("imgOverlay").value = "";

  hidePreview("prevFrente");
  hidePreview("prevAtras");
  hidePreview("prevOverlay");
  el("extrasPreview").innerHTML = "";
}

function hasAnySelectedFiles() {
  const frente = el("imgFrente").files?.length || 0;
  const atras = el("imgAtras").files?.length || 0;
  const overlay = el("imgOverlay").files?.length || 0;
  const extras = el("imgExtras").files?.length || 0;
  return frente + atras + overlay + extras > 0;
}

async function collectImagesPayloadStrict() {
  const frenteFile = el("imgFrente").files?.[0] || null;
  const atrasFile = el("imgAtras").files?.[0] || null;
  const overlayFile = el("imgOverlay").files?.[0] || null;
  const extrasFiles = Array.from(el("imgExtras").files || []);

  // Al CREAR: frente + overlay obligatorios
  if (!editingPrendaId && !frenteFile) {
    throw new Error("La foto de frente es obligatoria para crear la prenda.");
  }
  if (!editingPrendaId && !overlayFile) {
    throw new Error("El Overlay PNG es obligatorio para usar TryOn IA.");
  }

  const images = [];

  if (frenteFile) {
    const dataUrl = await fileToDataUrl(frenteFile);
    images.push({ Tipo: "frente", Url: dataUrl, Orden: 1, Activo: 1 });
  }

  if (atrasFile) {
    const dataUrl = await fileToDataUrl(atrasFile);
    images.push({ Tipo: "atras", Url: dataUrl, Orden: 1, Activo: 1 });
  }

  if (overlayFile) {
    const dataUrl = await fileToDataUrl(overlayFile);
    images.push({ Tipo: "overlay", Url: dataUrl, Orden: 1, Activo: 1 });
  }

  for (let i = 0; i < extrasFiles.length; i++) {
    const dataUrl = await fileToDataUrl(extrasFiles[i]);
    images.push({ Tipo: "extra", Url: dataUrl, Orden: i + 1, Activo: 1 });
  }

  return images;
}

async function savePrenda() {
  const f = getPrendaForm();
  setMsg("Preparando datos...", true);

  const tags = getSelectedTags(); // ✅ aquí sacamos los tags marcados

  const payload = {
    Nombre: f.Nombre || null,
    Categoria: f.Categoria || null,
    Color: f.Color || null,
    Precio: f.Precio,
    Stock: f.Stock,
    Activo: f.Activo ? 1 : 0,

    // ✅ nuevo: Tags para backend
    Tags: tags,
  };

  // imágenes (igual que antes)
  if (!editingPrendaId) {
    payload.Imagenes = await collectImagesPayloadStrict();
  } else {
    if (hasAnySelectedFiles()) {
      payload.Imagenes = await collectImagesPayloadStrict();
    }
  }

  setMsg("Guardando prenda...", true);

  if (!editingPrendaId) {
    const r = await adminFetch("/api/admin/prendas", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setMsg(`Creada ✅ (ID: ${r.id})`, true);
    clearPrendaForm();
    closePrendaForm();
  } else {
    await adminFetch(`/api/admin/prendas/${editingPrendaId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setMsg("Actualizada ✅", true);
    clearPrendaForm();
    closePrendaForm();
  }

  await loadPrendas();
}

async function togglePrenda(id, activo) {
  await adminFetch(`/api/admin/prendas/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ Activo: activo ? 1 : 0 }),
  });
  await loadPrendas();
}

function fillPrendaForEdit(p) {
  openPrendaForm();

  editingPrendaId = p.Id;
  setEditHint();

  el("pNombre").value = p.Nombre ?? "";
  el("pCategoria").value = p.Categoria ?? "";
  el("pColor").value = p.Color ?? "";
  el("pPrecio").value = p.Precio ?? "";
  el("pStock").value = p.Stock ?? "";
  el("pActivo").value = p.Activo ? "1" : "0";

  // ✅ tags: marca checks según TagsCsv
  setTagsUIFromCsv(p.TagsCsv);

  // previews desde DB
  if (p.imgFrente) showPreview("prevFrente", p.imgFrente);
  else hidePreview("prevFrente");

  if (p.imgAtras) showPreview("prevAtras", p.imgAtras);
  else hidePreview("prevAtras");

  if (p.imgOverlay) showPreview("prevOverlay", p.imgOverlay);
  else hidePreview("prevOverlay");

  // inputs file vacíos
  el("imgFrente").value = "";
  el("imgAtras").value = "";
  el("imgExtras").value = "";
  el("imgOverlay").value = "";
  el("extrasPreview").innerHTML = "";

  setMsg(
    "Edita campos y tags. Si deseas cambiar imágenes, selecciona nuevos archivos. Si no, se conservan.",
    true
  );
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

  prendas.forEach((p) => {
    const img = p.imgFrente || p.ImagenUrl || "";
    const div = document.createElement("div");
    div.className = "cardProduct";

    div.innerHTML = `
      ${
        img
          ? `<img class="pimg" src="${img}" alt="${escapeHtml(p.Nombre || "")}">`
          : `<div class="pimg placeholder">Sin imagen</div>`
      }
      <h3>${escapeHtml(p.Nombre || "(sin nombre)")}</h3>
      <p class="meta">${escapeHtml(p.Categoria || "-")} · Stock: ${
      p.Stock ?? "-"
    }</p>
      <p class="price">$${Number(p.Precio || 0).toFixed(2)} · ${
      p.Activo ? "Activa ✅" : "Inactiva ❌"
    }</p>
      <p class="meta">${p.imgOverlay ? "Overlay ✅" : "Overlay ❌"}</p>

      <div style="margin-top:8px;">
        ${renderTagsChips(p.TagsCsv)}
      </div>

      <div class="row" style="margin-top:10px;">
        <button class="secondary btnEdit">Editar</button>
        <button class="secondary btnToggle">${
          p.Activo ? "Desactivar" : "Activar"
        }</button>
      </div>
    `;

    div.querySelector(".btnEdit").onclick = () => fillPrendaForEdit(p);
    div.querySelector(".btnToggle").onclick = () => togglePrenda(p.Id, !p.Activo);

    cont.appendChild(div);
  });

  setMsg("", true);
}

// =========================
// Previews en vivo
// =========================
el("imgFrente")?.addEventListener("change", async () => {
  const f = el("imgFrente").files?.[0];
  if (!f) return hidePreview("prevFrente");
  showPreview("prevFrente", await fileToDataUrl(f));
});

el("imgAtras")?.addEventListener("change", async () => {
  const f = el("imgAtras").files?.[0];
  if (!f) return hidePreview("prevAtras");
  showPreview("prevAtras", await fileToDataUrl(f));
});

el("imgOverlay")?.addEventListener("change", async () => {
  const f = el("imgOverlay").files?.[0];
  if (!f) return hidePreview("prevOverlay");
  showPreview("prevOverlay", await fileToDataUrl(f));
});

el("imgExtras")?.addEventListener("change", async () => {
  const files = Array.from(el("imgExtras").files || []);
  const cont = el("extrasPreview");
  cont.innerHTML = "";
  if (!files.length) return;

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    const card = document.createElement("div");
    card.className = "cardProduct";
    card.innerHTML = `
      <img class="pimg" src="${dataUrl}" alt="extra" />
      <h3>Extra</h3>
      <p class="meta">${escapeHtml(file.name)}</p>
    `;
    cont.appendChild(card);
  }
});

// =========================
// CLIENTES
// =========================
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
          ${clientes
            .map(
              (c) => `
            <tr>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.Id}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${escapeHtml(
                (c.Nombres || "") + " " + (c.Apellidos || "")
              )}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${escapeHtml(
                c.Email || "-"
              )}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${
                c.FechaCreacion ? new Date(c.FechaCreacion).toLocaleString() : "-"
              }</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.Fotos ?? 0}</td>
              <td style="padding:8px; border-bottom:1px solid #f2f2f2;">${c.TryOns ?? 0}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;

  setMsg("", true);
}

// =========================
// INIT
// =========================
async function init() {
  try {
    await ensureLogin();
    setEditHint();

    // Tabs
    el("tabDashboard").onclick = async () => {
      setActiveTab("tabDashboard");
      showView("viewDashboard");
      await loadDashboard();
    };

    el("tabPrendas").onclick = async () => {
      setActiveTab("tabPrendas");
      showView("viewPrendas");
      await loadPrendas();

      closePrendaForm();
      editingPrendaId = null;
      setEditHint();
      setMsg("", true);
    };

    el("tabClientes").onclick = async () => {
      setActiveTab("tabClientes");
      showView("viewClientes");
      await loadClientes();
    };

    el("btnLogout").onclick = logout;

    // Botones prendas
    el("btnNuevoProducto").onclick = () => {
      clearPrendaForm();
      openPrendaForm();
      setMsg("Listo. Crea tu nuevo producto.", true);
    };

    el("btnGuardarPrenda").onclick = () =>
      savePrenda().catch((e) => setMsg("Error: " + e.message));

    el("btnLimpiarPrenda").onclick = () => {
      clearPrendaForm();
      setMsg("Formulario limpiado.", true);
    };

    el("btnCerrarFormulario").onclick = () => {
      closePrendaForm();
      setMsg("", true);
    };

    el("btnRefrescarPrendas").onclick = () =>
      loadPrendas().catch((e) => setMsg("Error: " + e.message));

    el("btnRefrescarClientes").onclick = () =>
      loadClientes().catch((e) => setMsg("Error: " + e.message));

    // Arranque
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