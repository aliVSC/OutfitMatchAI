const router = require("express").Router();
const { getPool, sql } = require("../db");

// ===============================
// Middleware: Admin Key
// ===============================
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "No autorizado (admin)" });
  }
  next();
}

// ===============================
// POST /api/admin/login
// body: { key: "..." }
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: "Falta key" });
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Clave incorrecta" });
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Error login", detail: String(e.message || e) });
  }
});

// ======================================================
// GET /api/admin/prendas  (todas: activas e inactivas)
// ======================================================
router.get("/prendas", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        p.Id, p.Nombre, p.Categoria, p.Color, p.Precio, p.Stock, p.Activo,
        p.ImagenUrl, p.OverlayUrl,
        (SELECT TOP 1 Url FROM PrendaImagenes WHERE PrendaId=p.Id AND Tipo='frente' AND Activo=1 ORDER BY Orden ASC) AS imgFrente,
        (SELECT TOP 1 Url FROM PrendaImagenes WHERE PrendaId=p.Id AND Tipo='atras' AND Activo=1 ORDER BY Orden ASC) AS imgAtras
      FROM Prendas p
      ORDER BY p.Id DESC
    `);
    res.json({ ok: true, prendas: r.recordset });
  } catch (e) {
    res.status(500).json({ error: "Error listando prendas", detail: String(e.message || e) });
  }
});

// ======================================================
// POST /api/admin/prendas  (crear prenda)
// body: { Nombre, Categoria, Color, Precio, Stock, Activo, ImagenUrl, OverlayUrl }
// ======================================================
router.post("/prendas", requireAdmin, async (req, res) => {
  try {
    const {
      Nombre, Categoria, Color,
      Precio, Stock, Activo,
      ImagenUrl, OverlayUrl
    } = req.body || {};

    const pool = await getPool();

    const r = await pool.request()
      .input("Nombre", sql.NVarChar(120), Nombre || null)
      .input("Categoria", sql.NVarChar(50), Categoria || null)
      .input("Color", sql.NVarChar(40), Color || null)
      .input("Precio", sql.Decimal(10,2), (Precio ?? null))
      .input("Stock", sql.Int, (Stock ?? null))
      .input("Activo", sql.Bit, (Activo ?? 1))
      .input("ImagenUrl", sql.NVarChar(300), ImagenUrl || null)
      .input("OverlayUrl", sql.NVarChar(300), OverlayUrl || null)
      .query(`
        INSERT INTO Prendas (Nombre, Categoria, Color, Precio, Stock, Activo, ImagenUrl, OverlayUrl)
        OUTPUT INSERTED.Id
        VALUES (@Nombre, @Categoria, @Color, @Precio, @Stock, @Activo, @ImagenUrl, @OverlayUrl)
      `);

    res.json({ ok: true, id: r.recordset?.[0]?.Id });
  } catch (e) {
    res.status(500).json({ error: "Error creando prenda", detail: String(e.message || e) });
  }
});

// ======================================================
// PUT /api/admin/prendas/:id  (editar prenda)
// ======================================================
router.put("/prendas/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const {
      Nombre, Categoria, Color,
      Precio, Stock, Activo,
      ImagenUrl, OverlayUrl
    } = req.body || {};

    const pool = await getPool();

    await pool.request()
      .input("Id", sql.Int, id)
      .input("Nombre", sql.NVarChar(120), Nombre || null)
      .input("Categoria", sql.NVarChar(50), Categoria || null)
      .input("Color", sql.NVarChar(40), Color || null)
      .input("Precio", sql.Decimal(10,2), (Precio ?? null))
      .input("Stock", sql.Int, (Stock ?? null))
      .input("Activo", sql.Bit, (Activo ?? 1))
      .input("ImagenUrl", sql.NVarChar(300), ImagenUrl || null)
      .input("OverlayUrl", sql.NVarChar(300), OverlayUrl || null)
      .query(`
        UPDATE Prendas
        SET
          Nombre=@Nombre,
          Categoria=@Categoria,
          Color=@Color,
          Precio=@Precio,
          Stock=@Stock,
          Activo=@Activo,
          ImagenUrl=@ImagenUrl,
          OverlayUrl=@OverlayUrl
        WHERE Id=@Id
      `);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error editando prenda", detail: String(e.message || e) });
  }
});

// ======================================================
// PATCH /api/admin/prendas/:id/toggle  (activar/desactivar)
// body: { Activo: 0|1 }
// ======================================================
router.patch("/prendas/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Activo } = req.body || {};
    if (!id) return res.status(400).json({ error: "id inválido" });

    const pool = await getPool();
    await pool.request()
      .input("Id", sql.Int, id)
      .input("Activo", sql.Bit, (Activo ? 1 : 0))
      .query(`UPDATE Prendas SET Activo=@Activo WHERE Id=@Id`);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Error cambiando estado", detail: String(e.message || e) });
  }
});

// ======================================================
// GET /api/admin/clientes  (lista)
// ======================================================
router.get("/clientes", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT TOP 500
        c.Id, c.Nombres, c.Apellidos, c.Email, c.Telefono, c.RangoEdad, c.FechaCreacion,
        (SELECT COUNT(*) FROM ClienteFotos f WHERE f.ClienteId = c.Id) AS Fotos,
        (SELECT COUNT(*) FROM TryOnResultados t WHERE t.ClienteId = c.Id) AS TryOns
      FROM Clientes c
      ORDER BY c.Id DESC
    `);
    res.json({ ok: true, clientes: r.recordset });
  } catch (e) {
    res.status(500).json({ error: "Error listando clientes", detail: String(e.message || e) });
  }
});

// ======================================================
// GET /api/admin/stats/today  (dashboard rápido)
// ======================================================
router.get("/stats/today", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      DECLARE @hoy DATE = CONVERT(date, SYSDATETIME());

      SELECT
        (SELECT COUNT(*) FROM Clientes) AS totalClientes,
        (SELECT COUNT(*) FROM Prendas WHERE Activo=1) AS prendasActivas,
        (SELECT COUNT(*) FROM Clientes WHERE CONVERT(date, FechaCreacion)=@hoy) AS clientesHoy,
        (SELECT COUNT(*) FROM TryOnResultados WHERE CONVERT(date, Fecha)=@hoy) AS tryonsHoy
    `);
    res.json({ ok: true, stats: r.recordset[0] });
  } catch (e) {
    res.status(500).json({ error: "Error stats", detail: String(e.message || e) });
  }
});

module.exports = router;
