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

THIS IS A VIRTUAL FITTING ROOM (TRY-ON).
The person in the FIRST image may already be wearing clothes.
You MUST COMPLETELY REMOVE/REPLACE the original clothes so the final result shows ONLY the new garment (not layered).

PRIMARY GOAL:
1) Replace the person’s CURRENT clothing entirely with the garment shown in the SECOND image.
   - The original outfit must be removed (erase it) before applying the new garment.
   - NO OVERLAY, NO LAYERS: do not place the new garment on top of old clothes.
   - The final image must look like the person changed clothes, not like clothes were added.

FULL BODY REQUIREMENT (OUTPAINT):
2) If the FIRST image is cropped (face/upper body/half body), EXTEND (outpaint) the image to a full-body view:
   - Extend downward (and slightly sideways if needed) to generate missing torso/waist/legs/feet naturally.
   - Keep realistic proportions consistent with the visible body.
   - The pose must remain coherent with the visible shoulders/arms orientation.
   - The final image must NOT look stretched or deformed.

GARMENT COMPLETION RULES:
- The garment from the SECOND image must be complete and clean (correct neckline, straps, sleeves, length).
- If the garment is a TOP/BLOUSE/BODY that only covers the upper part:
  - Dress the person with that top AND generate a neutral, realistic bottom (simple jeans/pants/skirt) that matches lighting and style.
  - The bottom must be minimal and not draw attention; it must NOT introduce fancy patterns, logos, or extra accessories.
  - The goal is a full-body result that looks natural in a store fitting room.
- If the garment is a full outfit (dress/jumpsuit/set), do NOT add extra pieces.

REALISM RULES:
- Make the garment fit naturally to the person’s body: correct size, alignment, seams, folds, fabric texture.
- Add realistic shadows and lighting consistent with the scene.
- Respect occlusions: arms/hair can cover parts naturally.
- Do not add extra accessories unless they are part of the garment in the SECOND image.

HARD IDENTITY RULES (must follow):
- DO NOT change the face. Do not alter identity, facial features, expression, hairstyle, skin tone, or any pixels of the visible face region.
- Do NOT create a new face. Do NOT replace the head. Do NOT generate a different person.
- Keep body proportions consistent (no extreme slimming, no changing body shape).

IMPORTANT "NO LAYERING" CHECK:
Before finalizing, verify:
- No visible part of the original clothes remains (no collars, sleeves, hoodies, shirts underneath),
  unless the SECOND image clearly includes them.
- Example: if original has a white hoodie and the new garment is a strap dress, the final must show ONLY the strap dress.

OUTPUT:
- Return a single realistic final image.
- Full body whenever the original was cropped.
- No text, no logos, no watermark, no extra people, no artifacts.
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
          { inlineData: { mimeType: p2.mimeType, data: p2.data } },
        ],
      },
    ],
    config: { responseModalities: ["Image"] },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);

  if (!img) throw new Error("Nano Banana no devolvió imagen.");

  return "data:image/png;base64," + img.inlineData.data;
}

module.exports = { nanoBananaTryOn };