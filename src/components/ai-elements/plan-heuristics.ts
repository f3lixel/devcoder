export type PlannedStep = { title: string };

export function detectComplexityAndSteps(goal: string): { isComplex: boolean; steps: PlannedStep[] } {
  try {
    const text = String(goal || '').trim();
    if (text.length === 0) return { isComplex: false, steps: [] };

    const long = text.length > 220;
    const hasKeywords = /\b(refactor|architecture|migrate|integrate|auth|deploy|database|schema|stream|queue|context)\b/i.test(text);
    const hasMultiTargets = /\b(and|sowie|sowohl|mehrere|multiple)\b/i.test(text);
    const isComplex = long || hasKeywords || hasMultiTargets;
    if (!isComplex) return { isComplex: false, steps: [] };

    const steps = [
      'Analyse & Anforderungen klären',
      'Dateien & Architektur prüfen',
      'Implementierung planen',
      'Code-Änderungen umsetzen',
      'Tests & Validierung',
    ].slice(0, 5).map((title) => ({ title }));

    return { isComplex: true, steps };
  } catch {
    return { isComplex: false, steps: [] };
  }
}







