require("dotenv").config();
const express = require("express");
const cors = require("cors");

const clientes = require("./routes/clientes");
const perfil = require("./routes/perfil");
const catalogo = require("./routes/catalogo");
const tryon = require("./routes/tryon");
const recomendaciones = require("./routes/recomendaciones");


const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/api/clientes", clientes);
app.use("/api/perfil", perfil);
app.use("/api/catalogo", catalogo);
app.use("/api/tryon", tryon);
app.use("/api/recomendaciones", recomendaciones);


app.listen(process.env.PORT, () =>
  console.log("Servidor activo en puerto", process.env.PORT)
);
