// supabase/functions/classify-defect/index.ts
// Supabase Edge Function — Groq Vision AI Classifier
// Triggered via HTTP POST from the Postgres trigger on defects INSERT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DefectRecord {
  id: string;
  image_url: string;
  audio_transcript: string;
}

interface GroqClassification {
  defect_type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  responsible_trade: string;
  suggested_action: string;
}

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const record: DefectRecord = body.record;

    if (!record?.id || !record?.image_url) {
      return new Response(
        JSON.stringify({ error: "Missing record fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { id, image_url, audio_transcript } = record;

    // ── 1. Call Groq Vision API ──────────────────────────────────────────────
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are an expert construction QA engineer specialising in concrete defects for Leighton Asia. Analyse this site photo and classify the defect.

Concrete defect categories to consider:
- Honeycombing / concrete voids (poor vibration, congested rebar, low workability)
- Exposed reinforcement / insufficient cover (critical durability issue)
- Uneven finish / laitance (aesthetic + coating adhesion risk)
- Cold joints / step joints (poor pour sequencing or delays)
- Residual formwork, nails, or tie-bolt holes (poor post-pour cleaning)
- Cracks and surface damage (shrinkage cracks, edge damage, chipping)

Engineer's voice note from site: "${audio_transcript ?? 'No verbal context provided.'}"

Classify the defect:
- defect_type: use the closest category name above, or describe accurately if none match
- priority: Critical (structural risk) / High (durability concern) / Medium (quality issue) / Low (cosmetic)
- responsible_trade: e.g. Concrete Contractor, Formwork Subcontractor, Civil Engineer
- suggested_action: short, actionable remediation step (e.g. 'Hack out and patch with non-shrink grout', 'Increase cover and re-inspect')`,`
                },
                {
                  type: "image_url",
                  image_url: { url: image_url },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "defect_classification",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  defect_type: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["Low", "Medium", "High", "Critical"],
                  },
                  responsible_trade: { type: "string" },
                  suggested_action: { type: "string" },
                },
                required: [
                  "defect_type",
                  "priority",
                  "responsible_trade",
                  "suggested_action",
                ],
                additionalProperties: false,
              },
            },
          },
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error:", errText);
      throw new Error(`Groq API returned ${groqResponse.status}: ${errText}`);
    }

    const groqData = await groqResponse.json();
    const classification: GroqClassification = JSON.parse(
      groqData.choices[0].message.content
    );

    // ── 2. Update the defect row in Supabase ─────────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: updateError } = await supabase
      .from("defects")
      .update({
        defect_type: classification.defect_type,
        priority: classification.priority,
        responsible_trade: classification.responsible_trade,
        suggested_action: classification.suggested_action,
        status: "Processed",
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Supabase update error: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, id, classification }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("classify-defect error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
