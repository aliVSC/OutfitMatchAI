const { GoogleGenAI } = require("@google/genai");

function splitDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") {
    return { mimeType: "image/png", data: "" };
  }

  if (!dataUrl.includes("base64,")) {
    // ya viene “crudo”
    return { mimeType: "image/png", data: dataUrl };
  }

  const [meta, b64] = dataUrl.split("base64,");
  const mimeMatch = meta.match(/^data:(.*?);/i);
  const mimeType = mimeMatch?.[1] || "image/png";
  return { mimeType, data: b64 };
}

function nowMs() {
  return Date.now();
}

function approxBytesFromBase64(b64) {
  if (!b64) return 0;
  // aproximación: base64 length * 0.75
  return Math.floor(b64.length * 0.75);
}

function buildPrompt({ strict = false } = {}) {
  return `
You are editing the FIRST image using the garment from the SECOND image.

THIS IS A VIRTUAL FITTING ROOM (TRY-ON).
The person in the FIRST image may already be wearing clothes.
You MUST COMPLETELY REMOVE/REPLACE the original clothes so the final result shows ONLY the new garment (not layered).

CRITICAL SAFETY / CLOTHING COVERAGE (MANDATORY):
- The final image must be FULLY DRESSED.
- Never leave the chest/torso uncovered.
- If replacing clothing results in exposed skin, you MUST add basic clothing to cover it.

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

GARMENT COMPLETION RULES (MANDATORY):
- The garment from the SECOND image must be complete and clean (correct neckline, straps, sleeves, length).

A) If the garment is ONLY a TOP / BLOUSE / SHIRT / BODY (upper garment):
  - Dress the person with that TOP AND generate a neutral, realistic BOTTOM (simple jeans/pants/skirt).
  - Minimal, no logos, no patterns, no accessories.

B) If the garment is ONLY a BOTTOM / PANTS / JEANS / SHORTS / SKIRT (lower garment):
  - Dress the person with that BOTTOM AND generate a neutral, realistic TOP.
  - Use a simple plain t-shirt or basic blouse, solid color, NO logos, NO patterns.
  - The TOP must fully cover chest and torso.

C) If the garment is a full outfit (dress/jumpsuit/set):
  - Do NOT add extra pieces.

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

OUTPUT:
- Return a single realistic final image.
- Full body whenever the original was cropped.
- No text, no logos, no watermark, no extra people, no artifacts.

${strict ? `
STRICT FALLBACK (USE IF ANYTHING IS UNCLEAR):
- If you are not sure what TOP to generate, ALWAYS use: plain white t-shirt (short sleeve), no logos.
- If you are not sure what BOTTOM to generate, ALWAYS use: plain black jeans, no logos.
- DOUBLE CHECK: person must be fully dressed (no exposed chest/torso).
` : ""}
`.trim();
}

async function generateTryOnOnce({ ai, model, p1, p2, strict = false }) {
  const prompt = buildPrompt({ strict });

  const response = await ai.models.generateContent({
    model,
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

  if (!img) return { ok: false, dataUrl: null, raw: response };
  return { ok: true, dataUrl: "data:image/png;base64," + img.inlineData.data, raw: response };
}

async function nanoBananaTryOn({ personaBase64, prendaBase64 }) {
  const started = nowMs();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-image";

  const p1 = splitDataUrl(personaBase64);
  const p2 = splitDataUrl(prendaBase64);

  if (!p1.data || !p2.data) {
    throw new Error("Faltan imágenes (base64) para Nano Banana.");
  }

  // =========================
  // MÉTRICAS (input)
  // =========================
  const inputMetrics = {
    model,
    personaMime: p1.mimeType,
    prendaMime: p2.mimeType,
    personaApproxBytes: approxBytesFromBase64(p1.data),
    prendaApproxBytes: approxBytesFromBase64(p2.data),
  };

  console.log("[TryOn] inputMetrics:", inputMetrics);

  // 1) intento normal
  const t1 = nowMs();
  const first = await generateTryOnOnce({ ai, model, p1, p2, strict: false });
  const t1ms = nowMs() - t1;

  console.log("[TryOn] attempt1:", {
    ok: first.ok,
    ms: t1ms,
    hasImage: !!first.dataUrl,
  });

  // 2) fallback: reintento estricto (sirve para casos como “pantalón => torso desnudo”)
  // No podemos “ver” si quedó desnuda, pero tu caso real ya mostró que pasa.
  // Entonces hacemos retry por defecto si quieres “más confiable”.
  if (!first.ok) {
    const t2 = nowMs();
    const second = await generateTryOnOnce({ ai, model, p1, p2, strict: true });
    const t2ms = nowMs() - t2;

    console.log("[TryOn] attempt2(strict):", {
      ok: second.ok,
      ms: t2ms,
      hasImage: !!second.dataUrl,
    });

    if (!second.ok) {
      throw new Error("Nano Banana no devolvió imagen en ninguno de los intentos.");
    }

    console.log("[TryOn] totalMs:", nowMs() - started);
    return second.dataUrl;
  }

  // ✅ Opcional recomendado:
  // si quieres mejorar el caso “pantalón”, fuerza SIEMPRE un segundo intento estricto
  // cuando el usuario selecciona prenda de tipo "bottom".
  // (si en tu DB ya sabes si es pantalón/falda, pásame ese flag y lo hacemos perfecto)

  console.log("[TryOn] totalMs:", nowMs() - started);
  return first.dataUrl;
}

module.exports = { nanoBananaTryOn };

