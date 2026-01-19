const router = require("express").Router();
const { getPool, sql } = require("../db");

router.get("/:clienteId", async (req, res) => {
  try {
    const clienteId = Number(req.params.clienteId);
    if (!clienteId) return res.status(400).json({ error: "clienteId inválido" });

    const pool = await getPool();

    const r = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`
        SELECT TOP 1 TonoPiel, Ocasion, TipoCuerpo
        FROM PerfilCliente
        WHERE ClienteId=@ClienteId
      `);

    if (!r.recordset.length) {
      return res.status(404).json({ error: "Perfil no encontrado. Completa la encuesta primero." });
    }

    const { TonoPiel, Ocasion, TipoCuerpo } = r.recordset[0];

    // ===== PALETA por tono =====
    const paletas = {
      claro: {
        texto: "Te favorecen tonos suaves y luminosos: marfil, beige claro, rosados suaves, celestes.",
        colores: ["#F6D6C9", "#F2E2D8", "#EFB7A5", "#C9D6F6"]
      },
      medio_claro: {
        texto: "Te favorecen tonos cálidos medios: camel, terracota suave, verde oliva, azul petróleo.",
        colores: ["#E0AC69", "#C68642", "#7A8F55", "#1F6F8B"]
      },
      medio_oscuro: {
        texto: "Te favorecen tonos intensos: mostaza, vino, verde bosque, azul marino.",
        colores: ["#C68642", "#7A2E2E", "#1F4D2B", "#1F2A44"]
      },
      oscuro: {
        texto: "Te favorecen tonos profundos y contrastantes: blanco, dorado, esmeralda, fucsia.",
        colores: ["#FFFFFF", "#C9A227", "#007F5F", "#C2185B"]
      }
    };

    const paleta = paletas[TonoPiel] || { texto: "", colores: [] };

    // ===== CONTRASTE sugerido (simple) =====
    const contrasteSugerido = (TonoPiel === "claro") ? "alto"
      : (TonoPiel === "oscuro") ? "bajo"
      : "medio";

    // ===== Recomendaciones por cuerpo =====
    const reglas = {
      reloj_arena: {
        objetivo: "Marcar la cintura y mantener equilibrio entre hombros y cadera.",
        si: ["Cinturones", "Vestidos entallados", "Escote V", "Pantalón tiro alto"],
        no: ["Oversize sin forma", "Prendas cuadradas sin cintura"]
      },
      pera: {
        objetivo: "Llevar atención a la parte superior y estilizar cadera.",
        si: ["Blusas claras o con detalle arriba", "Blazer estructurado", "Pantalón recto/bootcut", "Escote barco o V"],
        no: ["Bolsillos grandes en cadera", "Faldas muy ajustadas", "Detalles voluminosos abajo"]
      },
      manzana: {
        objetivo: "Estilizar el centro del cuerpo y crear líneas verticales.",
        si: ["Chaquetas abiertas", "Cortes rectos", "Escote V", "Vestidos corte A"],
        no: ["Prendas muy ajustadas al abdomen", "Cinturones apretados en cintura"]
      },
      rectangulo: {
        objetivo: "Crear curvas visuales y dar forma a la silueta.",
        si: ["Capas (blazer + top)", "Cinturones", "Texturas", "Faldas con volumen"],
        no: ["Looks totalmente rectos", "Prendas planas sin estructura"]
      },
      triangulo_invertido: {
        objetivo: "Equilibrar hombros con volumen en la parte inferior.",
        si: ["Pantalones amplios", "Faldas con volumen", "Colores oscuros arriba", "Detalles abajo"],
        no: ["Hombreras", "Mangas abullonadas arriba", "Cuellos altos con mucho volumen"]
      }
    };

    const cuerpo = reglas[TipoCuerpo] || { objetivo: "", si: [], no: [] };

    // ===== Tips por ocasión =====
    const tipsPorOcasion = {
      casual: ["Telas cómodas y cortes relajados.", "Combina básicos con un accesorio."],
      oficina: ["Colores neutros y cortes limpios.", "Evita transparencias y escotes profundos."],
      cita: ["Usa un color protagonista.", "Resalta tu mejor zona (cintura u hombros)."],
      fiesta: ["Agrega brillo o textura.", "Equilibra: si arriba es llamativo, abajo simple."],
      formal: ["Tonos sobrios.", "Cortes minimalistas y elegantes."]
    };

    const tipsOcasion = tipsPorOcasion[Ocasion] || [];

    // ✅ Respuesta EXACTA como tu result.js espera
    res.json({
      paleta,
      contrasteSugerido,
      cuerpo,
      tipsOcasion
    });

  } catch (e) {
    console.error("Error recomendaciones:", e);
    res.status(500).json({ error: "Error recomendaciones", detail: String(e.message || e) });
  }
});

module.exports = router;
