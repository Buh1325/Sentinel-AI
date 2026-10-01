// services/news.ts
import { IncidentCategory, IncidentSeverity, NewsItem } from '../lib/types';
import { SACity, detectCityFromText, nearestSACity } from '../lib/saRegions';
import { classifyIncident } from './agent';

const NEWSDATA_KEY = process.env.EXPO_PUBLIC_NEWSDATA_API_KEY ?? '';
const NEWSAPI_KEY = process.env.EXPO_PUBLIC_NEWSAPI_KEY ?? '';

const CRIME_KEYWORDS = [
  'crime', 'police', 'saps', 'arrest', 'robbery', 'hijack', 'murder',
  'assault', 'shooting', 'kidnap', 'break-in', 'burglary', 'stabbing',
  'fraud', 'gang', 'cpf', 'court', 'prosecut', 'convicted', 'ipid',
];

function looksLikeCrime(text: string): boolean {
  const lower = text.toLowerCase();
  return CRIME_KEYWORDS.some((k) => lower.includes(k));
}

interface NewsDataArticle {
  article_id: string;
  title: string;
  description: string | null;
  link: string;
  source_name: string;
  pubDate: string;
  image_url: string | null;
}

async function fetchFromNewsData(city: SACity): Promise<NewsItem[]> {
  if (!NEWSDATA_KEY) return [];
  const query = encodeURIComponent(
    `${city.name} OR ${city.province} crime OR police OR hijack`
  );
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_KEY}&country=za&q=${query}&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsData ${res.status}`);
  const json = (await res.json()) as { results?: NewsDataArticle[] };
  const articles = json.results ?? [];
  return articles.map((a) => ({
    id: a.article_id,
    title: a.title,
    description: a.description ?? '',
    url: a.link,
    source: a.source_name,
    published_at: a.pubDate,
    image_url: a.image_url ?? undefined,
    city: city.name,
    province: city.province,
  }));
}

interface NewsApiArticle {
  source: { id: string | null; name: string };
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  urlToImage: string | null;
}

async function fetchFromNewsApi(city: SACity): Promise<NewsItem[]> {
  if (!NEWSAPI_KEY) return [];
  const q = encodeURIComponent(`${city.name} crime OR police OR hijacking`);
  const url = `https://newsapi.org/v2/everything?q=${q}&language=en&sortBy=publishedAt&pageSize=20`;
  const res = await fetch(url, { headers: { 'X-Api-Key': NEWSAPI_KEY } });
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const json = (await res.json()) as { articles?: NewsApiArticle[] };
  const articles = json.articles ?? [];
  return articles.map((a, i) => ({
    id: `newsapi-${i}-${a.publishedAt}`,
    title: a.title,
    description: a.description ?? '',
    url: a.url,
    source: a.source.name,
    published_at: a.publishedAt,
    image_url: a.urlToImage ?? undefined,
    city: city.name,
    province: city.province,
  }));
}

function fallbackMockNews(city: SACity): NewsItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'mock-1',
      title: `SAPS arrests three suspects after armed robbery in ${city.name}`,
      description:
        `Three suspects were arrested in ${city.name}, ${city.province}, following a coordinated response between SAPS and a local CPF. A firearm was recovered and the suspects will appear in the Magistrates' Court.`,
      url: 'https://www.saps.gov.za',
      source: 'Demo Feed',
      published_at: now,
      city: city.name,
      province: city.province,
    },
    {
      id: 'mock-2',
      title: `Community policing forum shares hijacking hotspot warning for ${city.province}`,
      description:
        `The CPF in ${city.name} has shared a warning about a rise in vehicle hijackings during evening peak hours. Residents are urged to vary routes and remain alert at intersections.`,
      url: 'https://www.saps.gov.za',
      source: 'Demo Feed',
      published_at: now,
      city: city.name,
      province: city.province,
    },
    {
      id: 'mock-3',
      title: `Break-in reported at business park in ${city.name}`,
      description:
        `SAPS in ${city.name} is investigating a break-in at a business park. No injuries were reported. Community members with information are asked to call 10111.`,
      url: 'https://www.saps.gov.za',
      source: 'Demo Feed',
      published_at: now,
      city: city.name,
      province: city.province,
    },
  ];
}

export interface FetchNewsOptions {
  latitude: number;
  longitude: number;
  useLiveApi?: boolean;
}

export async function fetchSACrimeNews(
  opts: FetchNewsOptions
): Promise<{ city: SACity; items: NewsItem[] }> {
  const city = nearestSACity(opts.latitude, opts.longitude);

  let raw: NewsItem[] = [];
  if (opts.useLiveApi !== false) {
    try {
      raw = await fetchFromNewsData(city);
    } catch (e) {
      console.warn('[news] NewsData failed', e);
    }
    if (raw.length === 0) {
      try {
        raw = await fetchFromNewsApi(city);
      } catch (e) {
        console.warn('[news] NewsAPI failed', e);
      }
    }
  }

  if (raw.length === 0) raw = fallbackMockNews(city);

  // Filter strictly for crime / public safety
  const filtered = raw.filter((n) =>
    looksLikeCrime(`${n.title} ${n.description}`)
  );

  // Enrich with AI categorization
  const enriched: NewsItem[] = [];
  for (const item of filtered.slice(0, 12)) {
    const classification = await classifyIncident(
      `${item.title}. ${item.description}`,
      { hintCity: city.name, hintProvince: city.province }
    );
    const detected = detectCityFromText(`${item.title} ${item.description}`);
    enriched.push({
      ...item,
      city: detected?.name ?? item.city ?? city.name,
      province: detected?.province ?? item.province ?? city.province,
      category: classification.category,
      severity: classification.severity,
      confidence: classification.confidence,
      extracted_location: classification.extracted_location,
      classifier_steps: classification.steps,
    });
  }

  return { city, items: enriched };
}