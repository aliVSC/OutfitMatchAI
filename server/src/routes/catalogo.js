const router = require("express").Router();
const { getPool, sql } = require("../db");

/**
 * GET /api/catalogo?clienteId=1
 * Filtra prendas por:
 * - TipoCuerpo del perfil (tag tipo cuerpo)
 * - Ocasion del perfil (tag ocasion)
 *
 * Requiere que las prendas tengan tags asociados:
 *  Ej: 'pera' y 'oficina'
 */
router.get("/", async (req, res) => {
  try {
    const clienteId = Number(req.query.clienteId);
    if (!clienteId) return res.status(400).json({ error: "clienteId es obligatorio" });

    const pool = await getPool();

    // 1) obtener tipo cuerpo y ocasión del cliente
    const perfil = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`SELECT TOP 1 TipoCuerpo, Ocasion FROM PerfilCliente WHERE ClienteId=@ClienteId`);

    if (!perfil.recordset.length) {
      return res.status(404).json({ error: "No existe perfil. Haz la encuesta primero." });
    }

    const tipoCuerpo = perfil.recordset[0].TipoCuerpo;
    const ocasion = perfil.recordset[0].Ocasion;

    if (!tipoCuerpo || !ocasion) {
      return res.status(400).json({ error: "Perfil incompleto: falta TipoCuerpo u Ocasion" });
    }

    // 2) filtrar prendas por tags (tipoCuerpo + ocasion)
    const prendas = await pool.request()
      .input("TipoCuerpo", sql.NVarChar(80), tipoCuerpo)
      .input("Ocasion", sql.NVarChar(80), ocasion)
      .query(`
        SELECT DISTINCT p.*
        FROM Prendas p
        JOIN PrendaTags pt1 ON pt1.PrendaId = p.Id
        JOIN Tags t1 ON t1.Id = pt1.TagId AND t1.Nombre = @TipoCuerpo
        JOIN PrendaTags pt2 ON pt2.PrendaId = p.Id
        JOIN Tags t2 ON t2.Id = pt2.TagId AND t2.Nombre = @Ocasion
        WHERE p.Activo = 1 AND p.Stock > 0
        ORDER BY p.Id DESC
      `);

    res.json({
      tipoCuerpo,
      ocasion,
      prendas: prendas.recordset
    });
  } catch (e) {
    res.status(500).json({ error: "Error catálogo", detail: String(e.message || e) });
  }
});

module.exports = router;
