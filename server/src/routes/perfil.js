const router = require("express").Router();
const { getPool, sql } = require("../db");
const { calcTipoCuerpo } = require("../bodyType");

/**
 * POST /api/perfil/wizard
 * Guarda:
 * - PerfilCliente (medidas + tono + ocasion + tipoCuerpo)
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
      fotoBase64
    } = req.body;

    // ===== 0) Normalizar / convertir =====
    const id = Number(clienteId);

    const est = (estaturaCm !== undefined && estaturaCm !== null && estaturaCm !== "")
      ? Number(estaturaCm)
      : null;

    const homb = Number(hombrosCm);
    const pecho = Number(pechoCm);
    const cint = Number(cinturaCm);
    const cad = Number(caderaCm);

    // ===== 1) Validaciones fuertes =====
    if (!id) return res.status(400).json({ error: "clienteId es obligatorio" });

    // si llega 0, NaN, null, "" => falla
    if (![homb, pecho, cint, cad].every(n => Number.isFinite(n) && n > 0)) {
      return res.status(400).json({
        error: "Medidas inválidas. Revisa hombros/pecho/cintura/cadera (deben ser números > 0)."
      });
    }

    if (!tonoPiel) return res.status(400).json({ error: "tonoPiel es obligatorio" });
    if (!ocasion) return res.status(400).json({ error: "ocasion es obligatorio" });
    if (!fotoBase64) return res.status(400).json({ error: "La foto (fotoBase64) es obligatoria" });

    // ===== 2) Calcular tipo cuerpo =====
    let tipo = "rectangulo";
    try {
      tipo = calcTipoCuerpo({
        hombros: homb,
        pecho: pecho,
        cintura: cint,
        cadera: cad
      });
    } catch (errCalc) {
      console.error("ERROR calcTipoCuerpo:", errCalc);
      return res.status(500).json({
        error: "Error calculando tipo de cuerpo",
        detail: String(errCalc.message || errCalc)
      });
    }

    const pool = await getPool();

    // ===== 3) Guardar foto (histórico) =====
    await pool.request()
      .input("ClienteId", sql.Int, id)
      .input("FotoBase64", sql.NVarChar(sql.MAX), fotoBase64)
      .query(`
        INSERT INTO ClienteFotos (ClienteId, FotoBase64)
        VALUES (@ClienteId, @FotoBase64)
      `);

    // ===== 4) UPSERT PerfilCliente (ClienteId UNIQUE) =====
    await pool.request()
      .input("ClienteId", sql.Int, id)
      .input("EstaturaCm", sql.Int, Number.isFinite(est) ? est : null)
      .input("HombrosCm", sql.Decimal(5,2), homb)
      .input("PechoCm", sql.Decimal(5,2), pecho)
      .input("CinturaCm", sql.Decimal(5,2), cint)
      .input("CaderaCm", sql.Decimal(5,2), cad)
      .input("TonoPiel", sql.NVarChar(30), tonoPiel)
      .input("Ocasion", sql.NVarChar(40), ocasion)
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
              TipoCuerpo=@TipoCuerpo,
              FechaActualizacion=SYSDATETIME()
          WHERE ClienteId=@ClienteId
        END
        ELSE
        BEGIN
          INSERT INTO PerfilCliente
          (ClienteId, EstaturaCm, HombrosCm, PechoCm, CinturaCm, CaderaCm, TonoPiel, Ocasion, TipoCuerpo)
          VALUES
          (@ClienteId, @EstaturaCm, @HombrosCm, @PechoCm, @CinturaCm, @CaderaCm, @TonoPiel, @Ocasion, @TipoCuerpo)
        END
      `);

    // ===== 5) Traer imagen del tipo de cuerpo =====
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
    console.error("WIZARD ERROR REAL:", e);
    res.status(500).json({
      error: "Error en wizard",
      detail: String(e.message || e)
    });
  }
});

/**
 * GET /api/perfil/:clienteId
 * Devuelve perfil + última foto
 */
router.get("/:clienteId", async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    if (!clienteId) return res.status(400).json({ error: "clienteId inválido" });

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
    console.error("GET PERFIL ERROR:", e);
    res.status(500).json({ error: "Error obteniendo perfil", detail: String(e.message || e) });
  }
});

module.exports = router;
