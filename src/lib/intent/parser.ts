export type IntentType =
  | "design"
  | "edit"
  | "integration"
  | "knowledge"
  | "unknown";

export interface ToolPlan {
  name: "searchFile" | "grepProject" | "readFile" | "none";
  params?: Record<string, string>;
}

export interface ParsedIntent {
  intentType: IntentType;
  confidence: number; // 0..1
  toolPlan: ToolPlan[];
  rationale: string;
}

const DESIGN_PATTERNS = [
  /\b(build|create|make|design)\b.*\b(landing|homepage|page|ui|component)\b/i,
  /\b(landing\s*page|hero|layout)\b/i,
];

const EDIT_PATTERNS = [
  /\b(fix|edit|update|modify|refactor|change|rename|rework)\b/i,
  /\b(header|footer|button|style|route|api|endpoint|page|component)\b/i,
];

const INTEGRATION_PATTERNS = [
  /\b(add|integrate|setup|enable|connect)\b.*\b(supabase|auth|database|db|storage|realtime)\b/i,
];

const KNOWLEDGE_PATTERNS = [
  /\b(How\s+does|Wie\s+funktioniert|Erkläre|Explain|What\s+is|Warum)\b/i,
  /\b(how|warum|wieso|why)\b\?*$/i,
];

function testAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function parseIntent(goalRaw: string): ParsedIntent {
  const goal = String(goalRaw || "").trim();
  if (!goal) {
    return {
      intentType: "unknown",
      confidence: 0.0,
      toolPlan: [{ name: "none" }],
      rationale: "Empty goal",
    };
  }

  // Order matters: pick first matched high-signal category
  if (testAny(goal, DESIGN_PATTERNS)) {
    return {
      intentType: "design",
      confidence: 0.8,
      toolPlan: [{ name: "searchFile", params: { query: "components|ui|page|layout" } }],
      rationale: "Design keywords detected (build/design page/ui).",
    };
  }

  if (testAny(goal, EDIT_PATTERNS)) {
    return {
      intentType: "edit",
      confidence: 0.85,
      toolPlan: [
        { name: "searchFile", params: { query: goal } },
        { name: "grepProject", params: { pattern: goal } },
      ],
      rationale: "Edit/fix/refactor intent detected.",
    };
  }

  if (testAny(goal, INTEGRATION_PATTERNS)) {
    return {
      intentType: "integration",
      confidence: 0.9,
      toolPlan: [{ name: "searchFile", params: { query: "supabase|auth|db|storage" } }],
      rationale: "Integration keywords (supabase/auth/db) detected.",
    };
  }

  if (testAny(goal, KNOWLEDGE_PATTERNS)) {
    return {
      intentType: "knowledge",
      confidence: 0.75,
      toolPlan: [{ name: "grepProject", params: { pattern: goal } }],
      rationale: "Question/knowledge phrasing detected.",
    };
  }

  // Fallback heuristic by length and conjunctions
  const long = goal.length > 200;
  const multi = /\b(and|sowie|sowohl|mehrere|multiple)\b/i.test(goal);
  if (long || multi) {
    return {
      intentType: "edit",
      confidence: 0.6,
      toolPlan: [
        { name: "searchFile", params: { query: goal.slice(0, 80) } },
        { name: "grepProject", params: { pattern: goal.slice(0, 120) } },
      ],
      rationale: "Long/multi-target request suggests repo scan.",
    };
  }

  return {
    intentType: "unknown",
    confidence: 0.3,
    toolPlan: [{ name: "searchFile", params: { query: goal.slice(0, 60) } }],
    rationale: "No strong signal; start with broad file search.",
  };
}


