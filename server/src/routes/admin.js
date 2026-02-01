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
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: "Falta key" });
    if (key !== process.env.ADMIN_KEY)
      return res.status(401).json({ error: "Clave incorrecta" });
    return res.json({ ok: true });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Error login", detail: String(e.message || e) });
  }
});

// Helper: insertar imágenes (frente/atras/extra/overlay)
async function insertImages(pool, prendaId, imagenes) {
  if (!Array.isArray(imagenes) || imagenes.length === 0) return;

  for (const im of imagenes) {
    const Tipo = (im.Tipo || "").toLowerCase();
    const Url = im.Url || "";
    const Orden = Number(im.Orden || 1);
    const Activo = 1;

    if (!Tipo || !Url) continue;

    await pool
      .request()
      .input("PrendaId", sql.Int, prendaId)
      .input("Tipo", sql.NVarChar(20), Tipo)
      .input("Url", sql.NVarChar(sql.MAX), Url)
      .input("Orden", sql.Int, Orden)
      .input("Activo", sql.Bit, Activo).query(`
        INSERT INTO PrendaImagenes (PrendaId, Tipo, Url, Orden, Activo)
        VALUES (@PrendaId, @Tipo, @Url, @Orden, @Activo)
      `);
  }
}

// ======================================================
// GET /api/admin/prendas
// ======================================================
router.get("/prendas", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT
        p.Id, p.Nombre, p.Categoria, p.Color, p.Precio, p.Stock, p.Activo,
        p.ImagenUrl, p.OverlayUrl,
        (SELECT TOP 1 Url FROM PrendaImagenes WHERE PrendaId=p.Id AND Tipo='frente' AND Activo=1 ORDER BY Orden ASC) AS imgFrente,
        (SELECT TOP 1 Url FROM PrendaImagenes WHERE PrendaId=p.Id AND Tipo='atras' AND Activo=1 ORDER BY Orden ASC) AS imgAtras,
        (SELECT TOP 1 Url FROM PrendaImagenes WHERE PrendaId=p.Id AND Tipo='overlay' AND Activo=1 ORDER BY Orden ASC) AS imgOverlay
      FROM Prendas p
      ORDER BY p.Id DESC
    `);
    res.json({ ok: true, prendas: r.recordset });
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Error listando prendas",
        detail: String(e.message || e),
      });
  }
});

// ======================================================
// POST /api/admin/prendas
// body: { Nombre, Categoria, Color, Precio, Stock, Activo, OverlayUrl, Imagenes:[] }
// ======================================================
router.post("/prendas", requireAdmin, async (req, res) => {
  try {
    const {
      Nombre,
      Categoria,
      Color,
      Precio,
      Stock,
      Activo,
      OverlayUrl,
      Imagenes,
    } = req.body || {};

    const tieneFrente =
      Array.isArray(Imagenes) &&
      Imagenes.some((x) => (x.Tipo || "").toLowerCase() === "frente" && x.Url);
    if (!tieneFrente)
      return res.status(400).json({ error: "Falta imagen de frente" });

    const tieneOverlay =
      Array.isArray(Imagenes) &&
      Imagenes.some((x) => (x.Tipo || "").toLowerCase() === "overlay" && x.Url);
    if (!tieneOverlay)
      return res
        .status(400)
        .json({ error: "Falta overlay PNG (Tipo=overlay)" });

    const pool = await getPool();

    const frente =
      Imagenes.find((x) => (x.Tipo || "").toLowerCase() === "frente" && x.Url)
        ?.Url || null;

    const r = await pool
      .request()
      .input("Nombre", sql.NVarChar(120), Nombre || null)
      .input("Categoria", sql.NVarChar(50), Categoria || null)
      .input("Color", sql.NVarChar(40), Color || null)
      .input("Precio", sql.Decimal(10, 2), Precio ?? null)
      .input("Stock", sql.Int, Stock ?? null)
      .input("Activo", sql.Bit, Activo ?? 1)
      .input("ImagenUrl", sql.NVarChar(sql.MAX), frente)
      .input("OverlayUrl", sql.NVarChar(sql.MAX), OverlayUrl || null).query(`
        INSERT INTO Prendas (Nombre, Categoria, Color, Precio, Stock, Activo, ImagenUrl, OverlayUrl)
        OUTPUT INSERTED.Id
        VALUES (@Nombre, @Categoria, @Color, @Precio, @Stock, @Activo, @ImagenUrl, @OverlayUrl)
      `);

    const newId = r.recordset?.[0]?.Id;
    await insertImages(pool, newId, Imagenes);

    res.json({ ok: true, id: newId });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Error creando prenda", detail: String(e.message || e) });
  }
});

// ======================================================
// PUT /api/admin/prendas/:id
// body: { ..., Imagenes:[] } (si envías imágenes nuevas, reemplaza PrendaImagenes)
// ======================================================
router.put("/prendas/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const {
      Nombre,
      Categoria,
      Color,
      Precio,
      Stock,
      Activo,
      OverlayUrl,
      Imagenes,
    } = req.body || {};

    const pool = await getPool();

    const frenteNueva = Array.isArray(Imagenes)
      ? Imagenes.find((x) => (x.Tipo || "").toLowerCase() === "frente" && x.Url)
          ?.Url || null
      : null;

    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Nombre", sql.NVarChar(120), Nombre || null)
      .input("Categoria", sql.NVarChar(50), Categoria || null)
      .input("Color", sql.NVarChar(40), Color || null)
      .input("Precio", sql.Decimal(10, 2), Precio ?? null)
      .input("Stock", sql.Int, Stock ?? null)
      .input("Activo", sql.Bit, Activo ?? 1)
      .input("OverlayUrl", sql.NVarChar(sql.MAX), OverlayUrl || null)
      .input("ImagenUrl", sql.NVarChar(sql.MAX), frenteNueva).query(`
        UPDATE Prendas
        SET
          Nombre=@Nombre,
          Categoria=@Categoria,
          Color=@Color,
          Precio=@Precio,
          Stock=@Stock,
          Activo=@Activo,
          OverlayUrl=@OverlayUrl,
          ImagenUrl = COALESCE(@ImagenUrl, ImagenUrl)
        WHERE Id=@Id
      `);

    // Si envías Imagenes, reemplaza todas (frente/atras/extra/overlay)
    if (Array.isArray(Imagenes) && Imagenes.length > 0) {
      await pool
        .request()
        .input("Id", sql.Int, id)
        .query(`DELETE FROM PrendaImagenes WHERE PrendaId=@Id`);

      await insertImages(pool, id, Imagenes);
    }

    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({ error: "Error editando prenda", detail: String(e.message || e) });
  }
});

// ======================================================
// PATCH /api/admin/prendas/:id/toggle
// ======================================================
router.patch("/prendas/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { Activo } = req.body || {};
    if (!id) return res.status(400).json({ error: "id inválido" });

    const pool = await getPool();
    await pool
      .request()
      .input("Id", sql.Int, id)
      .input("Activo", sql.Bit, Activo ? 1 : 0)
      .query(`UPDATE Prendas SET Activo=@Activo WHERE Id=@Id`);

    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Error cambiando estado",
        detail: String(e.message || e),
      });
  }
});

// ======================================================
// GET /api/admin/clientes
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
    res
      .status(500)
      .json({
        error: "Error listando clientes",
        detail: String(e.message || e),
      });
  }
});

// ======================================================
// TIPOS DE CUERPO (solo para ingresar los 5)
// ======================================================
router.get("/tipos-cuerpo", requireAdmin, async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT Codigo, Nombre, ImagenUrl
      FROM TiposCuerpo
      ORDER BY Nombre ASC
    `);
    res.json({ ok: true, tipos: r.recordset });
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Error listando tipos cuerpo",
        detail: String(e.message || e),
      });
  }
});

router.post("/tipos-cuerpo", requireAdmin, async (req, res) => {
  try {
    const { Codigo, Nombre, ImagenUrl } = req.body || {};
    if (!Codigo) return res.status(400).json({ error: "Falta Codigo" });
    if (!Nombre) return res.status(400).json({ error: "Falta Nombre" });
    if (!ImagenUrl) return res.status(400).json({ error: "Falta ImagenUrl" });

    const pool = await getPool();

    await pool
      .request()
      .input("Codigo", sql.NVarChar(40), Codigo)
      .input("Nombre", sql.NVarChar(80), Nombre)
      .input("ImagenUrl", sql.NVarChar(sql.MAX), ImagenUrl).query(`
        IF EXISTS (SELECT 1 FROM TiposCuerpo WHERE Codigo=@Codigo)
        BEGIN
          UPDATE TiposCuerpo
          SET Nombre=@Nombre, ImagenUrl=@ImagenUrl
          WHERE Codigo=@Codigo
        END
        ELSE
        BEGIN
          INSERT INTO TiposCuerpo (Codigo, Nombre, ImagenUrl)
          VALUES (@Codigo, @Nombre, @ImagenUrl)
        END
      `);

    res.json({ ok: true });
  } catch (e) {
    res
      .status(500)
      .json({
        error: "Error guardando tipo cuerpo",
        detail: String(e.message || e),
      });
  }
});

// ======================================================
// GET /api/admin/stats/today
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
    res
      .status(500)
      .json({ error: "Error stats", detail: String(e.message || e) });
  }
});

module.exports = router;
