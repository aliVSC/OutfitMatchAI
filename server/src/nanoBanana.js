const { GoogleGenAI } = require("@google/genai");

function splitDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { mimeType: "image/png", data: "" };
  }

  if (!dataUrl.includes("base64,")) {
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
You are editing the FIRST image using the garment from the SECOND image.

GOAL:
1) Dress the person in the FIRST image with the garment shown in the SECOND image, realistically.
2) If the person in the FIRST image is cropped (only face/upper body/half body), EXTEND (outpaint) the image to show a FULL BODY view logically and naturally.

HARD RULES (must follow):
- DO NOT change the face. Do not alter facial features, identity, hairstyle, skin tone, expression, or any pixels of the visible face region.
- Do NOT create a new face. Do NOT replace the head. Do NOT generate a different person.
- Keep the same person identity and keep the same background style/lighting.
- Replace ONLY the clothing with the garment from the SECOND image (fit, texture, folds, shadows must look real).
- Keep body proportions consistent with the visible part of the person. No extreme changes.

OUTPAINTING / COMPLETION RULES:
- If the image is cropped, extend the canvas downward (and if needed slightly sideways) to complete the missing body parts.
- The completed lower body should match the person’s body type implied by the visible torso/arms/legs.
- The completed background must blend seamlessly with the original background (same color, lighting, perspective).
- If legs/feet are missing, generate them naturally and consistent with the pose.
- Do not add extra people, text, logos, watermarks, or artifacts.

OUTPUT:
- Return a single realistic final image.
`.trim();

  const p1 = splitDataUrl(personaBase64);
  const p2 = splitDataUrl(prendaBase64);

  if (!p1.data || !p2.data) {
    throw new Error("Faltan imágenes (base64) para Nano Banana.");
  }

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: p1.mimeType, data: p1.data } },
          { inlineData: { mimeType: p2.mimeType, data: p2.data } }
        ]
      }
    ],
    config: { responseModalities: ["Image"] }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.data);

  if (!img) throw new Error("Nano Banana no devolvió imagen.");

  return "data:image/png;base64," + img.inlineData.data;
}

module.exports = { nanoBananaTryOn };
