const router = require("express").Router();
const { getPool, sql } = require("../db");

/**
 * POST /api/clientes
 * Crea un cliente (nombres, apellidos, rangoEdad, email, telefono)
 * Devuelve: { clienteId }
 */
router.post("/", async (req, res) => {
  try {
    const { nombres, apellidos, rangoEdad, email, telefono } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({ error: "Nombres y apellidos son obligatorios." });
    }

    if (!rangoEdad) {
      return res.status(400).json({ error: "Rango de edad es obligatorio." });
    }

    const pool = await getPool();

    const r = await pool.request()
      .input("Nombres", sql.NVarChar(80), nombres.trim())
      .input("Apellidos", sql.NVarChar(80), apellidos.trim())
      .input("RangoEdad", sql.NVarChar(30), rangoEdad)
      .input("Email", sql.NVarChar(150), email?.trim() || null)
      .input("Telefono", sql.NVarChar(30), telefono?.trim() || null)
      .query(`
        INSERT INTO Clientes (Nombres, Apellidos, RangoEdad, Email, Telefono)
        OUTPUT INSERTED.Id
        VALUES (@Nombres, @Apellidos, @RangoEdad, @Email, @Telefono)
      `);

    res.json({ clienteId: r.recordset[0].Id });
  } catch (e) {
    res.status(500).json({ error: "Error creando cliente", detail: String(e.message || e) });
  }
});

/**
 * GET /api/clientes/:id
 * Obtiene cliente
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pool = await getPool();

    const r = await pool.request()
      .input("Id", sql.Int, id)
      .query(`SELECT TOP 1 * FROM Clientes WHERE Id=@Id`);

    if (!r.recordset.length) return res.status(404).json({ error: "Cliente no existe" });

    res.json(r.recordset[0]);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo cliente", detail: String(e.message || e) });
  }
});

module.exports = router;
