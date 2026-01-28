require("dotenv").config();
const express = require("express");
const cors = require("cors");

const clientes = require("./routes/clientes");
const perfil = require("./routes/perfil");
const catalogo = require("./routes/catalogo");
const tryon = require("./routes/tryon");
const recomendaciones = require("./routes/recomendaciones");

// ✅ NUEVO
const admin = require("./routes/admin");

const app = express();

// CORS (si tu frontend está en GitHub Pages, puedes limitarlo después)
// por ahora lo dejo abierto para que funcione sí o sí.
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "x-admin-key"]
}));

app.use(express.json({ limit: "20mb" }));

app.get("/", (req, res) => res.send("OutfitMatchAI API is running ✅"));

app.use("/api/clientes", clientes);
app.use("/api/perfil", perfil);
app.use("/api/catalogo", catalogo);
app.use("/api/tryon", tryon);
app.use("/api/recomendaciones", recomendaciones);

// ✅ NUEVO
app.use("/api/admin", admin);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));
