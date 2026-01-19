const API = "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok=false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

async function loadCatalog() {
  const clienteId = localStorage.getItem("clienteId");
  if (!clienteId) {
    alert("No hay clienteId. Vuelve a la encuesta.");
    window.location.href = "survey.html";
    return;
  }

  setMsg("Cargando catálogo...", true);

  const r = await fetch(`${API}/api/catalogo?clienteId=${clienteId}`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando catálogo");
    return;
  }

  el("context").textContent = `Filtrado por: ${data.tipoCuerpo} + ${data.ocasion}`;

  const cont = el("catalog");
  cont.innerHTML = "";

  if (!data.prendas.length) {
    setMsg("No hay prendas que coincidan con tu perfil. (Falta asignar Tags a las prendas)");
    return;
  }

  data.prendas.forEach(p => {
    const div = document.createElement("div");
    div.className = "cardProduct";

    div.innerHTML = `
      <img src="${p.ImagenUrl || ""}" alt="${p.Nombre}">
      <h3>${p.Nombre}</h3>
      <p class="price">$${Number(p.Precio).toFixed(2)}</p>
      <button class="primary">Probar</button>
    `;

    div.querySelector("button").onclick = () => {
      localStorage.setItem("prendaId", String(p.Id));
      window.location.href = "tryon.html";
    };

    cont.appendChild(div);
  });

  setMsg("Listo ✅", true);
}

el("btnBack").onclick = () => window.location.href = "result.html";

loadCatalog().catch(e => setMsg("Error: " + e.message));
