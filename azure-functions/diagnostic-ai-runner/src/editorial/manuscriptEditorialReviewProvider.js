"use strict";

/**
 * Content-aware pre-contract editorial review provider.
 *
 * Calls the Anthropic Messages API with the actual manuscript content
 * (not only intake metadata) to produce a structured fit/imprint
 * assessment, using the same safe tool-forced pattern already
 * established for the Stage 0 Diagnostic Runner
 * (src/model/providers/anthropicProvider.js): tool_choice forces a
 * single structured tool call, so the model cannot return freeform
 * text. The raw HTTP response body is never stored — only the parsed
 * tool input is returned. The API key is read from the environment and
 * never logged or returned.
 *
 * The caller is responsible for clearing manuscript content immediately
 * after building the prompt body (see preContractEditorialReviewRunner.js)
 * — this module does not retain it after the request is sent.
 */

const REQUIRED_VARS = ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"];
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_API_VERSION = "2023-06-01";
const TEXT_FIELD_MAX_CHARS = 240;

// Imprint codes the model may select — mirrors the five named imprint
// candidates plus an explicit "cannot determine" outcome. The model
// never invents a code outside this set (enforced by the tool schema).
const IMPRINT_CODE = Object.freeze({
  J_MERRILL_PUBLISHING: "J_MERRILL_PUBLISHING",
  JM_WORKS: "JM_WORKS",
  JM_LITTLE: "JM_LITTLE",
  JM_VERSE: "JM_VERSE",
  SIGNATURE_CANDIDATE: "SIGNATURE_CANDIDATE",
  AMBIGUOUS: "AMBIGUOUS"
});

const FIT_DECISION = Object.freeze({
  GOOD_FIT: "GOOD_FIT",
  RISK_FLAGGED: "RISK_FLAGGED",
  NOT_A_FIT: "NOT_A_FIT",
  NEEDS_HUMAN_REVIEW: "NEEDS_HUMAN_REVIEW"
});

const IMPRINT_GUIDANCE = [
  "IMPRINT GUIDANCE (apply to the manuscript content you have just read, not genre labels alone):",
  "- J_MERRILL_PUBLISHING: flagship/faith imprint. Pastoral voice, personal testimony, spiritual formation, " +
    "church-oriented or ministry-aligned content.",
  "- JM_WORKS: general trade nonfiction — practical self-help, business, life skills, general-audience " +
    "nonfiction WITHOUT a primarily faith/pastoral frame.",
  "- JM_LITTLE: children's work.",
  "- JM_VERSE: poetry/verse.",
  "- SIGNATURE_CANDIDATE: elevated/literary/prestige title — requires human Publisher approval. Select this " +
    "code (not one of the four imprints above) whenever the work could plausibly warrant JM Signature; do " +
    "not also pick a regular imprint in that case.",
  "- AMBIGUOUS: select only if, after reading the actual manuscript content, you genuinely cannot determine " +
    "fit between J_MERRILL_PUBLISHING and JM_WORKS (or any other imprint). Do not select AMBIGUOUS merely " +
    "because the genre label is generic — read the content first."
].join("\n");

const REVIEW_TOOL = {
  name: "submit_precontract_editorial_review",
  description:
    "Submit the complete structured pre-contract editorial review result. You have been given the actual " +
    "manuscript text — base your fit and imprint assessment on its content, not only the genre label. " +
    "You MUST populate ALL SEVEN fields. ALL string fields must contain characterization only — no " +
    "manuscript excerpts, no quoted prose, no verbatim author text.",
  input_schema: {
    type: "object",
    properties: {
      jm1pub_editorialfitsummary: {
        type: "string",
        minLength: 1,
        maxLength: TEXT_FIELD_MAX_CHARS,
        description: "Concise characterization of manuscript fit only — one short sentence or compact phrase. " +
          `No quotation, no excerpt, no verbatim text. Under ${TEXT_FIELD_MAX_CHARS} characters.`
      },
      jm1pub_editorialriskflags: {
        type: "string",
        minLength: 1,
        maxLength: TEXT_FIELD_MAX_CHARS,
        description: "Short labels only, comma- or semicolon-separated (e.g. 'None identified' if no risk). " +
          `No prose paragraph, no quotation. Under ${TEXT_FIELD_MAX_CHARS} characters.`
      },
      jm1pub_recommendedimprintcode: {
        type: "string",
        enum: Object.values(IMPRINT_CODE),
        description: "The single best-fit imprint code based on actual manuscript content. See imprint guidance."
      },
      jm1pub_imprintconfidence: {
        type: "number",
        minimum: 0.0,
        maximum: 1.0,
        description: "Confidence in the imprint recommendation, 0.0-1.0."
      },
      jm1pub_fitdecision: {
        type: "string",
        enum: Object.values(FIT_DECISION),
        description: "Overall publishing fit decision for J Merrill Publishing based on manuscript content."
      },
      jm1pub_signaturecandidacy: {
        type: "boolean",
        description: "True if this title could plausibly warrant JM Signature and therefore needs human Publisher approval."
      },
      jm1pub_rightsdisclosureflag: {
        type: "boolean",
        description: "True if the manuscript content raises a rights, AI-disclosure, or content-risk issue requiring human review."
      },
      jm1pub_requireshumanreview: {
        type: "boolean",
        description: "True whenever signature candidacy, a rights/disclosure flag, low confidence, or a non-GOOD_FIT decision applies."
      }
    },
    required: [
      "jm1pub_editorialfitsummary",
      "jm1pub_editorialriskflags",
      "jm1pub_recommendedimprintcode",
      "jm1pub_imprintconfidence",
      "jm1pub_fitdecision",
      "jm1pub_signaturecandidacy",
      "jm1pub_rightsdisclosureflag",
      "jm1pub_requireshumanreview"
    ]
  }
};

const BREVITY_INSTRUCTIONS = [
  "TEXT FIELD BREVITY REQUIREMENTS:",
  "Every text field must be brief enough to pass the no-quotation validator.",
  "Do not write paragraph-style prose. Do not write long explanatory sentences.",
  `Keep each text field under ${TEXT_FIELD_MAX_CHARS} characters.`,
  "Do not include manuscript quotations, excerpts, or close paraphrase.",
  "Do not include prompt text or implementation details."
];

/**
 * Builds the prompt body sent to the model. Includes the actual
 * manuscript content (required for content-aware review) — the caller
 * must clear its own reference to manuscriptContent immediately after
 * this call returns; this function does not retain it.
 */
function buildEditorialReviewPrompt({ manuscriptContent, genreConfirmed, workTypeLabel }) {
  return [
    "You are performing a pre-contract editorial review for J Merrill Publishing.",
    `Genre metadata (context only, do not rely on this alone): ${genreConfirmed || "unset"}`,
    `Manuscript work type (context only): ${workTypeLabel || "unset"}`,
    "",
    IMPRINT_GUIDANCE,
    "",
    "---",
    "MANUSCRIPT (authorized pre-contract editorial review — real submission):",
    manuscriptContent || "",
    "---",
    "",
    "Call the submit_precontract_editorial_review tool with your complete assessment based on the manuscript content above.",
    "You MUST populate ALL SEVEN fields. Do not call the tool with any field missing.",
    "",
    ...BREVITY_INSTRUCTIONS,
    "",
    "ALL string fields: characterization only. No manuscript excerpts. No quoted prose. No verbatim author text."
  ].join("\n");
}

function checkConfig() {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  return missing.length === 0 ? null : missing;
}

function missingVarError(varName) {
  if (varName === "ANTHROPIC_API_KEY") return "ANTHROPIC_API_KEY_MISSING";
  if (varName === "ANTHROPIC_MODEL") return "ANTHROPIC_MODEL_MISSING";
  return `ANTHROPIC_CONFIG_MISSING_${varName}`;
}

async function call({ promptBody }) {
  const missingVars = checkConfig();
  if (missingVars) {
    const errorCodes = missingVars.map(missingVarError);
    return { ok: false, output: null, tokenCounts: { input: 0, output: 0, total: 0 }, httpStatus: null, error: errorCodes[0] };
  }

  const model = process.env.ANTHROPIC_MODEL;
  const apiVersion = process.env.ANTHROPIC_API_VERSION || DEFAULT_API_VERSION;

  const requestBody = {
    model,
    max_tokens: 4096,
    tools: [REVIEW_TOOL],
    tool_choice: { type: "tool", name: "submit_precontract_editorial_review" },
    messages: [{ role: "user", content: promptBody }]
  };

  let httpStatus = null;
  try {
    const response = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": apiVersion
      },
      body: JSON.stringify(requestBody)
    });

    httpStatus = response.status;
    const responseBody = await response.json();

    if (!response.ok) {
      return { ok: false, output: null, tokenCounts: { input: 0, output: 0, total: 0 }, httpStatus, error: `ANTHROPIC_HTTP_${httpStatus}` };
    }

    const usage = responseBody?.usage || {};
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    const toolBlock = Array.isArray(responseBody?.content)
      ? responseBody.content.find((b) => b.type === "tool_use" && b.name === "submit_precontract_editorial_review")
      : null;

    if (!toolBlock || !toolBlock.input) {
      return {
        ok: false,
        output: null,
        tokenCounts: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        httpStatus,
        error: "MODEL_RESPONSE_TOOL_NOT_CALLED"
      };
    }

    return {
      ok: true,
      output: toolBlock.input,
      tokenCounts: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      httpStatus,
      error: null
    };
  } catch (err) {
    return {
      ok: false,
      output: null,
      tokenCounts: { input: 0, output: 0, total: 0 },
      httpStatus,
      error: `MODEL_CALL_EXCEPTION: ${String(err.message || err).slice(0, 200)}`
    };
  }
}

module.exports = {
  call,
  checkConfig,
  buildEditorialReviewPrompt,
  REQUIRED_VARS,
  REVIEW_TOOL,
  IMPRINT_CODE,
  FIT_DECISION,
  TEXT_FIELD_MAX_CHARS,
  ANTHROPIC_ENDPOINT
};
