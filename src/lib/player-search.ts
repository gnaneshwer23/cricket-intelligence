import type { Player, Role } from "@/lib/types";

/** Example queries shown in empty search states — not a dumped roster. */
export const PLAYER_SEARCH_EXAMPLES = [
  "Kohli",
  "Mandhana",
  "Babar",
  "Warner",
  "Bradman",
  "Perry",
  "Lara",
  "Bumrah",
] as const;

export const PLAYER_SEARCH_MIN_CHARS = 2;
export const PLAYER_SEARCH_DEBOUNCE_MS = 180;
export const PLAYER_SEARCH_LIMIT = 24;

/** Common aliases / nicknames → player id (case-insensitive match on the alias). */
export const playerAliases: Record<string, string[]> = {
  "don-bradman": ["bradman", "the don", "sir don"],
  "wg-grace": ["grace", "w.g.", "wg grace", "doctor grace"],
  "sachin-tendulkar": ["sachin", "little master", "tendulkar"],
  "virat-kohli": ["kohli", "king kohli", "cheeku"],
  "ms-dhoni": ["dhoni", "msd", "thala", "mahendra"],
  "brian-lara": ["lara", "prince of port of spain"],
  "shane-warne": ["warne", "warnie"],
  "muthiah-muralitharan": ["murali", "muralitharan", "muttiah"],
  "curtly-ambrose": ["ambrose", "curtly"],
  "viv-richards": ["viv", "king viv", "sir viv"],
  "garry-sobers": ["sobers", "sir garry", "garfield"],
  "richard-hadlee": ["hadlee", "sir richard"],
  "imran-khan": ["imran"],
  "kapil-dev": ["kapil"],
  "wasim-akram": ["wasim", "sultan of swing"],
  "waqar-younis": ["waqar"],
  "jacques-kallis": ["kallis"],
  "rahul-dravid": ["dravid", "the wall"],
  "sourav-ganguly": ["ganguly", "dada"],
  "anil-kumble": ["kumble", "jumbo"],
  "sunil-gavaskar": ["gavaskar", "sunny"],
  "adam-gilchrist": ["gilchrist", "gilly"],
  "ricky-ponting": ["ponting", "punter"],
  "glenn-mcgrath": ["mcgrath", "pong"],
  "dale-steyn": ["steyn"],
  "ab-de-villiers": ["abd", "mr 360", "de villiers"],
  "chris-gayle": ["gayle", "universe boss"],
  "jasprit-bumrah": ["bumrah"],
  "joe-root": ["root"],
  "ben-stokes": ["stokes"],
  "harry-brook": ["brook"],
  "steve-smith": ["smith", "steven smith"],
  "pat-cummins": ["cummins"],
  "mitchell-starc": ["starc"],
  "kane-williamson": ["williamson", "kane", "kw"],
  "babar-azam": ["babar"],
  "smriti-mandhana": ["mandhana", "smriti"],
  "harmanpreet-kaur": ["harmanpreet", "kaur"],
  "ellyse-perry": ["perry", "ellyse"],
  "alyssa-healy": ["healy", "alyssa"],
  "shai-hope": ["hope", "shai"],
  "rohit-sharma": ["rohit", "hitman"],
  "ravindra-jadeja": ["jadeja", "jaddu"],
  "kagiso-rabada": ["rabada", "kg"],
  "shaheen-afridi": ["shaheen", "afridi"],
  "shakib-al-hasan": ["shakib"],
  "rashid-khan": ["rashid"],
  "james-anderson": ["anderson", "jimmy"],
  "stuart-broad": ["broad"],
  "alastair-cook": ["cook", "chef"],
  "andrew-flintoff": ["flintoff", "freddie", "freddie flintoff"],
  "kevin-pietersen": ["pietersen", "kp"],
  "ian-botham": ["botham", "beefy"],
  "malcolm-marshall": ["marshall"],
  "michael-holding": ["holding", "whispering death"],
  "dennis-lillee": ["lillee"],
  "allan-border": ["border", "ab"],
  "steve-waugh": ["tugga"],
  "brendon-mccullum": ["mccullum", "baz"],
  "kumar-sangakkara": ["sangakkara", "sanga"],
  "mahela-jayawardene": ["mahela", "jayawardene"],
  "sanath-jayasuriya": ["jayasuriya", "sanna"],
  "yuvraj-singh": ["yuvraj", "yuvi"],
  "virender-sehwag": ["sehwag", "viru"],
  "vvs-laxman": ["laxman", "vvs"],
  "douglas-jardine": ["jardine"],
  "ranjitsinhji": ["ranji", "ranjitsinhji"],
  "victor-trumper": ["trumper"],
  "jack-hobbs": ["hobbs", "the master"],
  "len-hutton": ["hutton"],
  "frank-worrell": ["worrell"],
  "clive-lloyd": ["lloyd"],
  "gordon-greenidge": ["greenidge"],
  "desmond-haynes": ["haynes"],
  "courtney-walsh": ["walsh"],
  "andy-roberts": ["roberts"],
  "joel-garner": ["garner", "big bird"],
  "jeff-thomson": ["thomson", "thommo"],
  "rodney-marsh": ["marsh"],
  "richie-benaud": ["benaud"],
  "jim-laker": ["laker"],
  "harold-larwood": ["larwood"],
  "wally-hammond": ["hammond"],
  "denis-compton": ["compton"],
  "fred-trueman": ["trueman", "fiery fred"],
  "david-gower": ["gower"],
  "graham-gooch": ["gooch"],
  "mike-atherton": ["atherton", "athers"],
  "martin-crowe": ["crowe", "martin crowe"],
  "stephen-fleming": ["fleming"],
  "hashim-amla": ["amla"],
  "graeme-smith": ["graeme smith"],
  "younis-khan": ["younis"],
  "misbah-ul-haq": ["misbah"],
  "shoaib-akhtar": ["shoaib", "rawalpindi express"],
  "abdul-qadir": ["qadir"],
  "bs-bedi": ["bedi", "bishan"],
  "bs-chandrasekhar": ["chandra", "chandrasekhar"],
  "zaheer-khan": ["zaheer"],
  "harbhajan-singh": ["harbhajan", "bhajji"],
  "gautam-gambhir": ["gambhir"],
  "mitchell-johnson": ["johnson", "mitch johnson"],
  "matthew-hayden": ["hayden"],
  "justin-langer": ["langer"],
  "michael-clarke": ["clarke", "pup"],
  "brett-lee": ["brett lee"],
  "michael-hussey": ["hussey", "mr cricket"],
  "shivnarine-chanderpaul": ["chanderpaul", "shiv"],
  "aravinda-de-silva": ["aravinda"],
  "arjuna-ranatunga": ["ranatunga", "arjuna"],
  "javed-miandad": ["miandad", "javed"],
  "hanif-mohammad": ["hanif"],
  "fazal-mahmood": ["fazal"],
  "keith-miller": ["miller"],
  "ray-lindwall": ["lindwall"],
  "allan-donald": ["donald", "white lightning"],
  "shaun-pollock": ["pollock"],
  "andrew-strauss": ["strauss"],
  "michael-vaughan": ["vaughan"],
  "marcus-trescothick": ["trescothick", "tres"],
  "alec-stewart": ["stewart"],
  "darren-gough": ["gough"],
  "bob-willis": ["willis"],
  "colin-cowdrey": ["cowdrey"],
  "ted-dexter": ["dexter", "lord ted"],
  "rohan-kanhai": ["kanhai"],
  "clyde-walcott": ["walcott"],
  "everton-weekes": ["weekes"],
  "barry-richards": ["barry richards"],
  "graeme-pollock": ["graeme pollock"],
  "mike-procter": ["procter"],
  "ian-chappell": ["ian chappell"],
  "greg-chappell": ["greg chappell"],
  "mark-waugh": ["mark waugh", "junior"],
  "richie-richardson": ["richardson"],
  "ian-bishop": ["bishop"],
  "tamim-iqbal": ["tamim"],
  "mashrafe-mortaza": ["mashrafe", "mortaza"],
  "saeed-anwar": ["anwar"],
  "mohammad-yousuf": ["yousuf", "youhana"],
  "inzamam-ul-haq": ["inzamam", "inzi"],
  "daniel-vettori": ["vettori"],
  "ross-taylor": ["ross taylor"],
  "nathan-lyon": ["lyon", "goat"],
  "david-warner": ["warner", "teddy"],
  "travis-head": ["head"],
  "rishabh-pant": ["pant"],
  "shubman-gill": ["gill"],
  "hardik-pandya": ["pandya", "hardik"],
  "ravichandran-ashwin": ["ashwin"],
  "kl-rahul": ["rahul", "kl"],
  "quinton-de-kock": ["de kock", "quinny"],
  "faf-du-plessis": ["faf", "du plessis"],
  "andre-russell": ["russell", "dre russ"],
  "sunil-narine": ["narine"],
  "jos-buttler": ["buttler"],
};

export type PlayerSearchHit = {
  player: Player;
  score: number;
  matchedVia: "exact" | "alias" | "prefix" | "token" | "contains";
};

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s.'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return norm(value).split(" ").filter(Boolean);
}

function aliasIndex(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [id, aliases] of Object.entries(playerAliases)) {
    map.set(id, aliases.map(norm));
  }
  return map;
}

const ALIAS_BY_ID = aliasIndex();

/**
 * Ranked, case-insensitive player search.
 * Returns [] when the query is shorter than minChars (empty state — no roster dump).
 */
export function searchPlayers(
  catalog: Player[],
  rawQuery: string,
  options?: {
    role?: Role | "All";
    limit?: number;
    minChars?: number;
    /** Prefer these ids slightly (e.g. featured / followed). */
    boostIds?: string[];
  },
): PlayerSearchHit[] {
  const minChars = options?.minChars ?? PLAYER_SEARCH_MIN_CHARS;
  const limit = options?.limit ?? PLAYER_SEARCH_LIMIT;
  const role = options?.role ?? "All";
  const needle = norm(rawQuery);
  if (needle.length < minChars) return [];

  const needleTokens = tokens(needle);
  const boost = new Set(options?.boostIds ?? []);
  const hits: PlayerSearchHit[] = [];

  for (const player of catalog) {
    if (role !== "All" && player.role !== role) continue;

    const name = norm(player.name);
    const nameTokens = tokens(player.name);
    const last = nameTokens[nameTokens.length - 1] ?? "";
    const first = nameTokens[0] ?? "";
    const aliases = ALIAS_BY_ID.get(player.id) ?? [];
    const aliasTokens = aliases.flatMap((alias) => tokens(alias));
    const allTokens = [...nameTokens, ...aliasTokens];

    let score = 0;
    let matchedVia: PlayerSearchHit["matchedVia"] = "contains";

    if (name === needle || aliases.includes(needle)) {
      score = 100;
      matchedVia = name === needle ? "exact" : "alias";
    } else if (aliasTokens.includes(needle)) {
      // Alias word equality only — avoid "warne" ⊆ "warner"
      score = 92;
      matchedVia = "alias";
    } else if (last === needle || first === needle || nameTokens.includes(needle)) {
      score = 88;
      matchedVia = "token";
    } else if (name.startsWith(needle) || last.startsWith(needle) || first.startsWith(needle)) {
      score = 80;
      matchedVia = "prefix";
    } else if (nameTokens.some((token) => token.startsWith(needle) && needle.length >= 3)) {
      score = 74;
      matchedVia = "prefix";
    } else if (
      needleTokens.length > 1 &&
      needleTokens.every((token) => allTokens.some((t) => t === token || t.startsWith(token)))
    ) {
      score = 70;
      matchedVia = "token";
    } else {
      continue;
    }

    if (boost.has(player.id)) score += 6;
    // Slight preference for richer demo DNA subjects (longer form notes / twin years heuristic)
    if (!player.formNote.includes("stub") && !player.formNote.includes("Lighter")) score += 2;

    hits.push({ player, score, matchedVia });
  }

  hits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.player.name.localeCompare(b.player.name);
  });

  // If the query is an exact alias/name for someone, drop weaker prefix collisions
  // (e.g. "warne" must not surface Warner ahead of / beside Warne).
  const strong = hits.filter((hit) => hit.matchedVia === "exact" || hit.matchedVia === "alias");
  const resolved =
    strong.length > 0
      ? hits.filter(
          (hit) =>
            hit.matchedVia === "exact" ||
            hit.matchedVia === "alias" ||
            hit.matchedVia === "token" ||
            hit.score >= 88,
        )
      : hits;

  return resolved.slice(0, limit);
}

export function searchPlayerList(
  catalog: Player[],
  rawQuery: string,
  options?: Parameters<typeof searchPlayers>[2],
): Player[] {
  return searchPlayers(catalog, rawQuery, options).map((hit) => hit.player);
}
