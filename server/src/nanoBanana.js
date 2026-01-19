const { GoogleGenAI } = require("@google/genai");

function splitDataUrl(dataUrl) {
  // data:image/png;base64,AAA...  ó data:image/jpeg;base64,AAA...
  if (!dataUrl || typeof dataUrl !== "string") {
    return { mimeType: "image/png", data: "" };
  }

  if (!dataUrl.includes("base64,")) {
    // si viene solo base64 limpio, asumimos png
    return { mimeType: "image/png", data: dataUrl };
  }

  const [meta, b64] = dataUrl.split("base64,");
  const mimeMatch = meta.match(/^data:(.*?);/i);
  const mimeType = mimeMatch?.[1] || "image/png";

  return { mimeType, data: b64 };
}

async function nanoBananaTryOn({ personaBase64, prendaBase64 }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
Edit the FIRST image.
Keep the same person identity, face, skin tone, pose and background.
Replace ONLY the clothing with the garment shown in the SECOND image.
Make it realistic: natural fit, correct scale, shadows, lighting and fabric texture.
Do NOT change the face, body shape or background.
`.trim();

  const p1 = splitDataUrl(personaBase64);
  const p2 = splitDataUrl(prendaBase64);

  if (!p1.data || !p2.data) {
    throw new Error("Faltan imágenes (base64) para Nano Banana.");
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType: p1.mimeType, data: p1.data } },
        { inlineData: { mimeType: p2.mimeType, data: p2.data } }
      ]
    }],
    config: { responseModalities: ["Image"] }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.data);

  if (!img) throw new Error("Nano Banana no devolvió imagen.");

  return "data:image/png;base64," + img.inlineData.data;
}

module.exports = { nanoBananaTryOn };
