import dotenv from 'dotenv';

dotenv.config();

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';

/**
 * Generates a simple hash from a string to use as a seed.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Normalizes text by removing accents/diacritics and converting to lowercase.
 * This is crucial for matching non-English/accented names (e.g. Vinícius Júnior -> vinicius junior).
 */
function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Validates if the Wikimedia page title actually contains words from the search query.
 * Helps prevent completely unrelated historical archive images from matching on weak/fuzzy queries.
 */
function isWikimediaTitleRelevant(
  pageTitle: string,
  query: string,
  category?: string,
  imageSearchSubject?: string
): boolean {
  const cleanTitle = normalizeText(pageTitle.replace(/^File:/i, '').replace(/[\-_]/g, ' '));
  const cleanQuery = normalizeText(query);
  const cleanSubject = imageSearchSubject ? normalizeText(imageSearchSubject) : '';
  
  // 1. If subject is provided and matches exactly, it's relevant!
  if (cleanSubject && cleanTitle.includes(cleanSubject)) {
    return true;
  }

  // 2. Extract words of the query
  const queryWords = cleanQuery.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return true;
  
  // Filter out common generic/filler nouns from the matching requirement
  const genericNouns = ['tracker', 'device', 'phone', 'car', 'laptop', 'tablet', 'logo', 'image', 'photo', 'picture', 'file', 'news'];
  const significantQueryWords = queryWords.filter(word => !genericNouns.includes(word));
  
  if (significantQueryWords.length === 0) return true;

  // 3. Health category scientific names bypasses (e.g. Aedes, aegypti, mosquito)
  if (category === 'Health') {
    const medicalVectors = ['aedes', 'aegypti', 'anopheles', 'mosquito', 'virus', 'dengue', 'malaria', 'cell', 'microscope', 'doctor', 'medical', 'hospital', 'vaccine'];
    if (medicalVectors.some(word => cleanTitle.includes(word))) {
      return true;
    }
  }

  // For multi-word queries, at least ONE significant word must be present in the filename
  const match = significantQueryWords.some(word => cleanTitle.includes(word));
  if (!match) {
    console.warn(`[ImageService] Rejecting Wikimedia image "${pageTitle}" for query "${query}" due to no query words matching.`);
    return false;
  }

  // Reject images that focus on distracting/specific sub-details not mentioned in the query
  const distractingSubjects = [
    'dog', 'cat', 'animal', 'soldier', 'police', 'military', 'army', 'navy', 'guard', 'security',
    'stamp', 'coin', 'envelope', 'signature', 'plaque', 'medal', 'tomb', 'grave', 'bust',
    'map', 'diagram', 'chart', 'graph', 'protest', 'protester', 'rally', 'march'
  ];
  
  const titleWords = cleanTitle.split(/\s+/);
  for (const word of distractingSubjects) {
    if (titleWords.includes(word) && !cleanQuery.includes(word)) {
      console.warn(`[ImageService] Rejecting Wikimedia image "${pageTitle}" for query "${query}" due to distracting subject word "${word}".`);
      return false;
    }
  }
  
  return true;
}

async function fetchWikimediaCandidates(
  query: string,
  allowSvg: boolean = false,
  category?: string,
  imageSearchSubject?: string
): Promise<{ url: string; title: string; source: 'wikimedia'; isHighlyRated: boolean }[]> {
  try {
    console.log(`[ImageService] Querying Wikimedia Commons for: "${query}" (allowSvg: ${allowSvg})`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&generator=search&iiprop=url|timestamp|extmetadata&iiextmetadatafilter=assessments&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=10&origin=*`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'IndiaReportNewsBot/1.0 (https://india-reports.com; contact@india-reports.com)'
      }
    });
    if (!res.ok) {
      console.warn(`[ImageService] Wikimedia Commons API returned status: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages) as any[];
      
      const candidates: {
        url: string;
        title: string;
        source: 'wikimedia';
        isHighlyRated: boolean;
      }[] = [];
      
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (allowSvg) {
        allowedExtensions.push('svg');
      }
      
      for (const page of pages) {
        if (!page.imageinfo || page.imageinfo.length === 0) continue;
        
        // Validate that the image title is relevant to our query
        if (page.title && !isWikimediaTitleRelevant(page.title, query, category, imageSearchSubject)) {
          continue;
        }
        
        const imgUrl = page.imageinfo[0].url;
        if (!imgUrl) continue;
        
        const extension = imgUrl.split('.').pop()?.toLowerCase();
        if (!extension || !allowedExtensions.includes(extension)) {
          continue;
        }
        
        // Check community ratings
        const assessmentsVal = page.imageinfo[0].extmetadata?.assessments?.value || '';
        const isHighlyRated = assessmentsVal.includes('featured') || 
                              assessmentsVal.includes('quality') || 
                              assessmentsVal.includes('valued') || 
                              assessmentsVal.includes('poty') || 
                              assessmentsVal.includes('potd');
                              
        candidates.push({
          url: imgUrl,
          title: page.title || '',
          source: 'wikimedia',
          isHighlyRated
        });
      }
      
      return candidates;
    }
  } catch (err: any) {
    console.error('[ImageService] Wikimedia Commons API error:', err.message);
  }
  return [];
}

async function fetchUnsplashCandidates(
  query: string
): Promise<{ url: string; title: string; source: 'unsplash' }[]> {
  if (!UNSPLASH_ACCESS_KEY || UNSPLASH_ACCESS_KEY === 'your_unsplash_key') {
    return [];
  }
  try {
    console.log(`[ImageService] Querying Unsplash for: "${query}"`);
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
    if (!res.ok) {
      console.warn(`[ImageService] Unsplash API returned status: ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.results) return [];
    
    return data.results.map((item: any) => {
      const title = [item.description, item.alt_description].filter(Boolean).join(' ');
      return {
        url: item.urls?.regular || '',
        title: title || query,
        source: 'unsplash' as const
      };
    }).filter((c: any) => c.url);
  } catch (err: any) {
    console.error(`[ImageService] Unsplash fetch failed for "${query}":`, err.message);
    return [];
  }
}

async function fetchOpenverseCandidates(
  query: string
): Promise<{ url: string; title: string; source: 'openverse' }[]> {
  try {
    console.log(`[ImageService] Querying Openverse for: "${query}"`);
    const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial&license=by,by-sa,cc0,pdm&aspect_ratio=wide&page_size=10`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'IndiaReportNewsBot/1.0 (https://india-reports.com; contact@india-reports.com)'
      }
    });
    if (!res.ok) {
      console.warn(`[ImageService] Openverse API returned status: ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((item: any) => {
      const tagText = (item.tags || []).map((t: any) => t.name).join(' ');
      const title = [item.title, item.creator, tagText].filter(Boolean).join(' ');
      return {
        url: item.url || '',
        title: title || query,
        source: 'openverse' as const
      };
    }).filter((c: any) => c.url);
  } catch (err: any) {
    console.error(`[ImageService] Openverse fetch failed for "${query}":`, err.message);
    return [];
  }
}

/**
 * Generates fallback/simplified queries if the original query is too specific.
 */
function getFallbackQueries(query: string): string[] {
  const fallbacks: string[] = [];
  const clean = query.trim();
  
  const actionWords = /\b(batting|wedding|tribute|review|launch|launching|performance|concert|speech|protest|hearing|controversy|match|game|playing|singing|meeting|talk|interview|press|conference|announcement|unveiling|celebration|funeral|visit|tour|arrival|departure|history|death|birth|update|news|analysis|report)\b/ig;
  const stripped = clean.replace(actionWords, '').trim().replace(/\s+/g, ' ');
  if (stripped && stripped.toLowerCase() !== clean.toLowerCase()) {
    fallbacks.push(stripped);
  }
  
  const words = clean.split(/\s+/);
  if (words.length > 2) {
    const firstTwo = words.slice(0, 2).join(' ');
    if (!fallbacks.includes(firstTwo)) {
      fallbacks.push(firstTwo);
    }
  }
  
  const splitAnd = clean.split(/\b(and|&)\b/i);
  if (splitAnd.length > 1) {
    const firstPart = splitAnd[0].trim();
    if (firstPart && !fallbacks.includes(firstPart)) {
      fallbacks.push(firstPart);
    }
  }

  return fallbacks;
}

function getGenericCategoryQuery(category: string, headline?: string): string {
  const cleanHeadline = headline ? normalizeText(headline) : '';
  
  if (category === 'Science') {
    const isSpace = /\b(space|telescope|galaxy|nebula|star|stars|moon|mars|jupiter|saturn|venus|orbit|nasa|esa|isro|astronomy|astrophysics|cosmic|universe|planet|planets|apollo)\b/i.test(cleanHeadline);
    if (isSpace) {
      return 'deep space nebula starry night galaxy telescope stars';
    }
    return 'scientific research laboratory glassware experiment microscope';
  }

  if (category === 'Tech') {
    const isSoftwareOrAI = /\b(ai|software|coding|developer|app|programming|code|algorithm|model|data|cyber|security|cloud|database|network)\b/i.test(cleanHeadline);
    if (isSoftwareOrAI) {
      return 'coding lines programming code computer screen workspace';
    }
    return 'modern corporate technology electronics circuit board hardware';
  }

  if (category === 'Sports') {
    if (cleanHeadline.includes('cricket')) {
      return 'cricket pitch bat ball stadium grass field';
    }
    if (cleanHeadline.includes('football') || cleanHeadline.includes('soccer') || cleanHeadline.includes('fifa')) {
      return 'football soccer pitch goal post stadium turf';
    }
    return 'empty professional stadium arena field track athletic';
  }

  if (category === 'Entertainment') {
    const isMusic = /\b(song|music|singer|concert|band|album|tour|live|show|theatre|stage|singer|performing)\b/i.test(cleanHeadline);
    if (isMusic) {
      return 'concert live stage colorful spot lights microphone band';
    }
    const isMovie = /\b(movie|film|cinema|actor|actress|box office|director|bollywood|hollywood)\b/i.test(cleanHeadline);
    if (isMovie) {
      return 'movie theater cinema screen red seats projector';
    }
    return 'modern art gallery museum paintings frame design exhibition';
  }

  const mapping: Record<string, string> = {
    Business: 'modern corporate office conference room professional meeting',
    Finance: 'stock market exchange trading floor financial charts display',
    Health: 'medical stethoscope doctor consulting room healthcare clinic',
    Politics: 'governmental parliament assembly hall empty podium flags',
    World: 'global news studio camera journalism editorial broadcast',
    India: 'historic monument architecture india new delhi street landmark',
  };
  
  return mapping[category] || 'newspaper editorial desk pen glasses cup coffee';
}

interface BrandFilter {
  negatives: string[];
  positives: string[];
}

const COMMON_NOUN_BRANDS: Record<string, BrandFilter> = {
  reliance: {
    negatives: ['self-reliance', 'child', 'girl', 'boy', 'parents', 'family', 'trust', 'friendship', 'faith', 'love', 'relationship', 'emotion'],
    positives: ['industry', 'telecom', 'jio', 'office', 'building', 'refinery', 'oil', 'logo', 'business', 'corporate', 'ambani', 'share', 'stock', 'retail', 'mukesh']
  },
  apple: {
    negatives: ['fruit', 'tree', 'orchard', 'pie', 'taste', 'juice', 'delicious', 'harvest', 'eating', 'red apple', 'green apple', 'ripe', 'apple juice', 'bitten apple'],
    positives: ['iphone', 'mac', 'macbook', 'ipad', 'steve jobs', 'tim cook', 'ios', 'macos', 'watch', 'computer', 'store', 'technology', 'silicon valley', 'logo', 'vision pro', 'developer']
  },
  valve: {
    negatives: ['sewing', 'plumbing', 'pipe', 'water', 'engine', 'cylinder', 'brass', 'metal', 'industrial valve', 'pressure', 'faucet', 'pump', 'tubing', 'fitting'],
    positives: ['steam', 'steamos', 'steam deck', 'game', 'gaming', 'videogame', 'software', 'hardware', 'console', 'gabe newell', 'logo', 'corporation', 'counter-strike', 'dota', 'half-life']
  },
  amazon: {
    negatives: ['rainforest', 'forest', 'river', 'jungle', 'indigenous', 'tribe', 'basin', 'nature', 'wildlife', 'brazil', 'peru', 'greenery', 'flora', 'fauna'],
    positives: ['delivery', 'box', 'warehouse', 'shipping', 'logo', 'prime', 'aws', 'cloud', 'bezos', 'office', 'employee', 'store', 'retail', 'package', 'kindle', 'alexa']
  },
  caterpillar: {
    negatives: ['insect', 'leaf', 'butterfly', 'cocoon', 'larva', 'bug', 'green caterpillar', 'plant', 'nature'],
    positives: ['machinery', 'construction', 'excavator', 'bulldozer', 'truck', 'yellow', 'heavy equipment', 'logo', 'cat', 'tractor', 'earthmoving']
  },
  shell: {
    negatives: ['sea', 'beach', 'sand', 'shellfish', 'mussel', 'clam', 'snail', 'turtle', 'crustacean', 'conch'],
    positives: ['gas station', 'oil', 'refinery', 'petrol', 'fuel', 'station', 'energy', 'logo', 'petroleum', 'royal dutch']
  },
  target: {
    negatives: ['arrow', 'archery', 'bullseye', 'dart', 'shooting', 'range', 'gun', 'weapon', 'bullet', 'firing'],
    positives: ['store', 'retail', 'shopping', 'supermarket', 'cart', 'logo', 'employee', 'aisle', 'shopping bag', 'red card']
  },
  meta: {
    negatives: ['meta-analysis', 'meta analysis', 'metadata', 'tag', 'seo'],
    positives: ['facebook', 'instagram', 'whatsapp', 'zuckerberg', 'social media', 'quest', 'vr', 'threads', 'headquarters', 'logo', 'menlo park']
  },
  alphabet: {
    negatives: ['letters', 'abc', 'child', 'spell', 'learning', 'classroom', 'school', 'font', 'typography'],
    positives: ['google', 'sundar pichai', 'calico', 'deepmind', 'waymo', 'tech', 'corporate', 'office', 'mountain view', 'logo']
  },
  jaguar: {
    negatives: ['animal', 'cat', 'wild', 'jungle', 'predator', 'panther', 'leopard', 'safari', 'nature', 'zoo'],
    positives: ['car', 'auto', 'vehicle', 'sedan', 'suv', 'roadster', 'f-type', 'e-type', 'land rover', 'logo', 'british car']
  },
  puma: {
    negatives: ['animal', 'cat', 'wild', 'cougar', 'mountain lion', 'nature', 'predator', 'zoo'],
    positives: ['shoe', 'sneaker', 'clothing', 'apparel', 'sportswear', 'brand', 'logo', 'fashion', 'athletic']
  },
  cocktail: {
    negatives: ['drink', 'beverage', 'glass', 'wine', 'beer', 'alcohol', 'bar', 'bartender', 'party', 'cocktail glass'],
    positives: ['movie', 'film', 'actor', 'actress', 'poster', 'cinema', 'saif ali khan', 'deepika', 'diana penty', 'bolly', 'bollywood', 'director']
  },
  animal: {
    negatives: ['dog', 'cat', 'zoo', 'wildlife', 'nature', 'safari', 'lion', 'tiger', 'elephant', 'predator', 'pet', 'deer', 'rabbit', 'horse', 'cow'],
    positives: ['movie', 'film', 'actor', 'actress', 'poster', 'cinema', 'ranbir kapoor', 'rashmika', 'bobby deol', 'anil kapoor', 'bollywood', 'director', 'sandeep reddy vanga']
  }
};

function isCandidateSubjectMatch(
  title: string,
  subject: string,
  category: string,
  headline?: string
): boolean {
  const cleanTitle = normalizeText(title);
  const cleanSubject = normalizeText(subject);

  if (!cleanSubject || cleanSubject.length < 2) return true;

  const subjectWords = cleanSubject.split(/\s+/).filter(w => w.length > 1);
  if (subjectWords.length === 0) return true;

  // ─── 1. HISTORICAL / DIAGRAM ARCHIVE FILTER ───────────────────────────────
  const HISTORICAL_ARCHIVE_TERMS = [
    'wellcome', 'babylonian', 'cuneiform', 'medieval', 'ancient', 'antique', 'engraving',
    'woodcut', 'hieroglyph', 'scroll', 'manuscript', 'sketches', 'museum', 'tomb', 'mummy'
  ];
  const cleanHeadline = headline ? normalizeText(headline) : '';
  const isHistoryQuery = /\b(ancient|medieval|history|historical|museum|tomb|wellcome|babylonian|archaeological|antique|mummy|egyptian|dynasty|roman|greecian|heritage|artifact)\b/i.test(cleanHeadline + ' ' + cleanSubject);

  const containsArchiveTerm = HISTORICAL_ARCHIVE_TERMS.some(term => cleanTitle.includes(term));
  if (containsArchiveTerm && !isHistoryQuery) {
    console.log(`[ImageService] Rejecting candidate "${title}" because it contains historical archive term but the article/subject is not historical.`);
    return false;
  }

  // ─── 2. COMMON BRAND NOUNS FILTER ─────────────────────────────────────────
  const entityName = subjectWords[0];
  if (entityName && COMMON_NOUN_BRANDS[entityName]) {
    const filter = COMMON_NOUN_BRANDS[entityName];
    // If it contains any negative words, reject!
    const matchedNegative = filter.negatives.find(word => cleanTitle.includes(word));
    if (matchedNegative) {
      console.log(`[ImageService] Rejecting brand candidate "${title}" because it contains negative word: "${matchedNegative}" for brand "${entityName}"`);
      return false;
    }
    // If category is a strict category, and it doesn't contain any positive/industry keywords, reject it.
    const strictCategories = ['Tech', 'Entertainment', 'Sports', 'Politics', 'Business', 'Finance'];
    if (strictCategories.includes(category)) {
      const hasPositive = filter.positives.some(word => cleanTitle.includes(word));
      if (!hasPositive) {
        console.log(`[ImageService] Rejecting brand candidate "${title}" because it does not contain any industry keywords for brand "${entityName}"`);
        return false;
      }
    }
  }

  // ─── 3. SCENERY / LANDSCAPE FILTER FOR NON-NATURE ARTICLES ─────────────────
  const strictCategoriesForScenery = ['Tech', 'Entertainment', 'Sports', 'Politics', 'Business', 'Finance'];
  if (strictCategoriesForScenery.includes(category)) {
    const SCENERY_NATURE_TERMS = [
      'sunset', 'sunrise', 'lake', 'river', 'sea', 'ocean', 'beach', 'mountain', 'forest', 'woods',
      'jungle', 'scenery', 'valley', 'waterfall', 'landscape', 'meadow', 'desert', 'island', 'cliffs',
      'stream', 'creek', 'hill', 'sky', 'sun', 'cloud', 'clouds', 'rain', 'rains', 'storm', 'weather'
    ];

    const containsSceneryTerm = SCENERY_NATURE_TERMS.some(term => {
      if (cleanTitle.includes(term)) {
        // If the candidate contains this scenery term, check if this specific term (or its plural)
        // is explicitly requested in the headline or subject.
        const isTermInQuery = new RegExp('\\b' + term + 's?\\b', 'i').test(cleanHeadline + ' ' + cleanSubject);
        if (!isTermInQuery) {
          // It contains a nature element that was NOT mentioned in the headline/subject!
          return true;
        }
      }
      return false;
    });

    if (containsSceneryTerm) {
      console.log(`[ImageService] Rejecting candidate "${title}" because it contains scenery/nature term but the article/subject is not nature-related.`);
      return false;
    }
  }

  // If the title contains the exact full subject phrase, it's a match
  if (cleanTitle.includes(cleanSubject)) return true;

  const strictCategories = ['Tech', 'Entertainment', 'Sports', 'Politics', 'Business', 'Finance'];
  if (strictCategories.includes(category)) {
    // For specific people or brand names, require the brand name or first name
    // (first word of subject) to match, which represents the entity.
    const nameToMatch = subjectWords[0];
    return cleanTitle.includes(nameToMatch);
  }

  if (category === 'Health') {
    // For health topics like "dengue", the image title must contain either the disease word,
    // or standard medical/health keywords.
    const hasSubject = subjectWords.some(word => cleanTitle.includes(word));
    if (hasSubject) return true;

    const healthWords = ['doctor', 'medical', 'hospital', 'science', 'clinic', 'vaccine', 'virus', 'mosquito', 'aedes', 'illness', 'treatment', 'health', 'patient'];
    return healthWords.some(word => cleanTitle.includes(word));
  }

  // For other general categories, any matching subject word is acceptable
  return subjectWords.some(word => cleanTitle.includes(word));
}

interface ScoredCandidate {
  url: string;
  title: string;
  source: 'wikimedia' | 'unsplash' | 'openverse';
  isHighlyRated?: boolean;
  queryUsed: string;
  score: number;
}

function scoreCandidate(
  candidate: { url: string; title: string; source: 'wikimedia' | 'unsplash' | 'openverse'; isHighlyRated?: boolean; queryUsed: string },
  keyword: string,
  headline?: string,
  category?: string
): number {
  let score = 0;
  const cleanTitle = normalizeText(candidate.title);
  const cleanKeyword = normalizeText(keyword);
  const cleanHeadline = headline ? normalizeText(headline) : '';
  const cleanQueryUsed = normalizeText(candidate.queryUsed);

  // Exact match of keyword in filename/description
  if (cleanTitle.includes(cleanKeyword)) {
    score += 50;
  }

  // Word-by-word keyword match
  const keywordWords = cleanKeyword.split(/\s+/).filter(w => w.length > 1);
  let keywordWordMatches = 0;
  for (const word of keywordWords) {
    if (cleanTitle.includes(word)) {
      keywordWordMatches++;
    }
  }
  if (keywordWords.length > 0) {
    score += (keywordWordMatches / keywordWords.length) * 30;
  }

  // Headline match (if headline is provided)
  if (cleanHeadline) {
    const headlineWords = cleanHeadline.split(/\s+/).filter(w => w.length > 2);
    let headlineWordMatches = 0;
    let countedHeadlineWords = 0;
    const stopWords = ['the', 'and', 'for', 'with', 'new', 'latest', 'india', 'reports', 'news'];
    for (const word of headlineWords) {
      if (stopWords.includes(word)) continue;
      countedHeadlineWords++;
      if (cleanTitle.includes(word)) {
        headlineWordMatches++;
      }
    }
    if (countedHeadlineWords > 0) {
      score += (headlineWordMatches / countedHeadlineWords) * 20;
    }
  }

  // Favor Wikimedia for specific topics (since Wikimedia has real/news images of entities)
  if (candidate.source === 'wikimedia') {
    score += 10;
    if (candidate.isHighlyRated) {
      score += 15; // Extra bonus for community-featured/high-quality images
    }
  } else if (candidate.source === 'openverse') {
    // Openverse (Flickr etc.) has great real-world photo coverage of events/people
    score += 8;
  } else {
    // Unsplash is also nice but stock-ish
    score += 5;
  }

  // Logo query penalty/bonus
  if (cleanQueryUsed.includes('logo')) {
    if (cleanTitle.includes('logo')) {
      score += 10; // Keep logos reasonably scored if specifically searched
    } else {
      score -= 10; // Penalize if logo search returned non-logos
    }
  }

  // Cross-category context filters
  if (category) {
    if (category !== 'Entertainment') {
      const musicEntertainmentTerms = ['band', 'music', 'album', 'song', 'concert', 'singer', 'actor', 'actress', 'stage', 'theatre', 'film', 'movie', 'cinema'];
      if (musicEntertainmentTerms.some(word => cleanTitle.includes(word))) {
        score -= 100;
      }
    }
    if (category !== 'Sports') {
      const sportsTerms = ['stadium', 'match', 'game', 'jersey', 'player', 'cricket', 'football', 'soccer', 'tennis', 'athletics', 'tournament', 'championship'];
      if (sportsTerms.some(word => cleanTitle.includes(word))) {
        score -= 100;
      }
    }
    if (category !== 'Politics') {
      const politicsTerms = ['protest', 'protester', 'rally', 'march', 'demonstration', 'strike'];
      if (politicsTerms.some(word => cleanTitle.includes(word))) {
        score -= 80;
      }
    }
  }

  // Penalty for general distracting words in news articles (unless explicitly requested in keyword/headline)
  const distractingSubjects = [
    'dog', 'cat', 'animal', 'soldier', 'police', 'military', 'army', 'navy', 'guard', 'security',
    'stamp', 'coin', 'envelope', 'signature', 'plaque', 'medal', 'tomb', 'grave', 'bust',
    'map', 'diagram', 'chart', 'graph'
  ];
  for (const word of distractingSubjects) {
    if (cleanTitle.includes(word) && !cleanKeyword.includes(word) && (!cleanHeadline || !cleanHeadline.includes(word))) {
      score -= 30;
    }
  }

  // Prefer landscape-oriented/higher quality URLs if we can determine them from Wikimedia (often File:Some_Description.jpg)
  // Penalize SVGs unless it's a logo query
  if (candidate.url.toLowerCase().endsWith('.svg') && !cleanQueryUsed.includes('logo')) {
    score -= 25;
  }

  return score;
}

export async function getCopyrightFreeImage(
  keyword: string,
  category: string,
  aiImagePrompt?: string,
  extraFallbacks?: string[],
  headline?: string,
  imageSearchSubject?: string
): Promise<{ imageUrl: string; imageUrls: string[] }> {
  const candidates: ScoredCandidate[] = [];
  const visitedUrls = new Set<string>();

  const addCandidates = (
    items: { url: string; title: string; source: 'wikimedia' | 'unsplash' | 'openverse'; isHighlyRated?: boolean }[],
    queryUsed: string,
    isLogoOrGenericQuery = false
  ) => {
    for (const item of items) {
      if (!visitedUrls.has(item.url)) {
        visitedUrls.add(item.url);

        // Subject match validation
        if (!isLogoOrGenericQuery && imageSearchSubject) {
          const isFallbackQuery = normalizeText(queryUsed) !== normalizeText(keyword);
          const subjectToCheck = isFallbackQuery ? queryUsed : imageSearchSubject;
          
          if (!isCandidateSubjectMatch(item.title, subjectToCheck, category, headline)) {
            console.log(`[ImageService] Rejecting candidate "${item.title}" because it does not match subject: "${subjectToCheck}"`);
            continue;
          }
        } else if (isLogoOrGenericQuery && queryUsed.includes('logo') && imageSearchSubject) {
          // For logo queries, ensure the brand name (first word of subject) is present
          const brandWord = imageSearchSubject.split(/\s+/)[0]?.toLowerCase();
          if (brandWord && !normalizeText(item.title).includes(brandWord)) {
            console.log(`[ImageService] Rejecting logo candidate "${item.title}" because it does not contain brand: "${brandWord}"`);
            continue;
          }
        }

        const score = scoreCandidate({ ...item, queryUsed }, keyword, headline, category);
        candidates.push({ ...item, queryUsed, score });
      }
    }
  };

  // Determine Brand from keyword (first word assumed to be the brand name)
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const brand = words[0] || '';

  console.log(`[ImageService] Starting image search for keyword: "${keyword}", brand: "${brand}", headline: "${headline}", subject: "${imageSearchSubject}"`);

  // ─── STEP 1: Strict keyword search (Wikimedia + Unsplash + Openverse) ──────────────
  if (keyword) {
    const wikiStrict = await fetchWikimediaCandidates(keyword, false, category, imageSearchSubject);
    addCandidates(wikiStrict, keyword);
    
    const unsplashStrict = await fetchUnsplashCandidates(keyword);
    addCandidates(unsplashStrict, keyword);

    const openverseStrict = await fetchOpenverseCandidates(keyword);
    addCandidates(openverseStrict, keyword);
  }

  // ─── STEP 2: Extra fallbacks (Wikimedia + Unsplash + Openverse) ────────────────────
  if (candidates.length < 5 && extraFallbacks && extraFallbacks.length > 0) {
    for (const fallback of extraFallbacks) {
      if (!fallback || !fallback.trim()) continue;
      const wikiFallback = await fetchWikimediaCandidates(fallback.trim(), false, category, imageSearchSubject);
      addCandidates(wikiFallback, fallback);
      
      const unsplashFallback = await fetchUnsplashCandidates(fallback.trim());
      addCandidates(unsplashFallback, fallback);

      const openverseFallback = await fetchOpenverseCandidates(fallback.trim());
      addCandidates(openverseFallback, fallback);
      
      if (candidates.length >= 8) break;
    }
  }

  // ─── STEP 3: Auto-simplified queries on Wikimedia + Openverse ──────────────────────
  if (candidates.length < 5 && keyword) {
    const autoFallbacks = getFallbackQueries(keyword);
    for (const fallback of autoFallbacks) {
      const wikiFallback = await fetchWikimediaCandidates(fallback, false, category, imageSearchSubject);
      addCandidates(wikiFallback, fallback);

      const openverseFallback = await fetchOpenverseCandidates(fallback);
      addCandidates(openverseFallback, fallback);
      
      if (candidates.length >= 8) break;
    }
  }

  // ─── STEP 4: Brand logo on Wikimedia ───────────────────────────────────────────────
  if (candidates.length < 3 && brand && brand.length > 2) {
    const logoQuery = `${brand} logo`;
    const wikiLogo = await fetchWikimediaCandidates(logoQuery, true); // No subject filter for logo search itself
    addCandidates(wikiLogo, logoQuery, true);
  }

  // ─── STEP 5: Generic Category stock photo fallback ────────────────────────────────
  if (candidates.length === 0) {
    const genericQuery = getGenericCategoryQuery(category, headline);
    console.log(`[ImageService] Falling back to generic category query: "${genericQuery}"`);
    
    const unsplashGeneric = await fetchUnsplashCandidates(genericQuery);
    addCandidates(unsplashGeneric, genericQuery, true);

    if (candidates.length === 0) {
      const wikiGeneric = await fetchWikimediaCandidates(genericQuery, false); // No subject filter for category fallback
      addCandidates(wikiGeneric, genericQuery, true);
    }
  }

  // Sort candidates by score in descending order
  candidates.sort((a, b) => b.score - a.score);

  const DEFAULT_PLACEHOLDERS = [
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80', // Newspaper close up
    'https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&w=800&q=80', // Newspaper pile
    'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80', // Laptop and coffee
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', // Tech fiber optics / globe
    'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=800&q=80', // Glass building skyline
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', // Tech matrix / code
    'https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?auto=format&fit=crop&w=800&q=80',  // Abstract blue background
  ];

  let selected = '';

  if (candidates.length > 0) {
    const highestScore = candidates[0].score;
    // Get all candidates close to the top score (within 5 points)
    const topCandidates = candidates.filter(c => (highestScore - c.score) <= 5);
    
    // Deterministic selection based on the hash of the keyword/headline
    const seed = hashCode(keyword + (headline || ''));
    const chosenIndex = seed % topCandidates.length;
    selected = topCandidates[chosenIndex].url;
  } else {
    // If no candidates found, select a deterministic fallback placeholder
    const seed = hashCode(keyword + (headline || ''));
    selected = DEFAULT_PLACEHOLDERS[seed % DEFAULT_PLACEHOLDERS.length];
  }

  const imageUrls = candidates.map(c => c.url);
  console.log(`[ImageService] Found ${candidates.length} candidates. Best score: ${candidates[0]?.score || 0}. Selected: ${selected}`);

  return {
    imageUrl: selected,
    imageUrls: imageUrls
  };
}
