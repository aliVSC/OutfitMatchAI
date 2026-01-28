require("dotenv").config();
const express = require("express");
const cors = require("cors");

const clientes = require("./routes/clientes");
const perfil = require("./routes/perfil");
const catalogo = require("./routes/catalogo");
const tryon = require("./routes/tryon");
const recomendaciones = require("./routes/recomendaciones");

const app = express();

// ✅ CORS (para pruebas)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "20mb" }));

// ❌ OJO: en Render NO te sirve "express.static('client')" si tu frontend va en GitHub Pages
// Puedes dejarlo, pero no es necesario.
// app.use(express.static("client"));

app.get("/", (req, res) => {
  res.send("OutfitMatchAI API is running ✅");
});

app.use("/api/clientes", clientes);
app.use("/api/perfil", perfil);
app.use("/api/catalogo", catalogo);
app.use("/api/tryon", tryon);
app.use("/api/recomendaciones", recomendaciones);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));