const API = "http://localhost:8013";

const tipoNombre = localStorage.getItem("tipoCuerpoNombre") || "Tipo de cuerpo";
const imgUrl = localStorage.getItem("tipoCuerpoImagenUrl") || "";
const clienteId = localStorage.getItem("clienteId");

document.getElementById("tipoNombre").textContent = tipoNombre;

const img = document.getElementById("tipoImg");
if (imgUrl) img.src = imgUrl;
else img.style.display = "none";

document.getElementById("goCatalog").onclick = () => window.location.href = "catalog.html";
document.getElementById("goSurvey").onclick = () => window.location.href = "survey.html";

function setMsg(t, ok = false) {
  const m = document.getElementById("msg");
  m.textContent = t;
  m.className = ok ? "msg ok" : "msg";
}

function fillList(id, items) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  (items || []).forEach(x => {
    const li = document.createElement("li");
    li.textContent = x;
    ul.appendChild(li);
  });
}

function renderPalette(colors) {
  const paleta = document.getElementById("paleta");
  paleta.innerHTML = "";
  (colors || []).forEach(c => {
    const box = document.createElement("div");
    box.className = "colorBox";
    box.style.background = c;
    paleta.appendChild(box);
  });
}

async function loadRecs() {
  if (!clienteId) {
    setMsg("No hay clienteId. Vuelve a la encuesta.");
    return;
  }

  setMsg("Cargando recomendaciones...", true);

  // ✅ este ES tu endpoint real porque tu recomendaciones.js usa router.get("/:clienteId")
  const r = await fetch(`${API}/api/recomendaciones/${clienteId}`);
  const data = await r.json();

  if (!r.ok) {
    setMsg(data.error || "Error cargando recomendaciones");
    return;
  }

  // ===== OBJETIVO =====
  document.getElementById("objetivo").textContent = data.cuerpo?.objetivo || "";

  // ===== PALETA =====
  const paletaTexto = document.getElementById("paletaTexto");
  const contraste = document.getElementById("contraste");

  if (data.paleta?.colores?.length) {
    renderPalette(data.paleta.colores);
    paletaTexto.textContent = data.paleta.texto || "Paleta recomendada según tu tono de piel.";
  } else {
    renderPalette([]);
    paletaTexto.textContent = "No se detectó tono de piel. Vuelve a completar la encuesta.";
  }

  contraste.textContent = `Contraste sugerido: ${data.contrasteSugerido || "medio"}.`;

  // ===== LISTAS CUERPO =====
  fillList("siList", data.cuerpo?.si || []);
  fillList("noList", data.cuerpo?.no || []);

  // ===== TIPS OCASION =====
  fillList("ocasionTips", data.tipsOcasion || []);

  setMsg("Listo ✅", true);
}

loadRecs().catch(e => setMsg("Error: " + (e.message || e)));
