const router = require("express").Router();
const { getPool, sql } = require("../db");

// Reglas simples de paletas por tono de piel
const PALETAS = {
  claro: {
    nombre: "Claro",
    colores: ["#2E5AAC", "#7A2E7A", "#2E7A5E", "#C04A4A", "#2B2B2B", "#FFFFFF"],
    texto: "Te favorecen tonos fríos y contrastes suaves. Evita colores muy amarillos apagados."
  },
  medio_claro: {
    nombre: "Medio claro",
    colores: ["#E67E22", "#1F618D", "#117A65", "#B03A2E", "#6C3483", "#F4F1DE"],
    texto: "Te favorecen tonos cálidos moderados y colores vivos sin exagerar. Prueba terracota, verde, azul."
  },
  medio_oscuro: {
    nombre: "Medio oscuro",
    colores: ["#D35400", "#196F3D", "#1A5276", "#922B21", "#7D3C98", "#FDEBD0"],
    texto: "Te favorecen tonos cálidos profundos y colores intensos. Prueba mostaza, esmeralda, vino."
  },
  oscuro: {
    nombre: "Oscuro",
    colores: ["#F4D03F", "#E74C3C", "#5DADE2", "#58D68D", "#AF7AC5", "#FFFFFF"],
    texto: "Te favorecen colores brillantes y contrastes altos. Prueba amarillo, blanco, rojo, turquesa."
  }
};

// Reglas por tipo de cuerpo
const CUERPO = {
  pera: {
    si: [
      "Blusas con hombros estructurados o mangas con volumen",
      "Chaquetas/blazers cortos a la cintura",
      "Pantalones rectos o bootcut",
      "Faldas en A"
    ],
    no: [
      "Pantalones súper ajustados en cadera si no quieres resaltarla",
      "Volantes o bolsillos grandes en cadera"
    ],
    objetivo: "Equilibrar la parte superior con la cadera."
  },
  manzana: {
    si: [
      "Escote en V",
      "Vestidos imperio o corte bajo el busto",
      "Chaquetas abiertas (línea vertical)",
      "Pantalones rectos/tiro medio"
    ],
    no: [
      "Prendas muy apretadas en cintura",
      "Cinturones muy marcados al centro"
    ],
    objetivo: "Crear línea vertical y definir sin apretar la zona media."
  },
  reloj_arena: {
    si: [
      "Cintura marcada (cinturón fino o corte entallado)",
      "Vestidos ajustados moderados",
      "Pantalón tiro alto",
      "Blusas entalladas"
    ],
    no: [
      "Ropa muy oversize sin forma",
      "Capas muy gruesas que oculten la cintura"
    ],
    objetivo: "Resaltar proporción natural y cintura."
  },
  rectangulo: {
    si: [
      "Capas (blazer + top) para volumen",
      "Faldas con vuelo o plisadas",
      "Pantalón tiro alto + cinturón",
      "Blusas con textura/volumen"
    ],
    no: [
      "Looks totalmente rectos sin cortes",
      "Prendas sin estructura"
    ],
    objetivo: "Crear curvas y definición visual."
  },
  triangulo_invertido: {
    si: [
      "Pantalones con volumen (wide leg, palazzo)",
      "Faldas en A",
      "Cuellos simples (evitar hombreras)",
      "Colores oscuros arriba + claros abajo"
    ],
    no: [
      "Hombreras fuertes",
      "Cuellos muy cargados arriba"
    ],
    objetivo: "Equilibrar hombros con cadera."
  }
};

// Reglas por ocasión (extra)
const OCASION = {
  oficina: [
    "Colores neutros + 1 color protagonista",
    "Blazer, pantalón recto, blusa simple",
    "Zapatos limpios, accesorios discretos"
  ],
  cita: [
    "Un punto focal: labios, collar o prenda protagonista",
    "Colores que iluminen (según paleta)",
    "Prenda que te haga sentir cómoda y segura"
  ],
  casual: [
    "Básicos: jeans recto + camiseta + chaqueta",
    "Capas ligeras y zapatillas limpias",
    "Colores neutros + toques"
  ],
  fiesta: [
    "Brillos controlados o telas satinadas",
    "Accesorios más protagonistas",
    "Un solo elemento fuerte para no sobrecargar"
  ],
  formal: [
    "Monocromático o tonos oscuros elegantes",
    "Cortes limpios, telas estructuradas",
    "Accesorios minimalistas"
  ]
};

router.get("/", async (req, res) => {
  try {
    const clienteId = Number(req.query.clienteId);
    if (!clienteId) return res.status(400).json({ error: "clienteId es obligatorio" });

    const pool = await getPool();

    const p = await pool.request()
      .input("ClienteId", sql.Int, clienteId)
      .query(`SELECT TOP 1 TipoCuerpo, TonoPiel, Ocasion, EstiloPreferido FROM PerfilCliente WHERE ClienteId=@ClienteId`);

    if (!p.recordset.length) return res.status(404).json({ error: "No hay perfil. Haz la encuesta." });

    const perfil = p.recordset[0];
    const tipo = (perfil.TipoCuerpo || "").toLowerCase().trim();
    const tono = (perfil.TonoPiel || "").toLowerCase().trim();
    const ocasion = (perfil.Ocasion || "").toLowerCase().trim();

    const paleta = PALETAS[tono] || null;
    const cuerpo = CUERPO[tipo] || null;
    const tipsOcasion = OCASION[ocasion] || [];

    // Tip extra: contraste sugerido (simple)
    const contraste = (tono === "oscuro") ? "alto" : (tono === "claro" ? "medio" : "medio-alto");

    res.json({
      perfil: {
        tipoCuerpo: tipo,
        tonoPiel: tono,
        ocasion,
        estiloPreferido: perfil.EstiloPreferido || null
      },
      paleta,
      cuerpo,
      tipsOcasion,
      contrasteSugerido: contraste
    });
  } catch (e) {
    res.status(500).json({ error: "Error recomendaciones", detail: String(e.message || e) });
  }
});

module.exports = router;
