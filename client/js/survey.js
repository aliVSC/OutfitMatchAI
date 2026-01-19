const API = "http://localhost:8013";

let stream = null;
let photoBase64 = null;

const el = (id) => document.getElementById(id);

function setMsg(text, ok=false) {
  const m = el("msg");
  m.textContent = text;
  m.className = ok ? "msg ok" : "msg";
}

function getTonoPiel() {
  return document.querySelector('input[name="tonoPiel"]:checked')?.value || "";
}

async function startCamera() {
  try {
    const video = el("video");
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    setMsg("Cámara encendida ✅", true);
  } catch (e) {
    setMsg("No se pudo acceder a la cámara. Revisa permisos del navegador.");
  }
}

function takePhoto() {
  const video = el("video");
  const canvas = el("canvas");
  const ctx = canvas.getContext("2d");

  if (!stream) {
    setMsg("Primero enciende la cámara.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  photoBase64 = canvas.toDataURL("image/png");
  el("preview").src = photoBase64;
  el("preview").classList.remove("hidden");

  setMsg("Foto tomada ✅", true);
}

function validateForm() {
  const nombres = el("nombres").value.trim();
  const apellidos = el("apellidos").value.trim();

  const hombros = Number(el("hombros").value);
  const pecho = Number(el("pecho").value);
  const cintura = Number(el("cintura").value);
  const cadera = Number(el("cadera").value);

  const tonoPiel = getTonoPiel(); // ✅ CAMBIO
  const ocasion = el("ocasion").value;
  const estiloPreferido = el("estiloPreferido").value;

  if (!nombres || !apellidos) return "Completa nombres y apellidos.";
  if (!hombros || !pecho || !cintura || !cadera) return "Completa todas las medidas obligatorias.";
  if (!tonoPiel) return "Selecciona tono de piel.";
  if (!ocasion) return "Selecciona para qué necesitas la ropa (ocasión).";
  if (!photoBase64) return "Toma una foto antes de finalizar.";

  return null;
}

async function createCliente() {
  const r = await fetch(`${API}/api/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nombres: el("nombres").value.trim(),
      apellidos: el("apellidos").value.trim(),
      email: el("email").value.trim() || null,
      telefono: el("telefono").value.trim() || null
    })
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error creando cliente");
  return data.clienteId;
}

async function sendWizard(clienteId) {
  const payload = {
    clienteId,
    estaturaCm: Number(el("estatura").value) || null,
    hombrosCm: Number(el("hombros").value),
    pechoCm: Number(el("pecho").value),
    cinturaCm: Number(el("cintura").value),
    caderaCm: Number(el("cadera").value),
    tonoPiel: getTonoPiel(), // ✅ CAMBIO
    ocasion: el("ocasion").value,
    estiloPreferido: el("estiloPreferido").value || null,
    fotoBase64: photoBase64
  };

  const r = await fetch(`${API}/api/perfil/wizard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Error guardando perfil");
  return data;
}

async function finish() {
  const err = validateForm();
  if (err) {
    setMsg(err);
    return;
  }

  try {
    setMsg("Guardando datos...", true);

    const clienteId = await createCliente();
    const result = await sendWizard(clienteId);

    localStorage.setItem("clienteId", String(clienteId));
    localStorage.setItem("tipoCuerpo", result.tipoCuerpo);
    localStorage.setItem("tipoCuerpoNombre", result.tipoCuerpoNombre || result.tipoCuerpo);
    localStorage.setItem("tipoCuerpoImagenUrl", result.tipoCuerpoImagenUrl || "");
    localStorage.setItem("ocasion", el("ocasion").value);
    localStorage.setItem("tonoPiel", getTonoPiel()); // ✅ opcional pero útil

    window.location.href = "result.html";
  } catch (e) {
    setMsg("Error: " + (e.message || e));
  }
}

el("btnCamera").addEventListener("click", startCamera);
el("btnPhoto").addEventListener("click", takePhoto);
el("btnSend").addEventListener("click", finish);