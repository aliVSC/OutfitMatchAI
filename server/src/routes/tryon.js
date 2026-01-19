const router = require("express").Router();
const { getPool, sql } = require("../db");
const { nanoBananaTryOn } = require("../nanoBanana");

// =========================
// GET /api/tryon/contexto
// =========================
router.get("/contexto", async (req, res) => {
  try {
    const clienteId = Number(req.query.clienteId);
    const prendaId = Number(req.query.prendaId);

    if (!clienteId || !prendaId) {
      return res.status(400).json({ error: "clienteId y prendaId son obligatorios" });
    }

    const pool = await getPool();

    const foto = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 FotoBase64
        FROM ClienteFotos
        WHERE ClienteId=@ClienteId
        ORDER BY Fecha DESC
      `);

    if (!foto.recordset.length) {
      return res.status(404).json({ error: "Cliente sin foto. Haz encuesta primero." });
    }

    const prenda = await pool.request()
      .input("PrendaId", sql.Int, prendaId)
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
      prenda: prenda.recordset[0]
    });
  } catch (e) {
    res.status(500).json({ error: "Error contexto", detail: String(e.message || e) });
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
        error: "clienteId, prendaId e imagenResultadoBase64 son obligatorios"
      });
    }

    const pool = await getPool();

    await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .input("PrendaId", sql.Int, prendaId)
      .input("Img", sql.NVarChar(sql.MAX), imagenResultadoBase64)
      .query(`
        INSERT INTO TryOnResultados (ClienteId, PrendaId, ImagenResultadoBase64)
        VALUES (@ClienteId, @PrendaId, @Img)
      `);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error guardando", detail: String(e.message || e) });
  }
});

// =========================
// POST /api/tryon/nano
// Body: { clienteId, prendaId, prendaBase64 }
// =========================
router.post("/nano", async (req, res) => {
  try {
    const { clienteId, prendaId, prendaBase64 } = req.body;

    if (!clienteId || !prendaId || !prendaBase64) {
      return res.status(400).json({
        error: "clienteId, prendaId y prendaBase64 son obligatorios"
      });
    }

    const pool = await getPool();

    // 1) Foto del cliente
    const foto = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
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

    // 2) IA Nano Banana
    const resultadoIA = await nanoBananaTryOn({
      personaBase64,
      prendaBase64
    });

    // 3) Guardar resultado
    await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .input("PrendaId", sql.Int, prendaId)
      .input("Img", sql.NVarChar(sql.MAX), resultadoIA)
      .query(`
        INSERT INTO TryOnResultados (ClienteId, PrendaId, ImagenResultadoBase64)
        VALUES (@ClienteId, @PrendaId, @Img)
      `);

    res.json({
      ok: true,
      imagenResultadoBase64: resultadoIA
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: "Error en Nano Banana",
      detail: String(e.message || e)
    });
  }
});

module.exports = router;
