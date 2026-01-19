const router = require("express").Router();
const { getPool, sql } = require("../db");

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

router.post("/guardar", async (req, res) => {
  try {
    const { clienteId, prendaId, imagenResultadoBase64 } = req.body;

    if (!clienteId || !prendaId || !imagenResultadoBase64) {
      return res.status(400).json({ error: "clienteId, prendaId e imagenResultadoBase64 son obligatorios" });
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

module.exports = router;


const { nanoBananaTryOn } = require("../nanoBanana");

router.post("/nano", async (req, res) => {
  try {
    const { clienteId, prendaId } = req.body;
    if (!clienteId || !prendaId) return res.status(400).json({ error: "clienteId y prendaId obligatorios" });

    const pool = await getPool();

    const foto = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 FotoBase64
        FROM ClienteFotos
        WHERE ClienteId=@ClienteId
        ORDER BY Fecha DESC
      `);

    if (!foto.recordset.length) return res.status(404).json({ error: "Cliente sin foto" });

    const prenda = await pool.request()
      .input("PrendaId", sql.Int, prendaId)
      .query(`SELECT TOP 1 * FROM Prendas WHERE Id=@PrendaId AND Activo=1`);

    if (!prenda.recordset.length) return res.status(404).json({ error: "Prenda no existe" });

    // Para IA: necesitas base64 de la prenda.
    // MVP: usaremos OverlayUrl como imagen PNG cargada desde el frontend (más fácil).
    // En producción: guardar prenda en base64 o descargar archivo.
    return res.status(400).json({
      error: "Para Nano Banana falta: enviar prendaBase64 desde el frontend (te lo hago en el siguiente paso)."
    });

  } catch (e) {
    res.status(500).json({ error: "Error nano", detail: String(e.message || e) });
  }
});
