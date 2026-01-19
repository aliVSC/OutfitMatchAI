function calcTipoCuerpo({ hombros, pecho, cintura, cadera }) {
  if (Math.abs(pecho - cadera) <= 5 && cintura <= pecho * 0.75)
    return "reloj_arena";

  if (cadera > hombros * 1.1) return "pera";
  if (hombros > cadera * 1.1) return "triangulo_invertido";
  if (cintura >= pecho * 0.9) return "manzana";

  return "rectangulo";
}

module.exports = { calcTipoCuerpo };
