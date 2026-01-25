const API = "http://localhost:8013";
const el = (id) => document.getElementById(id);

function setMsg(t, ok=false) {
  el("msg").textContent = t;
  el("msg").className = ok ? "msg ok" : "msg";
}

function safeStr(x) {
  return (typeof x === "string") ? x : "";
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

  if (!data.prendas || !data.prendas.length) {
    setMsg("No hay prendas que coincidan con tu perfil. (Falta asignar Tags a las prendas)");
    return;
  }

  data.prendas.forEach(p => {
    // ✅ Preferimos las imágenes nuevas (imgFrente/imgAtras)
    // y si no existen, usamos ImagenUrl como respaldo.
    const imgFrente = safeStr(p.imgFrente) || safeStr(p.ImagenUrl);
    const imgAtras  = safeStr(p.imgAtras);

    const div = document.createElement("div");
    div.className = "cardProduct";

    // Si no hay imagen, no mostramos img para evitar ícono roto
    const imgHtml = imgFrente
      ? `<img class="pimg" src="${imgFrente}" alt="${safeStr(p.Nombre)}">`
      : `<div class="pimg placeholder">Sin imagen</div>`;

    div.innerHTML = `
      ${imgHtml}
      <h3>${safeStr(p.Nombre)}</h3>
      <p class="price">$${Number(p.Precio || 0).toFixed(2)}</p>
      <button class="primary">Generar con IA</button>
    `;

    // ✅ Hover: cambia a la imagen "atrás" si existe
    const img = div.querySelector(".pimg");
    if (img && img.tagName === "IMG" && imgAtras) {
      img.addEventListener("mouseenter", () => { img.src = imgAtras; });
      img.addEventListener("mouseleave", () => { img.src = imgFrente; });
    }

    // ✅ Generar con IA (en vez de "Probar")
    div.querySelector("button").onclick = () => {
      localStorage.setItem("prendaId", String(p.Id));

      // opcional: guardar nombre/imagen para mostrar en tryon.html sin pedir al server
      localStorage.setItem("prendaNombre", safeStr(p.Nombre));
      localStorage.setItem("prendaImgFrente", imgFrente || "");

      window.location.href = "tryon.html";
    };

    cont.appendChild(div);
  });

  setMsg("", true);
}

el("btnBack").onclick = () => window.location.href = "result.html";
loadCatalog().catch(e => setMsg("Error: " + (e.message || e)));