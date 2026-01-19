const { GoogleGenAI } = require("@google/genai");

function cleanBase64(b64) {
  return b64.includes("base64,") ? b64.split("base64,")[1] : b64;
}

/**
 * Recibe dos imágenes (persona + prenda) y devuelve imagen editada (base64)
 */
async function nanoBananaTryOn({ personaBase64, prendaBase64 }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
Edit the FIRST image: keep the same person identity, face, skin tone, pose and background.
Replace ONLY the clothing with the garment shown in the SECOND image.
Make it realistic: fit, shadows, lighting, perspective. Do not change the face.
`.trim();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: cleanBase64(personaBase64) } },
        { inlineData: { mimeType: "image/png", data: cleanBase64(prendaBase64) } }
      ]
    }],
    config: { responseModalities: ["Image"] }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.data);
  if (!img) throw new Error("La IA no devolvió imagen.");

  return "data:image/png;base64," + img.inlineData.data;
}

module.exports = { nanoBananaTryOn };
