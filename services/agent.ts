import { Incident, IncidentCategory, IncidentSeverity, ClassifierStep } from '../lib/types';
import { supabase } from '../lib/supabase';
import { getLegalAdvice } from './legalAdvice';

const CATEGORY_RULES: Array<{ cat: IncidentCategory; keywords: string[] }> = [
  { cat: 'Hijacking', keywords: ['hijack', 'car jack', 'carjacked', 'vehicle taken', 'gunpoint vehicle'] },
  { cat: 'Robbery', keywords: ['robbery', 'robbed', 'mugged', 'armed robbery', 'cash-in-transit', 'heist', 'snatched', 'stole my phone', 'took my wallet'] },
  { cat: 'Kidnapping', keywords: ['kidnap', 'abduct', 'missing person', 'trafficking', 'hostage'] },
  { cat: 'Break-In', keywords: ['break-in', 'break in', 'housebreak', 'burglary', 'intruder', 'trespass', 'forced the gate', 'broke the window'] },
  { cat: 'Assault', keywords: ['assault', 'stab', 'stabbed', 'attack', 'beat', 'beaten', 'gbh', 'shooting', 'shot', 'punched', 'kicked'] },
  { cat: 'Domestic Dispute', keywords: ['domestic', 'family violence', 'gbv', 'abuse at home', 'partner hit', 'husband hit', 'boyfriend hit', 'girlfriend hit'] },
  { cat: 'Suspicious activity', keywords: ['suspicious', 'loitering', 'scouting', 'casing', 'tailing', 'following me', 'watching houses'] },
];

/**
 * Semantic / colloquial patterns are a resilient on-device fallback for when the
 * cloud classifier is unavailable. They intentionally describe actions rather
 * than requiring the formal legal/crime word to appear in the report.
 */
const SEMANTIC_RULES: Array<{ cat: IncidentCategory; patterns: RegExp[]; explanation: string }> = [
  {
    cat: 'Kidnapping',
    explanation: 'A person appears to have been forced or taken away against their will.',
    patterns: [
      /(?:threw|dragged|shoved|bundled|forced|pushed|put)\s+(?:her|him|them|the\s+(?:girl|boy|child|person|woman|man))\s+(?:in|into)\s+(?:a|the)?\s*(?:car|vehicle|van|bakkie|boot)/i,
      /(?:forced|made)\s+(?:her|him|them|the\s+(?:girl|boy|child|person|woman|man))\s+(?:to\s+)?(?:get|climb)\s+(?:in|into)\s+(?:a|the)?\s*(?:car|vehicle|van|bakkie)/i,
      /(?:drove|sped|took)\s+(?:off|away)\s+with\s+(?:her|him|them|the\s+(?:girl|boy|child|person|woman|man))/i,
      /(?:grabbed|snatched|took)\s+(?:her|him|them|the\s+(?:girl|boy|child|person|woman|man)).{0,45}(?:car|vehicle|van|bakkie).{0,25}(?:drove|sped|left|away|off)/i,
      /(?:held|kept)\s+(?:her|him|them|the\s+(?:girl|boy|child|person|woman|man)).{0,35}(?:against\s+(?:her|his|their)\s+will|hostage|wouldn['’]?t\s+let.*leave)/i,
    ],
  },
  {
    cat: 'Hijacking',
    explanation: 'A vehicle appears to have been taken from an occupant by force or threat.',
    patterns: [
      /(?:pulled|dragged|forced|threw)\s+(?:me|us|him|her|them)\s+(?:out|from)\s+(?:of\s+)?(?:my|our|his|her|their|the)?\s*(?:car|vehicle|bakkie|taxi)/i,
      /(?:pointed|held).{0,20}(?:gun|knife).{0,45}(?:car|vehicle|keys)/i,
      /(?:took|drove\s+off\s+with|stole)\s+(?:my|our|his|her|their|the)\s+(?:car|vehicle|bakkie).{0,30}(?:while|after).{0,20}(?:inside|driving|pulled|forced)/i,
    ],
  },
  {
    cat: 'Robbery',
    explanation: 'Property appears to have been taken directly from a person by force, threat, or intimidation.',
    patterns: [
      /(?:cornered|surrounded|threatened|held\s+up|pointed\s+(?:a\s+)?(?:gun|knife)).{0,50}(?:took|grabbed|snatched|stole).{0,35}(?:phone|wallet|bag|cash|watch|belongings)/i,
      /(?:took|grabbed|snatched|stole)\s+(?:my|his|her|their|the)\s+(?:phone|wallet|bag|cash|watch).{0,40}(?:ran|fled|threat|knife|gun|force)/i,
      /(?:give|hand)\s+(?:me|us|him|her|them).{0,20}(?:phone|wallet|money|cash).{0,20}(?:gun|knife|or else|threat)/i,
    ],
  },
  {
    cat: 'Break-In',
    explanation: 'Someone appears to have forced entry into a home, business, or enclosed property.',
    patterns: [
      /(?:forced|broke|smashed|jumped|climbed).{0,25}(?:gate|door|window|fence).{0,45}(?:entered|inside|house|home|shop|office|property)/i,
      /(?:came|got|went)\s+inside.{0,35}(?:without\s+permission|through\s+(?:the\s+)?(?:window|door|gate))/i,
    ],
  },
  {
    cat: 'Domestic Dispute',
    explanation: 'Violence or abuse appears to involve a partner or family/home relationship.',
    patterns: [
      /(?:husband|wife|boyfriend|girlfriend|partner|father|mother|family\s+member).{0,35}(?:hit|beat|punched|kicked|threatened|attacked|hurt)/i,
      /(?:hit|beat|punched|kicked|threatened|attacked|hurt).{0,35}(?:husband|wife|boyfriend|girlfriend|partner|at\s+home)/i,
    ],
  },
  {
    cat: 'Assault',
    explanation: 'A person appears to have been physically attacked or intentionally injured.',
    patterns: [
      /(?:hit|beat|beaten|punched|kicked|stabbed|shot|attacked)\s+(?:me|him|her|them|the\s+(?:man|woman|boy|girl|person))/i,
      /(?:fight|fighting).{0,35}(?:injured|hurt|blood|weapon|knife|gun)/i,
    ],
  },
  {
    cat: 'Suspicious activity',
    explanation: 'The report describes concerning behaviour without a clearly completed offence.',
    patterns: [
      /(?:keeps?|kept)\s+(?:following|watching)\s+(?:me|us|the\s+house|the\s+car)/i,
      /(?:walking|driving)\s+(?:up\s+and\s+down|around).{0,30}(?:houses|cars|street|school)/i,
      /(?:checking|trying)\s+(?:car|house|gate|door)\s+(?:handles|locks)/i,
    ],
  },
];

const SEVERITY_KEYWORDS: Record<IncidentSeverity, string[]> = {
  critical: ['mass', 'multiple dead', 'children', 'school', 'bomb', 'terror', 'hostage', 'active shooter'],
  high: ['armed', 'gun', 'rifle', 'knife', 'wounded', 'injured', 'shot', 'stabbed', 'hijack', 'kidnap', 'forced into a car', 'threw her in the car', 'threw him in the car'],
  medium: ['robbery', 'break-in', 'burglary', 'assault', 'threat', 'mugged', 'snatched'],
  low: ['suspicious', 'loitering', 'warning', 'advisory', 'tip'],
};

const VALID_CATEGORIES: IncidentCategory[] = [
  'Robbery', 'Hijacking', 'Kidnapping', 'Suspicious activity', 'Assault', 'Domestic Dispute', 'Break-In', 'Other',
];
const VALID_SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

export interface ClassificationResult {
  category: IncidentCategory;
  severity: IncidentSeverity;
  confidence: number;
  extracted_location?: string;
  steps: ClassifierStep[];
  mode?: 'ai' | 'on-device';
  note?: string;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf('{');
  const end = fenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function classifyWithAI(
  text: string,
  opts?: { hintCity?: string; hintProvince?: string }
): Promise<ClassificationResult | null> {
  if (!supabase || !text.trim()) return null;

  const system = `You are Sentinel's South African incident classifier. Infer what happened from MEANING and CONTEXT, not only literal crime words. Understand informal English, South African colloquial phrasing, incomplete witness descriptions, slang, euphemisms, and pronouns. Never require the formal offence word to appear.

Examples:
- "they threw her in the car and drove off" => Kidnapping
- "some guys pulled me out my Polo and left with it" => Hijacking
- "they cornered him and took his phone and wallet" => Robbery
- "someone forced the gate and went into the house" => Break-In
- "her boyfriend hit her at home" => Domestic Dispute

Allowed categories EXACTLY: Robbery, Hijacking, Kidnapping, Suspicious activity, Assault, Domestic Dispute, Break-In, Other.
Allowed severity EXACTLY: low, medium, high, critical.
Do not invent a location. If no place is present, use the supplied location hint only if one exists.
Return JSON only with this schema:
{"category":"Kidnapping","severity":"high","confidence":0.94,"extracted_location":null,"semantic_reason":"Forced movement of a person into a vehicle and departure indicates an abduction even though the word kidnapping was not used."}`;

  try {
    const { data, error } = await supabase.functions.invoke('sentinel-agent', {
      body: {
        system,
        messages: [
          {
            role: 'user',
            content: `Incident text:\n${text}\n\nLocation hint: ${opts?.hintCity ?? 'none'}${opts?.hintProvince ? `, ${opts.hintProvince}` : ''}`,
          },
        ],
        tools: [],
      },
    });

    if (error || data?.error || !Array.isArray(data?.content)) return null;
    const responseText = data.content
      .filter((block: { type?: string; text?: string }) => block?.type === 'text' && typeof block.text === 'string')
      .map((block: { text: string }) => block.text)
      .join('\n');
    const parsed = extractJsonObject(responseText);
    if (!parsed) return null;

    const category = parsed.category;
    const severity = parsed.severity;
    const confidence = Number(parsed.confidence);
    if (!VALID_CATEGORIES.includes(category as IncidentCategory)) return null;
    if (!VALID_SEVERITIES.includes(severity as IncidentSeverity)) return null;
    if (!Number.isFinite(confidence)) return null;

    const extracted = typeof parsed.extracted_location === 'string' && parsed.extracted_location.trim()
      ? parsed.extracted_location.trim()
      : opts?.hintCity ?? opts?.hintProvince;
    const reason = typeof parsed.semantic_reason === 'string'
      ? parsed.semantic_reason
      : 'The model inferred the incident type from the described actions and context.';

    return {
      category: category as IncidentCategory,
      severity: severity as IncidentSeverity,
      confidence: Math.max(0, Math.min(0.99, confidence)),
      extracted_location: extracted,
      mode: 'ai',
      note: 'Classified by the Sentinel cloud AI using semantic context and colloquial-language understanding.',
      steps: [
        {
          step: 'AI semantic understanding',
          detail: 'Interpreted actions, context, informal wording and implied meaning instead of waiting for an exact crime keyword.',
          result: reason,
        },
        {
          step: 'Category classification',
          detail: 'Mapped the understood event to Sentinel’s supported incident categories.',
          result: category as string,
        },
        {
          step: 'Severity estimation',
          detail: 'Estimated seriousness from the described actions, weapons, injuries, coercion and vulnerability signals.',
          result: severity as string,
        },
        {
          step: 'Location extraction',
          detail: extracted ? 'Used an explicit place reference or the supplied area hint.' : 'No location was invented.',
          result: extracted ?? 'unknown',
        },
        {
          step: 'Confidence scoring',
          detail: 'Model confidence in the incident classification.',
          result: `${(Math.max(0, Math.min(0.99, confidence)) * 100).toFixed(0)}%`,
        },
      ],
    };
  } catch (error) {
    console.warn('[classifier] Cloud AI unavailable; using semantic on-device fallback.', error);
    return null;
  }
}

function classifyOnDevice(
  text: string,
  opts?: { hintCity?: string; hintProvince?: string }
): ClassificationResult {
  const steps: ClassifierStep[] = [];
  const lower = text.toLowerCase();

  steps.push({
    step: 'Ingest',
    detail: `Received ${text.length} chars of raw text`,
    result: text.slice(0, 80) + (text.length > 80 ? '…' : ''),
  });

  const semanticMatches = SEMANTIC_RULES
    .map((rule) => ({
      cat: rule.cat,
      explanation: rule.explanation,
      hits: rule.patterns.filter((pattern) => pattern.test(text)).length,
    }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  const keywordMatches = CATEGORY_RULES
    .map((rule) => ({ cat: rule.cat, hits: rule.keywords.filter((k) => lower.includes(k)).length }))
    .filter((item) => item.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  let category: IncidentCategory = 'Other';
  let semanticReason = '';
  if (semanticMatches[0]) {
    category = semanticMatches[0].cat;
    semanticReason = semanticMatches[0].explanation;
  } else if (keywordMatches[0]) {
    category = keywordMatches[0].cat;
  }

  steps.push({
    step: 'Semantic context',
    detail: semanticMatches.length
      ? 'Recognised an action pattern that implies an incident even without the formal crime word.'
      : 'No colloquial action-pattern match; falling back to lexical signals.',
    result: semanticReason || 'No semantic pattern match',
  });
  steps.push({
    step: 'Category classification',
    detail: keywordMatches.length
      ? `Also found lexical signals for ${keywordMatches.map((m) => `${m.cat}(${m.hits})`).join(', ')}`
      : 'Category inferred from semantic context or defaulted to Other.',
    result: category,
  });

  let severity: IncidentSeverity = 'low';
  if (category === 'Kidnapping' || category === 'Hijacking') severity = 'high';
  const severityOrder: IncidentSeverity[] = ['critical', 'high', 'medium', 'low'];
  for (const level of severityOrder) {
    if (SEVERITY_KEYWORDS[level].some((k) => lower.includes(k))) {
      severity = level;
      break;
    }
  }
  if (semanticMatches[0] && category === 'Kidnapping') severity = severity === 'critical' ? 'critical' : 'high';

  steps.push({
    step: 'Severity estimation',
    detail: 'Combined incident meaning with weapon, injury, coercion and vulnerability language.',
    result: severity,
  });

  const locationMatch = text.match(/\b(?:in|near|at|around)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
  const extracted = locationMatch?.[1] ?? opts?.hintCity ?? opts?.hintProvince;
  steps.push({
    step: 'Location extraction',
    detail: extracted ? `Found or received location reference: "${extracted}"` : 'No explicit location found.',
    result: extracted ?? 'unknown',
  });

  let confidence = 0.38;
  if (semanticMatches[0]) confidence += 0.43;
  else if (category !== 'Other') confidence += 0.30;
  if (keywordMatches[0] && keywordMatches[0].hits >= 2) confidence += 0.08;
  if (severity !== 'low') confidence += 0.06;
  if (extracted) confidence += 0.03;
  confidence = Math.min(0.96, confidence);

  steps.push({
    step: 'Confidence scoring',
    detail: 'Semantic + lexical + severity + location signals combined.',
    result: `${(confidence * 100).toFixed(0)}%`,
  });

  return {
    category,
    severity,
    confidence,
    extracted_location: extracted,
    steps,
    mode: 'on-device',
    note: 'Cloud AI was unavailable or not requested; Sentinel used its colloquial semantic fallback.',
  };
}

export async function classifyIncident(
  text: string,
  opts?: { hintCity?: string; hintProvince?: string; useAI?: boolean }
): Promise<ClassificationResult> {
  if (opts?.useAI) {
    const ai = await classifyWithAI(text, opts);
    if (ai) return ai;
  }
  return classifyOnDevice(text, opts);
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