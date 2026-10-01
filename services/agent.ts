import { Incident, IncidentCategory, IncidentSeverity, ClassifierStep } from '../lib/types';
import { getLegalAdvice } from './legalAdvice';


const CATEGORY_RULES: Array<{ cat: IncidentCategory; keywords: string[] }> = [
  { cat: 'Hijacking', keywords: ['hijack', 'car jack', 'vehicle taken', 'gunpoint vehicle'] },
  { cat: 'Robbery', keywords: ['robbery', 'robbed', 'mugged', 'armed robbery', 'cash-in-transit', 'heist'] },
  { cat: 'Kidnapping', keywords: ['kidnap', 'abduct', 'missing person', 'trafficking'] },
  { cat: 'Break-In', keywords: ['break-in', 'break in', 'housebreak', 'burglary', 'intruder', 'trespass'] },
  { cat: 'Assault', keywords: ['assault', 'stab', 'stabbed', 'attack', 'beat', 'gbh', 'shooting', 'shot'] },
  { cat: 'Domestic Dispute', keywords: ['domestic', 'family violence', 'gbv', 'abuse at home'] },
  { cat: 'Suspicious activity', keywords: ['suspicious', 'loitering', 'scouting', 'casing', 'tailing'] },
];

const SEVERITY_KEYWORDS: Record<IncidentSeverity, string[]> = {
  critical: ['mass', 'multiple dead', 'children', 'school', 'bomb', 'terror', 'hostage', 'active shooter'],
  high: ['armed', 'gun', 'rifle', 'knife', 'wounded', 'injured', 'shot', 'stabbed', 'hijack', 'kidnap'],
  medium: ['robbery', 'break-in', 'burglary', 'assault', 'threat'],
  low: ['suspicious', 'loitering', 'warning', 'advisory', 'tip'],
};

export interface ClassificationResult {
  category: IncidentCategory;
  severity: IncidentSeverity;
  confidence: number;
  extracted_location?: string;
  steps: ClassifierStep[];
}

export async function classifyIncident(
  text: string,
  opts?: { hintCity?: string; hintProvince?: string }
): Promise<ClassificationResult> {
  const steps: ClassifierStep[] = [];
  const lower = text.toLowerCase();

  steps.push({
    step: 'Ingest',
    detail: `Received ${text.length} chars of raw text`,
    result: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
  });

  // 1. Category detection
  let category: IncidentCategory = 'Other';
  let catMatches: { cat: IncidentCategory; hits: number }[] = [];
  for (const rule of CATEGORY_RULES) {
    const hits = rule.keywords.filter((k) => lower.includes(k)).length;
    if (hits > 0) catMatches.push({ cat: rule.cat, hits });
  }
  catMatches.sort((a, b) => b.hits - a.hits);
  if (catMatches[0]) category = catMatches[0].cat;

  steps.push({
    step: 'Category classification',
    detail: catMatches.length
      ? `Matched keywords for ${catMatches.map((m) => `${m.cat}(${m.hits})`).join(', ')}`
      : 'No strong category keyword match — defaulted to Other',
    result: category,
  });

  // 2. Severity detection
  let severity: IncidentSeverity = 'low';
  const severityOrder: IncidentSeverity[] = ['critical', 'high', 'medium', 'low'];
  for (const level of severityOrder) {
    if (SEVERITY_KEYWORDS[level].some((k) => lower.includes(k))) {
      severity = level;
      break;
    }
  }
  steps.push({
    step: 'Severity estimation',
    detail: `Scanned for severity keywords across 4 levels`,
    result: severity,
  });

  // 3. Location extraction
  const locationMatch = text.match(
    /\b(?:in|near|at|around)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/
  );
  const extracted = locationMatch?.[1] ?? opts?.hintCity ?? opts?.hintProvince;
  steps.push({
    step: 'Location extraction',
    detail: extracted
      ? `Found location reference: "${extracted}"`
      : 'No explicit location found — using GPS hint if available',
    result: extracted ?? 'unknown',
  });

  // 4. Confidence
  let confidence = 0.4;
  if (category !== 'Other') confidence += 0.3;
  if (catMatches[0] && catMatches[0].hits >= 2) confidence += 0.15;
  if (severity !== 'low') confidence += 0.1;
  if (extracted) confidence += 0.05;
  confidence = Math.min(0.98, confidence);

  steps.push({
    step: 'Confidence scoring',
    detail: 'Category + severity + location signals combined',
    result: `${(confidence * 100).toFixed(0)}%`,
  });

  return {
    category,
    severity,
    confidence,
    extracted_location: extracted,
    steps,
  };
}


export interface AgentStep {
  tool: string;
  result: string;
}

export interface AgentResult {
  mode: 'ai' | 'on-device';
  text: string;
  steps: AgentStep[];
  note?: string;
}

export interface AgentTools {
  getLocation: () => Promise<{ latitude: number; longitude: number }>;
  getIncidents: () => Incident[];
  notify: (title: string, message: string) => void;
}

export async function runAgent(
  question: string,
  tools: AgentTools
): Promise<AgentResult> {
  const steps: AgentStep[] = [];

  let location: { latitude: number; longitude: number } | null = null;
  try {
    location = await tools.getLocation();
    steps.push({
      tool: 'getLocation',
      result: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
    });
  } catch (e) {
    steps.push({
      tool: 'getLocation',
      result: `unavailable (${e instanceof Error ? e.message : 'error'})`,
    });
  }

  const incidents = tools.getIncidents();
  steps.push({
    tool: 'getIncidents',
    result: `${incidents.length} loaded`,
  });

  // Find nearby incidents (2 km)
  let nearby: Incident[] = [];
  if (location) {
    nearby = incidents.filter((i) => {
      const dLat = (i.latitude - location!.latitude) * 111;
      const dLon =
        (i.longitude - location!.longitude) *
        111 *
        Math.cos((location!.latitude * Math.PI) / 180);
      return Math.sqrt(dLat * dLat + dLon * dLon) < 2;
    });
    steps.push({
      tool: 'filterNearby',
      result: `${nearby.length} within 2 km`,
    });
  }

  // Classify question for legal advice lookup
  const classification = await classifyIncident(question);
  const legal = getLegalAdvice(classification.category);
  steps.push({
    tool: 'classifyQuestion',
    result: `${classification.category} · ${classification.severity}`,
  });
  steps.push({
    tool: 'lookupLegalAdvice',
    result: legal.legislation_citation,
  });

  // Compose briefing
  const lines: string[] = [];
  lines.push(`Briefing for: “${question}”`);
  lines.push('');
  if (location) {
    lines.push(
      `Your position: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
    );
  }
  if (nearby.length) {
    lines.push('');
    lines.push(`Nearby reports (${nearby.length}):`);
    for (const i of nearby.slice(0, 4)) {
      lines.push(`• ${i.category} (${i.severity}) — ${i.description}`);
    }
  } else {
    lines.push('');
    lines.push('No corroborated reports within 2 km right now.');
  }

  lines.push('');
  lines.push(`Relevant law — ${legal.legislation_title}`);
  lines.push(`${legal.legislation_citation}`);
  lines.push(legal.summary);
  lines.push('');
  lines.push('Immediate steps:');
  for (const a of legal.immediate_actions) lines.push(`– ${a}`);
  if (legal.resolution_pattern) {
    lines.push('');
    lines.push('How similar cases have resolved:');
    lines.push(legal.resolution_pattern);
  }

  const text = lines.join('\n');
  tools.notify('Sentinel Agent briefing ready', `${classification.category} · ${classification.severity}`);

  return {
    mode: 'on-device',
    text,
    steps,
    note: 'Generated on-device using deterministic reasoning. Deploy the Edge Function with ANTHROPIC_API_KEY to use Claude for the wording step.',
  };
}