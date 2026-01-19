const router = require("express").Router();
const { getPool, sql } = require("../db");
const { calcTipoCuerpo } = require("../bodyType");

/**
 * POST /api/perfil/wizard
 * Guarda:
 * - PerfilCliente (medidas + datos)
 * - ClienteFotos (foto base64)
 * Calcula tipo de cuerpo y lo guarda
 * Devuelve tipo y la imagen del tipo
 */
router.post("/wizard", async (req, res) => {
  try {
    const {
      clienteId,
      estaturaCm,
      hombrosCm,
      pechoCm,
      cinturaCm,
      caderaCm,
      tonoPiel,
      ocasion,
      estiloPreferido,
      fotoBase64
    } = req.body;

    // Validaciones mínimas
    if (!clienteId) return res.status(400).json({ error: "clienteId es obligatorio" });
    if (!hombrosCm || !pechoCm || !cinturaCm || !caderaCm) {
      return res.status(400).json({ error: "Faltan medidas: hombros/pecho/cintura/cadera" });
    }
    if (!fotoBase64) return res.status(400).json({ error: "La foto (fotoBase64) es obligatoria" });

    // Calcular tipo cuerpo
    const tipo = calcTipoCuerpo({
      hombros: Number(hombrosCm),
      pecho: Number(pechoCm),
      cintura: Number(cinturaCm),
      cadera: Number(caderaCm)
    });

    const pool = await getPool();

    // 1) Guardar foto (1 foto por wizard; puedes cambiar luego)
    await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .input("FotoBase64", sql.NVarChar(sql.MAX), fotoBase64)
      .query(`
        INSERT INTO ClienteFotos (ClienteId, FotoBase64)
        VALUES (@ClienteId, @FotoBase64)
      `);

    // 2) Insertar o actualizar PerfilCliente (ClienteId UNIQUE)
    await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .input("EstaturaCm", sql.Int, estaturaCm || null)
      .input("HombrosCm", sql.Decimal(5,2), Number(hombrosCm))
      .input("PechoCm", sql.Decimal(5,2), Number(pechoCm))
      .input("CinturaCm", sql.Decimal(5,2), Number(cinturaCm))
      .input("CaderaCm", sql.Decimal(5,2), Number(caderaCm))
      .input("TonoPiel", sql.NVarChar(30), tonoPiel || null)
      .input("Ocasion", sql.NVarChar(40), ocasion || null)
      .input("EstiloPreferido", sql.NVarChar(50), estiloPreferido || null)
      .input("TipoCuerpo", sql.NVarChar(40), tipo)
      .query(`
        IF EXISTS (SELECT 1 FROM PerfilCliente WHERE ClienteId=@ClienteId)
        BEGIN
          UPDATE PerfilCliente
          SET EstaturaCm=@EstaturaCm,
              HombrosCm=@HombrosCm,
              PechoCm=@PechoCm,
              CinturaCm=@CinturaCm,
              CaderaCm=@CaderaCm,
              TonoPiel=@TonoPiel,
              Ocasion=@Ocasion,
              EstiloPreferido=@EstiloPreferido,
              TipoCuerpo=@TipoCuerpo,
              FechaActualizacion=SYSDATETIME()
          WHERE ClienteId=@ClienteId
        END
        ELSE
        BEGIN
          INSERT INTO PerfilCliente
          (ClienteId, EstaturaCm, HombrosCm, PechoCm, CinturaCm, CaderaCm, TonoPiel, Ocasion, EstiloPreferido, TipoCuerpo)
          VALUES
          (@ClienteId, @EstaturaCm, @HombrosCm, @PechoCm, @CinturaCm, @CaderaCm, @TonoPiel, @Ocasion, @EstiloPreferido, @TipoCuerpo)
        END
      `);

    // 3) Traer imagen del tipo de cuerpo desde TiposCuerpo
    const t = await pool.request()
      .input("Codigo", sql.NVarChar(40), tipo)
      .query(`SELECT TOP 1 Codigo, Nombre, ImagenUrl FROM TiposCuerpo WHERE Codigo=@Codigo`);

    const tipoInfo = t.recordset[0] || { Codigo: tipo, Nombre: tipo, ImagenUrl: null };

    res.json({
      ok: true,
      tipoCuerpo: tipoInfo.Codigo,
      tipoCuerpoNombre: tipoInfo.Nombre,
      tipoCuerpoImagenUrl: tipoInfo.ImagenUrl
    });
  } catch (e) {
    res.status(500).json({ error: "Error en wizard", detail: String(e.message || e) });
  }
});

/**
 * GET /api/perfil/:clienteId
 * Devuelve perfil + última foto
 */
router.get("/:clienteId", async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    const pool = await getPool();

    const perfil = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`SELECT TOP 1 * FROM PerfilCliente WHERE ClienteId=@ClienteId`);

    if (!perfil.recordset.length) return res.status(404).json({ error: "Perfil no existe" });

    const foto = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 FotoBase64
        FROM ClienteFotos
        WHERE ClienteId=@ClienteId
        ORDER BY Fecha DESC
      `);

    const tipo = perfil.recordset[0].TipoCuerpo;

    const tipoInfo = await pool.request()
      .input("Codigo", sql.NVarChar(40), tipo)
      .query(`SELECT TOP 1 Codigo, Nombre, ImagenUrl FROM TiposCuerpo WHERE Codigo=@Codigo`);

    res.json({
      perfil: perfil.recordset[0],
      ultimaFotoBase64: foto.recordset[0]?.FotoBase64 || null,
      tipoInfo: tipoInfo.recordset[0] || null
    });
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo perfil", detail: String(e.message || e) });
  }
});

module.exports = router;
