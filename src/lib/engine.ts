import { getPlayer, players } from "@/lib/data";
import { hasWord } from "@/lib/format";
import type { Answer, AskMode } from "@/lib/types";

const entities: { words: string[]; id: string }[] = [
  { words: ["root"], id: "joe-root" },
  { words: ["brook"], id: "harry-brook" },
  { words: ["bumrah"], id: "jasprit-bumrah" },
  { words: ["kohli"], id: "virat-kohli" },
  { words: ["stokes"], id: "ben-stokes" },
  { words: ["jadeja"], id: "ravindra-jadeja" },
  { words: ["head"], id: "travis-head" },
  { words: ["williamson"], id: "kane-williamson" },
  { words: ["smith"], id: "steve-smith" },
  { words: ["sangakkara", "sanga"], id: "kumar-sangakkara" },
  { words: ["potts"], id: "matthew-potts" },
  { words: ["kuldeep"], id: "kuldeep-yadav" },
];

function findEntities(query: string) {
  return entities
    .filter((entity) => entity.words.some((word) => hasWord(query, word)))
    .map((entity) => getPlayer(entity.id))
    .filter((player) => player !== undefined);
}

function follow(list: string[]): string[] {
  return list;
}

export function answerQuestion(raw: string, mode: AskMode, twinId: string): Answer {
  const query = raw.trim().toLowerCase();
  const named = findEntities(query);
  const twin = getPlayer(twinId) ?? players[0];

  if ((hasWord(query, "similar") || hasWord(query, "alike")) && named[0]) {
    return similarAnswer(named[0]);
  }

  if (hasWord(query, "bumrah") && (query.includes("1990") || query.includes("ninet") || query.includes("90s"))) {
    return {
      headline: "Bumrah in the 1990s is a brighter, shorter career",
      paragraphs: [
        "The action would have looked strange and it would have been legal. The yorker, bowled at a release speed that decade rarely saw, arrives before a batter's weight can get forward.",
        "Reverse swing was already the away weapon. Bumrah does not need the ball to be a scrap. He creates the angle with the wrist. Against thinner batting orders the model gives him a Test average of 16.4.",
        "A 1990s board bowls him into the ground. The peak ends around 2002. Brighter, and shorter, than the one he is in now.",
      ],
      figures: [
        { label: "Modelled average", value: "16.4" },
        { label: "Five-wicket hauls", value: "31" },
        { label: "Peak ended", value: "2002" },
      ],
      confidence: 64,
      followups: follow(["Is Bumrah in his peak now?", "What happens today if he does not bowl?"]),
      speaker: "Alternate history",
    };
  }

  if (hasWord(query, "brook") && (hasWord(query, "root") || hasWord(query, "surpass") || hasWord(query, "career") || hasWord(query, "predict") || hasWord(query, "forecast"))) {
    return {
      headline: "Brook can be great. Matching Root is a 38% outcome",
      paragraphs: [
        "Joe Root had 4,594 Test runs at the age Brook is now passing through in spirit, and Brook exceeds Root's runs-per-innings pace by 14%. The rate is not the argument. The argument is the innings he gives away.",
        "The model has an elite Test career at 92%, a World XI place at 65%, and 10,000 Test runs at 76%. England captain sits at 41%. Retirement, if the body follows the batting, is 2038. Expected peak age is 29.",
        "He is on his best ten-match run. He was also dismissed today by the kind of ball the file already worried about: spin, early in the plan, taken on. Surpassing Root means learning the ugly afternoon.",
      ],
      figures: [
        { label: "Elite Test batter", value: "92%" },
        { label: "Matches Root's weight", value: "38%" },
        { label: "10,000 Test runs", value: "76%" },
        { label: "England captain", value: "41%" },
      ],
      confidence: 71,
      followups: follow(["Who is most similar to Brook?", "How did Brook get out today?"]),
    };
  }

  if (hasWord(query, "jadeja") && (hasWord(query, "today") || hasWord(query, "important") || hasWord(query, "session") || mode === "general")) {
    return {
      headline: "Jadeja matters today as the over-bank, not the wicket",
      paragraphs: [
        "He has one wicket, Pope, and Root has since taken the stock ball away from him. While Brook was in, Jadeja went at 4.2 an over without looking like breaking the stand. Kuldeep did that.",
        "His importance is the overs he lets Bumrah not bowl. If the surface grips after tea he becomes a wicket bowler again. Until then he is control, and control is being scored off without risk.",
        "Fantasy still wants him. The match model does not have him as the bowler who wins the next hour.",
      ],
      figures: [
        { label: "Importance today", value: "78" },
        { label: "Spell rate", value: "4.2 / over" },
        { label: "Wickets", value: "1" },
      ],
      confidence: 77,
      followups: follow(["How is Root playing spin?", "Who wins the next hour?"]),
    };
  }

  if ((hasWord(query, "root") && hasWord(query, "kohli")) || (query.includes("age 25") && named.length >= 1)) {
    return {
      headline: "At 25 they were level on output and nothing alike",
      paragraphs: [
        "Root at 25 had 4,594 Test runs and a method that looked like it was trying not to be noticed. Kohli at 25 was already playing innings that felt like a decision. The averages sat in the same band. The shots did not.",
        "Root's twin, even then, was a control batter in the Sangakkara line. Kohli's was a chase batter. The model still separates them that way: Root 91% similar to Sangakkara, Kohli's chase pattern unchanged after 18 years.",
        "The useful comparison is not who was better at 25. It is that Brook is being asked to be both, and the model does not think that is how either career was built.",
      ],
      figures: [
        { label: "Root at 25", value: "4,594 runs" },
        { label: "Likeness now", value: "74%" },
        { label: "Closer historical twin", value: "Sangakkara" },
      ],
      confidence: 74,
      followups: follow(["Who is most similar to Joe Root?", "Explain Kohli's chases"]),
    };
  }

  if (hasWord(query, "bumrah") && (hasWord(query, "why") || hasWord(query, "effective") || hasWord(query, "peak") || hasWord(query, "fast"))) {
    return {
      headline: "Bumrah is in the peak window, and it is measurable",
      paragraphs: [
        "He is bowling at 146.2 kph, 9% faster than his career mean of 134.1. The Twin reads the spell as three moves: a ball at the hip, a ball at the top of off, and a yorker only after the batter's weight is back.",
        "He already has Crawley and Duckett. He has not bowled the session that decides the lead. That is why the what-if is so large. If he does not bowl again, India's win chance falls from 42% to 18%, and England's expected total rises by 61.",
        "Effectiveness is the release and the patience. He does not search for swing for six balls. He waits until the leave gets late.",
      ],
      figures: [
        { label: "Speed vs career", value: "+9%" },
        { label: "Wickets today", value: "2" },
        { label: "Win chance without him", value: "18%" },
      ],
      confidence: 86,
      followups: follow(["What if Bumrah is unavailable?", "How does he bowl to Root?"]),
    };
  }

  if (hasWord(query, "innings") && (hasWord(query, "best") || hasWord(query, "greatest") || query.includes("since 2000"))) {
    return {
      headline: "The innings since 2000 that the model keeps",
      paragraphs: [
        "It does not rank them by strike rate. It ranks them by how much they moved a match that was supposed to be settled, on a ground that was not helping the batter.",
        "Three stay at the top of the file. Lara's 153 in Bridgetown, because the target and the spell were both unreasonable. Stokes at Headingley in 2019, because the chase had no business being alive at tea. Kusal Perera in Durban the same year, for the same reason, with less support.",
        "Root's 89 today is not on that list. It is the kind of innings that makes those innings possible: a set batter taking a spinner out of the game so someone else can play the loud one.",
      ],
      figures: [
        { label: "Ranked by", value: "Match swing" },
        { label: "Not ranked by", value: "Strike rate" },
      ],
      confidence: 70,
      followups: follow(["How good is Root's 89?", "Where does Williamson's away record sit?"]),
    };
  }

  if (hasWord(query, "kohli") && (hasWord(query, "chase") || hasWord(query, "approach") || hasWord(query, "explain"))) {
    return twinAnswer(getPlayer("virat-kohli") ?? twin);
  }

  if (hasWord(query, "rain")) {
    return {
      headline: "Rain is no longer a footnote",
      paragraphs: [
        "Overnight the model had rain at 18% for the back end of this match. It is 34% now. If the last two sessions are lost, the draw becomes the leading outcome at 64%, with England 22% and India 14%.",
        "That saves India from having to bowl England out, and it saves England from batting last. It also freezes Root on 89, 73 short of 14,000.",
        "Until the covers come on, the session is still a bowling problem, not a weather problem.",
      ],
      figures: [
        { label: "Rain risk", value: "34%" },
        { label: "Draw if it arrives", value: "64%" },
        { label: "Was overnight", value: "18%" },
      ],
      confidence: 68,
      followups: follow(["Who wins if they play the full day?", "What does a full day look like?"]),
    };
  }

  if (hasWord(query, "win") || hasWord(query, "chance") || query.includes("who wins") || query.includes("full day")) {
    return {
      headline: "England 58, India 42, if they get the day",
      paragraphs: [
        "England are 245 for 4, 21 runs ahead of the phase model. The damage was done in overs 22 to 30: 72 runs against 48 expected. Root took spin out of the game. India's older-ball bowling did not pull it back.",
        "The next hour is not a coin toss. It is Bumrah against two set ideas, Root's leave and Stokes' first fifteen balls to Kuldeep. A wicket in that hour moves the model more than thirty quiet runs.",
        "If Bumrah does not bowl, this stops being a 58-42 match. India fall to 18%.",
      ],
      figures: [
        { label: "England", value: "58%" },
        { label: "India", value: "42%" },
        { label: "Ahead of model", value: "+21" },
      ],
      confidence: 73,
      followups: follow(["What if Bumrah is unavailable?", "How important is Jadeja today?"]),
    };
  }

  if (hasWord(query, "captain") || (mode === "fantasy" && (hasWord(query, "who") || query.includes("c ")))) {
    return {
      headline: "Captain Root. Confidence 93%",
      paragraphs: [
        "Brook's 64 is already in the book. There is no second innings in this round to hand him the armband for. Root is 89 not out and batting inside a match he is winning against the model.",
        "Bumrah is the ceiling captain at 66% if you think the second spell takes two more wickets. The workload file can cap that. Jadeja is 64% and has already been managed.",
        "Potts is not a captain. He is the differential: 4% owned, 61 expected points if he bowls on day three.",
      ],
      figures: [
        { label: "Root", value: "93%" },
        { label: "Bumrah", value: "66%" },
        { label: "Jadeja", value: "64%" },
      ],
      confidence: 93,
      followups: follow(["Why is Potts the differential?", "Does Woakes change the XI?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (hasWord(query, "potts") || hasWord(query, "differential")) {
    return {
      headline: "Potts is the differential because the room has left him",
      paragraphs: [
        "Ownership is 4%. Expected return, if England bat once and he bowls into day-three footmarks, is 61 points. Woakes is the name people still pick, and Woakes has a calf that should keep him out.",
        "He is not a wicket-this-over bowler. He hits a length until the batter invents a shot. On a wearing Lord's pitch that is a job.",
        "Bashir is the safe last slot in the AI XI. Potts is the braver one, and the braver one is ahead on the model.",
      ],
      figures: [
        { label: "Ownership", value: "4%" },
        { label: "Expected points", value: "61" },
        { label: "Woakes availability", value: "40%" },
      ],
      confidence: 80,
      followups: follow(["Who should captain?", "Is Bumrah still a must-start?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (hasWord(query, "head") && hasWord(query, "bumrah")) {
    return {
      headline: "Head's first fifteen balls against Bumrah are the hole",
      paragraphs: [
        "Eleven meetings, seven dismissals, a strike rate of 87. The slash is the same fourth ball it has always been, and Bumrah now waits for it rather than searching.",
        "Dismissal risk is up 48% inside those fifteen balls. After that the matchup becomes an ordinary left-hander against a great bowler, which is still hard, but it is not the spike.",
        "Head is not in this Test. The file is here because it is the cleanest rivalry the model holds.",
      ],
      figures: [
        { label: "Meetings", value: "11" },
        { label: "Dismissals", value: "7" },
        { label: "Strike rate", value: "87" },
        { label: "Risk in 15 balls", value: "+48%" },
      ],
      confidence: 88,
      followups: follow(["Who is similar to Head?", "Why is Bumrah so effective?"]),
    };
  }

  if (query.includes("22") || query.includes("turning") || query.includes("expectation") || query.includes("ahead")) {
    return {
      headline: "Overs 22 to 30 moved the match",
      paragraphs: [
        "England scored 72 in that phase against 48 expected. It is most of the +21 they carry into this session. Root batted through Jadeja. Brook scored quickly enough that India had to change the ball they were bowling.",
        "Before it, the innings was level with the model. After it, the death of the old ball belonged to the batters. Brook then edged Kuldeep, which stopped the stand and did not give the phase back.",
        "The next shift, if there is one, is a wicket in Bumrah's first four overs. Thirty quiet runs will not do it.",
      ],
      figures: [
        { label: "Phase runs", value: "72" },
        { label: "Expected", value: "48" },
        { label: "Match delta", value: "+21" },
      ],
      confidence: 84,
      followups: follow(["Who wins from here?", "How important is Jadeja today?"]),
    };
  }

  if (query.includes("14000") || query.includes("14,000") || query.includes("fourteen")) {
    return {
      headline: "73 runs away, and he is already set",
      paragraphs: [
        "Root is 13,927. The 14,000th run is 73 away, and he is 89 not out with Stokes for company. At this rate the milestone is a session, unless Bumrah finds the hip ball or the rain arrives.",
        "The model has the landmark at 96% across the series. Today, specifically, it is about whether he faces another 90 balls. The innings he is playing is exactly the one that usually gets them.",
      ],
      figures: [
        { label: "Runs now", value: "13,927" },
        { label: "Needed", value: "73" },
        { label: "Series chance", value: "96%" },
      ],
      confidence: 82,
      followups: follow(["Will he get there if it rains?", "Who is most similar to him?"]),
    };
  }

  if ((hasWord(query, "england") && (hasWord(query, "dna") || hasWord(query, "style") || query.includes("2005"))) || query.includes("2005")) {
    return {
      headline: "This England side resembles 2005 Australia more than it resembles its own past",
      paragraphs: [
        "Aggression 92, tempo 89, pressure 88, adaptability 85, spin resistance 81. The style flags are high risk, high tempo, attack first.",
        "The nearest historical side in the model is the 2005 Australia team, at 81% similarity. Same refusal to bat time for its own sake. A higher ceiling, and a messier floor when the new ball moves.",
        "Root is the brake they actually use. Without the 89, the DNA is just a fast score and a collapse.",
      ],
      figures: [
        { label: "2005 Australia", value: "81%" },
        { label: "Aggression", value: "92" },
        { label: "Tempo", value: "89" },
      ],
      confidence: 79,
      followups: follow(["Show me the team DNA", "How does Brook fit that style?"]),
    };
  }

  if (query.includes("lord") || (hasWord(query, "india") && (hasWord(query, "venue") || hasWord(query, "struggle") || hasWord(query, "ground")))) {
    return {
      headline: "Lord's asks India to be good before they are ready",
      paragraphs: [
        "The slope takes the ball across the right-hander. The first twenty overs reward a length. India's best cricket starts once the ball is older, and Lord's does not let the ball get old for free.",
        "They have solved other away grounds with one bowler. That is why this venue and Bumrah are the same conversation. Without him the win chance is 18%.",
      ],
      figures: [
        { label: "India win chance", value: "42%" },
        { label: "Without Bumrah", value: "18%" },
      ],
      confidence: 76,
      followups: follow(["Why is Bumrah so effective?", "What if it rains?"]),
    };
  }

  if (hasWord(query, "woakes") || hasWord(query, "injury")) {
    return {
      headline: "Woakes does not start",
      paragraphs: [
        "Calf tightness, availability 40%, workload already in the red. The AI XI has locked him out. The third seamer is Potts or Atkinson, and Potts is the one the room has not picked.",
        "Bumrah's issue is different. He plays, and the spell is capped. Stokes bowls in a burst. Neither of those is a absence. Woakes is an absence.",
      ],
      figures: [
        { label: "Woakes availability", value: "40%" },
        { label: "Replacement", value: "Potts" },
      ],
      confidence: 85,
      followups: follow(["Why is Potts the differential?", "Who should captain?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (mode === "twin") {
    return twinAnswer(named[0] ?? twin);
  }

  if (named.length === 1 && (hasWord(query, "how") || hasWord(query, "explain"))) {
    return twinAnswer(named[0]);
  }

  if (named.length === 1) {
    const player = named[0];
    return {
      headline: player.name,
      paragraphs: [player.blurb, player.formNote, player.report.development],
      figures: [
        { label: player.projection.headline, value: `${player.projection.elite}%` },
        { label: player.projection.landmark, value: `${player.projection.landmarkChance}%` },
        { label: "Peak age", value: String(player.projection.peakAge) },
      ],
      confidence: 75,
      followups: [
        `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`,
        `Project ${player.name.split(" ").slice(-1)[0]}'s career`,
      ],
      speaker: mode === "career" ? "Career forecast" : undefined,
    };
  }

  if (named.length >= 2) {
    return {
      headline: `${named[0].name} and ${named[1].name}`,
      paragraphs: [
        named[0].blurb,
        named[1].blurb,
        "Ask for the similarity, the matchup, or the chase if you want the model to pick a side.",
      ],
      followups: [
        `Who is more like ${named[0].name.split(" ").slice(-1)[0]}?`,
        `How do they match up?`,
      ],
    };
  }

  if (mode === "fantasy") {
    return {
      headline: "The XI is already leaning on Root and Bumrah",
      paragraphs: [
        "Captain Root at 93%. Bumrah remains a must-start even with a spell cap. Potts is the differential at 4% owned and 61 expected points. Woakes stays out.",
        "Ask a narrower question if you want one slot argued.",
      ],
      followups: follow(["Who should captain?", "Why is Potts the differential?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (mode === "historical") {
    return {
      headline: "Name a player, a year, or a what-if",
      paragraphs: [
        "The history file is strongest on Root and Sangakkara, Kohli at 25, the 2005 likeness, and Bumrah dropped into the 1990s.",
      ],
      followups: follow([
        "Compare Root and Kohli at age 25",
        "What if Bumrah played in the 1990s?",
        "Best Test innings since 2000",
      ]),
    };
  }

  return {
    headline: "Ask it about this match, or about a player",
    paragraphs: [
      "I can brief a player, a matchup, a chase, a captain, or a what-if. The ground today is England against India at Lord's, 245 for 4, England 58%.",
      "Try a name. Root, Brook, Bumrah, Jadeja, Kohli, and Head all have a file.",
    ],
    followups: follow([
      "Who is most similar to Joe Root?",
      "What if Bumrah played in the 1990s?",
      "Will Harry Brook surpass Root?",
      "How important is Jadeja today?",
    ]),
  };
}

function similarAnswer(player: NonNullable<ReturnType<typeof getPlayer>>): Answer {
  const lines = player.similar.map((item) => {
    const other = getPlayer(item.id);
    return `${other?.name ?? item.id} at ${item.score}%. ${item.note}`;
  });
  const top = player.similar[0];
  const topName = top ? getPlayer(top.id)?.name : "no twin";
  return {
    headline: `Nearest to ${player.name}: ${topName}`,
    paragraphs: lines.length ? lines : [player.blurb],
    figures: player.similar.slice(0, 3).map((item) => ({
      label: getPlayer(item.id)?.name ?? item.id,
      value: `${item.score}%`,
    })),
    confidence: top?.score,
    followups: [
      `Project ${player.name.split(" ").slice(-1)[0]}'s career`,
      "How does this side bat under pressure?",
    ],
  };
}

function twinAnswer(player: NonNullable<ReturnType<typeof getPlayer>>): Answer {
  return {
    headline: player.twinLines[0],
    paragraphs: player.twinLines.slice(1).length ? player.twinLines.slice(1) : [player.blurb],
    figures: [
      { label: "Years in the file", value: String(player.twinYears) },
      { label: "Peak age", value: String(player.projection.peakAge) },
    ],
    confidence: 80,
    followups: [
      `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`,
      "Will Harry Brook surpass Root?",
    ],
    speaker: `Cricket Twin · ${player.name}`,
  };
}
