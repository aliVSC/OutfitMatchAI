const router = require("express").Router();
const path = require("path");
const fs = require("fs");

const { getPool, sql } = require("../db");
const { nanoBananaTryOn } = require("../nanoBanana");

// =========================
// GET /api/tryon/contexto
// (solo para mostrar info si quieres)
// =========================
router.get("/contexto", async (req, res) => {
  try {
    const clienteId = Number(req.query.clienteId);
    const prendaId = Number(req.query.prendaId);

    if (!clienteId || !prendaId) {
      return res
        .status(400)
        .json({ error: "clienteId y prendaId son obligatorios" });
    }

    const pool = await getPool();

    const foto = await pool.request().input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 FotoBase64
        FROM ClienteFotos
        WHERE ClienteId=@ClienteId
        ORDER BY Fecha DESC
      `);

    if (!foto.recordset.length) {
      return res
        .status(404)
        .json({ error: "Cliente sin foto. Haz encuesta primero." });
    }

    const prenda = await pool.request().input("PrendaId", sql.Int, prendaId)
      .query(`
        SELECT TOP 1 *
        FROM Prendas
        WHERE Id=@PrendaId AND Activo=1
      `);

    if (!prenda.recordset.length) {
      return res.status(404).json({ error: "Prenda no existe o inactiva." });
    }

    res.json({
      fotoBase64: foto.recordset[0].FotoBase64,
      prenda: prenda.recordset[0],
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Error contexto", detail: String(e.message || e) });
  }
});

// =========================
// POST /api/tryon/guardar
// =========================
router.post("/guardar", async (req, res) => {
  try {
    const { clienteId, prendaId, imagenResultadoBase64 } = req.body;

    if (!clienteId || !prendaId || !imagenResultadoBase64) {
      return res.status(400).json({
        error: "clienteId, prendaId e imagenResultadoBase64 son obligatorios",
      });
    }

    const pool = await getPool();

    await pool
      .request()
      .input("ClienteId", sql.Int, clienteId)
      .input("PrendaId", sql.Int, prendaId)
      .input("Img", sql.NVarChar(sql.MAX), imagenResultadoBase64).query(`
        INSERT INTO TryOnResultados (ClienteId, PrendaId, ImagenResultadoBase64)
        VALUES (@ClienteId, @PrendaId, @Img)
      `);

    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Error guardando", detail: String(e.message || e) });
  }
});

// =========================
// POST /api/tryon/ai
// Body: { clienteId, prendaId }
// Lee el PNG de Overlay desde disco usando Prendas.OverlayUrl
// =========================
router.post("/ai", async (req, res) => {
  try {
    const { clienteId, prendaId } = req.body;

    if (!clienteId || !prendaId) {
      return res
        .status(400)
        .json({ error: "clienteId y prendaId son obligatorios" });
    }

    const pool = await getPool();

    // 1) Foto del cliente
    const foto = await pool.request().input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 FotoBase64
        FROM ClienteFotos
        WHERE ClienteId=@ClienteId
        ORDER BY Fecha DESC
      `);

    if (!foto.recordset.length) {
      return res.status(404).json({ error: "Cliente sin foto" });
    }

    const personaBase64 = foto.recordset[0].FotoBase64;

    // 2) Prenda (obligatorio OverlayUrl)
    const prendaQ = await pool.request().input("PrendaId", sql.Int, prendaId)
      .query(`
        SELECT TOP 1 Id, Nombre, OverlayUrl
        FROM Prendas
        WHERE Id=@PrendaId AND Activo=1
      `);

    if (!prendaQ.recordset.length) {
      return res.status(404).json({ error: "Prenda no existe o inactiva" });
    }

    const prenda = prendaQ.recordset[0];

    if (!prenda.OverlayUrl) {
      return res
        .status(400)
        .json({ error: "Esta prenda no tiene OverlayUrl en la BD." });
    }

    // 3) Construir ruta ABSOLUTA del archivo dentro de /client
    // OverlayUrl debe ser: assets/overlay/xxx.png
    const overlayRelative = String(prenda.OverlayUrl).replace(/^\/+/, "");
    const overlayPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "client",
      overlayRelative,
    );

    if (!fs.existsSync(overlayPath)) {
      return res.status(404).json({
        error: "No se encontró el overlay en disco",
        detail: overlayPath,
      });
    }

    // 4) Leer PNG y convertir a base64 dataURL
    const buffer = fs.readFileSync(overlayPath);
    const prendaBase64 = "data:image/png;base64," + buffer.toString("base64");

    // 5) IA
    const resultadoIA = await nanoBananaTryOn({
      personaBase64,
      prendaBase64,
    });

    // 6) Guardar resultado
    await pool
      .request()
      .input("ClienteId", sql.Int, clienteId)
      .input("PrendaId", sql.Int, prendaId)
      .input("Img", sql.NVarChar(sql.MAX), resultadoIA).query(`
        INSERT INTO TryOnResultados (ClienteId, PrendaId, ImagenResultadoBase64)
        VALUES (@ClienteId, @PrendaId, @Img)
      `);

    res.json({ ok: true, imagenResultadoBase64: resultadoIA });
  } catch (e) {
    console.error("AI ERROR:", e);
    res.status(500).json({
      error: "Error en IA",
      detail: String(e.message || e),
    });
  }
});

module.exports = router;
