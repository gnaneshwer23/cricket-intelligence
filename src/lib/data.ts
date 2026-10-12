import type { MoodKey, Player, Team } from "@/lib/types";

export const dnaLabels: { key: keyof Player["dna"]; label: string }[] = [
  { key: "technical", label: "Technical skill" },
  { key: "consistency", label: "Consistency" },
  { key: "spin", label: "Spin ability" },
  { key: "pace", label: "Pace game" },
  { key: "mental", label: "Mental strength" },
  { key: "leadership", label: "Leadership" },
  { key: "adaptability", label: "Adaptability" },
];

export const players: Player[] = [
  {
    id: "joe-root",
    name: "Joe Root",
    teamId: "england",
    role: "Batter",
    style: "Right-hand bat · occasional off spin",
    age: 35,
    span: "2012 –",
    form: [14, 103, 5, 76, 22, 143, 8, 89],
    formLabel: "Last eight Test scores",
    formNote: "89 not out at Lord's. Needs 73 to reach 14,000 Test runs.",
    dna: { technical: 95, consistency: 97, spin: 94, pace: 91, mental: 92, leadership: 88, adaptability: 96 },
    traits: [
      { label: "Technical", level: 96, note: "Late hands, late leave, almost no wasted motion." },
      { label: "Patient", level: 94, note: "Builds the day before he spends it." },
      { label: "Calm", level: 91, note: "The dressing room's pulse stays level when he is set." },
      { label: "Calculated", level: 88, note: "Risk arrives only when the field invents a pocket." },
    ],
    similar: [
      { id: "kumar-sangakkara", score: 91, note: "Same late-career accumulation, same refusal to give a session away." },
      { id: "kane-williamson", score: 86, note: "Nearest active twin: control first, damage second, almost no false theatre." },
      { id: "steve-smith", score: 83, note: "Different method, same problem for bowlers who need a mistake before lunch." },
    ],
    projection: {
      headline: "All-time England batter",
      elite: 97,
      captain: 88,
      worldXI: 91,
      landmark: "14,000 Test runs",
      landmarkChance: 96,
      retire: "2028",
      peakAge: 32,
    },
    report: {
      strengths: [
        "Neutralises a plan before it becomes a spell",
        "Elite against spin once he has seen twelve balls",
        "Turns a good hour into a match-defining day",
      ],
      weaknesses: [
        "Can gift the new ball a wicket when he searches for a release shot",
        "Scoring rate drops if both ends are squeezed for a full session",
      ],
      development: "The peak has already happened. What is left is accumulation, and the model still has him as the safest batter in the XI.",
    },
    milestones: [
      { label: "Test runs", current: 13927, target: 14000 },
      { label: "Test centuries", current: 36, target: 40 },
      { label: "Lord's hundreds", current: 5, target: 6 },
    ],
    twinYears: 14,
    twinLines: [
      "Root's innings split in two. Before 20 he is feeling for the ball that leaves him. After 20 the leave gets later and the clip through midwicket becomes the default.",
      "Against spin he refuses the big sweep until the bowler has bowled two loose balls in an over. That patience is why Jadeja's morning spell did not turn into wickets.",
    ],
    blurb: "England's control batter. The innings is built from leave, clip, and an occasional late cut that looks riskier than it is.",
    away: "His best away cricket is an exercise in taking the first hour out of the bowler's hands, then scoring in the third.",
    chases: "In a chase he keeps the required rate boring until it isn't. Singles first, boundary only when the field gives him a pocket.",
    opponents: "Bumrah is the historical problem. Jadeja has been managed today. Broad's old new-ball partners never were.",
  },
  {
    id: "harry-brook",
    name: "Harry Brook",
    teamId: "england",
    role: "Batter",
    style: "Right-hand bat",
    age: 27,
    span: "2022 –",
    form: [42, 87, 12, 158, 34, 91, 6, 64],
    formLabel: "Last eight Test scores",
    formNote: "Best ten-match stretch of his career. Today's 64 ended to Kuldeep, caught at the keeper.",
    dna: { technical: 84, consistency: 78, spin: 72, pace: 96, mental: 86, leadership: 74, adaptability: 88 },
    traits: [
      { label: "Aggressive", level: 93, note: "Tries to end a spell before the plan settles." },
      { label: "Explosive", level: 90, note: "Best stretch of his career is also the loudest." },
      { label: "Creative", level: 82, note: "Inventive off the back foot against pace." },
      { label: "Relentless", level: 78, note: "Keeps scoring until the wrist spinner finds him early." },
    ],
    similar: [
      { id: "travis-head", score: 84, note: "Same instinct to hit the bowler off his length before the plan settles." },
      { id: "joe-root", score: 71, note: "The comparison everyone wants. The methods barely overlap." },
      { id: "virat-kohli", score: 68, note: "Shared appetite for the innings that hurts, not the innings that lasts." },
    ],
    projection: {
      headline: "Elite Test batter",
      elite: 92,
      captain: 41,
      worldXI: 65,
      landmark: "10,000 Test runs",
      landmarkChance: 76,
      retire: "2038",
      peakAge: 29,
    },
    report: {
      strengths: [
        "Excellent against pace",
        "Strong off the back foot",
        "Elite scoring rate once he is in",
      ],
      weaknesses: [
        "Early vulnerability to spin, especially the ball that hurries on",
        "Aggressive risk profile in the first fifteen balls of a spell",
      ],
      development: "Expected peak age: 29. The next two years decide whether the hundreds pile up or the dismissals stay loud.",
    },
    milestones: [
      { label: "Test runs", current: 3184, target: 10000 },
      { label: "Test centuries", current: 9, target: 20 },
      { label: "Series defining inns", current: 4, target: 8 },
    ],
    twinYears: 4,
    twinLines: [
      "Brook plays the bowler, not the score. If the ball is short he is already back in the crease, even in the first over of a spell.",
      "Spin is the gap. He attacks the length ball before he has a measure of the turn, which is how Kuldeep got him today.",
    ],
    blurb: "England's tempo. The model has him on the best ten-match run of his career, and still flags the early ball from a wrist spinner.",
    away: "Away from home the back-foot game travels. The front-foot drive against swing does not, yet.",
    chases: "He wants the chase finished early. That wins sessions and occasionally loses matches.",
    opponents: "Pace suits him. Kuldeep and Jadeja are the file the bowlers will keep opening.",
  },
  {
    id: "jasprit-bumrah",
    name: "Jasprit Bumrah",
    teamId: "india",
    role: "Bowler",
    style: "Right-arm fast",
    age: 32,
    span: "2018 –",
    form: [4, 2, 1, 5, 3, 6, 2, 2],
    formLabel: "Wickets in last eight inns",
    formNote: "Release speed this series is 9% above his career mean: 146.2 kph versus 134.1.",
    dna: { technical: 98, consistency: 86, spin: 40, pace: 99, mental: 94, leadership: 82, adaptability: 90 },
    traits: [
      { label: "Relentless", level: 97, note: "One plan, three balls, no panic search for swing." },
      { label: "Calculated", level: 94, note: "Yorker is a close, not a habit." },
      { label: "Aggressive", level: 88, note: "Changes the win model by deciding to bowl." },
      { label: "Technical", level: 98, note: "Release and wrist do the work the seam used to." },
    ],
    similar: [
      { id: "ben-stokes", score: 42, note: "Not a bowling twin. The link is the match that bends when he decides to bowl." },
      { id: "travis-head", score: 38, note: "A rivalry, not a likeness. Head's first fifteen balls against him are a known failure mode." },
    ],
    projection: {
      headline: "Peak fast bowler",
      elite: 96,
      captain: 22,
      worldXI: 94,
      landmark: "250 Test wickets",
      landmarkChance: 71,
      retire: "2031",
      peakAge: 32,
    },
    report: {
      strengths: [
        "Yorkers and hard lengths from the same run-up",
        "Wicket-taking with the older ball, which is rare",
        "Changes the win model by himself",
      ],
      weaknesses: [
        "Workload spikes are the real opponent",
        "If the spell is capped, India's control percentage falls off a cliff",
      ],
      development: "This is the peak window. The 9% speed jump is a peak signal, not a new baseline the body will hold for five years.",
    },
    milestones: [
      { label: "Test wickets", current: 219, target: 250 },
      { label: "Five-wicket hauls", current: 14, target: 18 },
      { label: "Player of the series", current: 5, target: 7 },
    ],
    twinYears: 8,
    twinLines: [
      "Bumrah does not search for swing for six balls. He bowls one ball at the hip, one at the top of off, and waits for the batter to stop trusting his leave.",
      "The yorker is a closing move, not a habit. He uses it once the batter's weight is back.",
    ],
    blurb: "India's match-winner. Two wickets already today, and the win model moves 24 points if he does not bowl this session.",
    away: "Away from home the harder length replaces the swinging length. The wickets do not fall away with it.",
    chases: "Defending a total, he bowls at the stumps and lets the required rate create the mistake.",
    opponents: "Left-handers who slash early. Head is the exhibit: dismissal risk up 48% inside fifteen balls.",
  },
  {
    id: "virat-kohli",
    name: "Virat Kohli",
    teamId: "india",
    role: "Batter",
    style: "Right-hand bat",
    age: 37,
    span: "2011 –",
    form: [4, 52, 11, 86, 0, 70, 33, 18],
    formLabel: "Last eight Test scores",
    formNote: "Yet to bat at Lord's. The chase file is still the one opponents prepare for.",
    dna: { technical: 90, consistency: 88, spin: 86, pace: 93, mental: 95, leadership: 91, adaptability: 84 },
    traits: [
      { label: "Aggressive", level: 90, note: "Chase cricket still feels like a decision." },
      { label: "Relentless", level: 95, note: "Eighteen years, same rotation pattern until over 35." },
      { label: "Technical", level: 88, note: "Cover drive remains a run once he is set." },
      { label: "Explosive", level: 84, note: "Boundaries are a release after the singles do the work." },
    ],
    similar: [
      { id: "steve-smith", score: 80, note: "Two batters who made the 2010s feel smaller than they were." },
      { id: "kane-williamson", score: 77, note: "Less alike in method than in the way a dressing room settles around them." },
      { id: "joe-root", score: 74, note: "At 25 they were level on output and nothing like each other in style." },
    ],
    projection: {
      headline: "Late-career closer",
      elite: 90,
      captain: 70,
      worldXI: 78,
      landmark: "10,000 Test runs",
      landmarkChance: 84,
      retire: "2028",
      peakAge: 30,
    },
    report: {
      strengths: [
        "Chase patterns are still the cleanest in the game",
        "Cover drive remains a run, not a risk, once he is set",
        "Pulls the short ball on middle better than the field expects",
      ],
      weaknesses: [
        "The ball leaving him early in an innings is still the dismissal",
        "Spin that hurries on can trap him if he is predetermined to work the leg side",
      ],
      development: "Peak age has passed. The value now is the chase and the innings that closes a side down.",
    },
    milestones: [
      { label: "Test runs", current: 9230, target: 10000 },
      { label: "Test centuries", current: 30, target: 32 },
      { label: "Successful chases", current: 8, target: 9 },
    ],
    twinYears: 18,
    twinLines: [
      "Based on 18 years of data, Kohli tends to accelerate after crossing 35 runs whilst reducing risk against spin.",
      "His most successful chase pattern is strike rotation until over 35. Boundaries are a release, not the plan.",
    ],
    blurb: "Still the reference point for a run chase. The Twin reads eighteen years and keeps returning to the same pattern.",
    away: "Away hundreds are the argument for him. He scores them when the innings is personal and the rate is not.",
    chases: "Strike rotation until over 35, then the field spreads and he takes the pockets it leaves.",
    opponents: "The new ball, and the bowler who can hold a fourth-stump line without drifting onto his pads.",
  },
  {
    id: "ben-stokes",
    name: "Ben Stokes",
    teamId: "england",
    role: "All-rounder",
    style: "Left-hand bat · right-arm fast-medium",
    age: 35,
    span: "2013 –",
    form: [11, 70, 0, 34, 6, 55, 2, 3],
    formLabel: "Last eight Test scores",
    formNote: "Not out 3. Bowling will be a burst, not a spell. The batting is the brief.",
    dna: { technical: 82, consistency: 74, spin: 80, pace: 88, mental: 98, leadership: 96, adaptability: 93 },
    traits: [
      { label: "Aggressive", level: 94, note: "Eight quiet balls, then the shot that changes the plan." },
      { label: "Relentless", level: 96, note: "Closes ugly games that should already be over." },
      { label: "Explosive", level: 91, note: "Bowling is a burst. Batting can be one too." },
      { label: "Calm", level: 72, note: "Clarity under pressure, not stillness." },
    ],
    similar: [
      { id: "ravindra-jadeja", score: 70, note: "Different crafts, same effect: the match has another gear when they are fully fit." },
      { id: "joe-root", score: 60, note: "Partners, not twins. Root builds the day. Stokes decides it." },
    ],
    projection: {
      headline: "Match captain",
      elite: 88,
      captain: 93,
      worldXI: 72,
      landmark: "7,000 Test runs",
      landmarkChance: 64,
      retire: "2028",
      peakAge: 31,
    },
    report: {
      strengths: [
        "The best closer in the side when the game is ugly",
        "Left-hand angle breaks a tired field",
        "Leadership shows up as clarity, not noise",
      ],
      weaknesses: [
        "Bowling workload has to be rationed",
        "Early in a knock he can chase a wide ball from a wrist spinner",
      ],
      development: "The all-round version is narrowing into a batter who bowls to change a session. That is still enough.",
    },
    milestones: [
      { label: "Test runs", current: 6610, target: 7000 },
      { label: "Test wickets", current: 198, target: 200 },
      { label: "Wins as captain", current: 22, target: 25 },
    ],
    twinYears: 13,
    twinLines: [
      "Stokes bats in bursts of intent. Eight quiet balls, then the shot that tells the fielders the plan has changed.",
      "He trusts the deep midwicket fielder to be wrong. Most days the fielder is right twice and wrong once, and once is enough.",
    ],
    blurb: "Captain, closer, and a bowling option the model treats as a burst rather than a stock spell.",
    away: "Away from home he is more batter than bowler, and the batting gets braver as the lead shrinks.",
    chases: "The Headingley pattern is still in the file: he scores in the V until the bowler goes short, then he hooks.",
    opponents: "Kuldeep, today. The first fifteen balls of that spell are the session.",
  },
  {
    id: "ravindra-jadeja",
    name: "Ravindra Jadeja",
    teamId: "india",
    role: "All-rounder",
    style: "Left-hand bat · left-arm spin",
    age: 37,
    span: "2012 –",
    form: [2, 1, 3, 0, 4, 2, 1, 1],
    formLabel: "Wickets in last eight inns",
    formNote: "One wicket today. Root has taken the sting out of the stock ball.",
    dna: { technical: 86, consistency: 90, spin: 92, pace: 70, mental: 93, leadership: 80, adaptability: 91 },
    traits: [
      { label: "Patient", level: 92, note: "Happy to bowl a maiden and walk back." },
      { label: "Calculated", level: 90, note: "Holds an end while the quicks reload." },
      { label: "Technical", level: 86, note: "Stock ball at the stumps until patience fails." },
      { label: "Calm", level: 88, note: "Control first. Magic ball later, if at all." },
    ],
    similar: [
      { id: "ben-stokes", score: 70, note: "The other player whose fitness changes the shape of an XI." },
      { id: "joe-root", score: 55, note: "Today's duel. Root's spin control is the reason Jadeja's spell looks ordinary." },
    ],
    projection: {
      headline: "Control all-rounder",
      elite: 89,
      captain: 34,
      worldXI: 76,
      landmark: "300 Test wickets",
      landmarkChance: 58,
      retire: "2028",
      peakAge: 33,
    },
    report: {
      strengths: [
        "Holds an end while the quicks reload",
        "Bat-pad chance is still a live mode of dismissal",
        "Lower-order runs arrive quickly enough to matter",
      ],
      weaknesses: [
        "Root, set, scores off him without risk",
        "If the surface stays slow, he becomes a holding bowler rather than a wicket one",
      ],
      development: "Importance today is real and limited. He is the over-bank. He is not the bowler who will win the session unless the ball starts to grip after tea.",
    },
    milestones: [
      { label: "Test wickets", current: 275, target: 300 },
      { label: "Test runs", current: 3200, target: 3500 },
      { label: "Five-wicket hauls", current: 12, target: 14 },
    ],
    twinYears: 14,
    twinLines: [
      "Jadeja bowls at the stumps and lets the batter's patience fail. He does not chase a magic ball.",
      "When a right-hander steps out, he follows them. When they stay in, he is happy to bowl a maiden and walk back.",
    ],
    blurb: "India's control. Today he is being managed by Root, which is exactly the matchup the model circled.",
    away: "Away, his batting rises and his bowling becomes the holding role around a quick.",
    chases: "With the bat in a chase he looks to finish it, not nurse it.",
    opponents: "Set right-handers who play late. Root is the prototype.",
  },
  {
    id: "travis-head",
    name: "Travis Head",
    teamId: "australia",
    role: "Batter",
    style: "Left-hand bat · occasional off spin",
    age: 32,
    span: "2018 –",
    form: [11, 140, 4, 92, 26, 8, 119, 15],
    formLabel: "Last eight Test scores",
    formNote: "Not in this match. The Bumrah file is the one that follows him.",
    dna: { technical: 80, consistency: 76, spin: 74, pace: 95, mental: 88, leadership: 70, adaptability: 86 },
    traits: [
      { label: "Aggressive", level: 95, note: "Puts the bowler on the back foot by ball four." },
      { label: "Explosive", level: 93, note: "Hundreds arrive fast enough to change a day." },
      { label: "Creative", level: 80, note: "Left-hand angle opens the off side against pace." },
      { label: "Calculated", level: 55, note: "The fourth-ball slash is still not a calculation." },
    ],
    similar: [
      { id: "harry-brook", score: 84, note: "Two batters who try to end a spell before it starts." },
      { id: "ben-stokes", score: 66, note: "Shared habit of taking a match personally." },
    ],
    projection: {
      headline: "Series breaker",
      elite: 86,
      captain: 28,
      worldXI: 74,
      landmark: "5,000 Test runs",
      landmarkChance: 81,
      retire: "2032",
      peakAge: 31,
    },
    report: {
      strengths: [
        "Ruins a new-ball plan by scoring off it",
        "Left-hand angle opens the off side against right-arm pace",
        "Hundreds tend to be fast enough to change a day",
      ],
      weaknesses: [
        "First fifteen balls against Bumrah are a known hole",
        "If the bowler holds the line on the hip, the slash becomes a catch",
      ],
      development: "Peak is now. The career question is whether the Bumrah matchup stays a footnote or becomes the story.",
    },
    milestones: [
      { label: "Test runs", current: 4102, target: 5000 },
      { label: "Test centuries", current: 11, target: 15 },
      { label: "Away hundreds", current: 5, target: 7 },
    ],
    twinYears: 8,
    twinLines: [
      "Head's default is to put the bowler on the back foot by the fourth ball. It works until the bowler expects it.",
      "Against Bumrah he still plays the same fourth ball. That is the 48% spike.",
    ],
    blurb: "Australia's accelerator. Against Bumrah the model shortens his leash to fifteen balls.",
    away: "Away hundreds are struck, not compiled. The rate is the method.",
    chases: "He wants the target under a run a ball before the second hour.",
    opponents: "Bumrah. Eleven meetings, seven dismissals, strike rate 87.",
  },
  {
    id: "kane-williamson",
    name: "Kane Williamson",
    teamId: "new-zealand",
    role: "Batter",
    style: "Right-hand bat",
    age: 36,
    span: "2010 –",
    form: [22, 9, 67, 104, 13, 44, 5, 81],
    formLabel: "Last eight Test scores",
    formNote: "The active batter the model keeps placing next to Root.",
    dna: { technical: 94, consistency: 93, spin: 90, pace: 88, mental: 95, leadership: 90, adaptability: 92 },
    traits: [
      { label: "Patient", level: 96, note: "Lets the first hour belong to the bowler on purpose." },
      { label: "Technical", level: 94, note: "Leaves later than almost anyone." },
      { label: "Calm", level: 97, note: "Removes your best hour without announcing it." },
      { label: "Calculated", level: 90, note: "Waits until the field moves before inventing a shot." },
    ],
    similar: [
      { id: "joe-root", score: 86, note: "Control, late hands, and a career built on not losing the first session." },
      { id: "kumar-sangakkara", score: 82, note: "The previous generation's version of the same patience." },
      { id: "steve-smith", score: 75, note: "Smith fidgets. Williamson disappears. Bowlers dislike both." },
    ],
    projection: {
      headline: "Classic Test batter",
      elite: 91,
      captain: 80,
      worldXI: 77,
      landmark: "10,000 Test runs",
      landmarkChance: 62,
      retire: "2028",
      peakAge: 31,
    },
    report: {
      strengths: [
        "Leaves the ball later than almost anyone",
        "Scores in singles when the field is set for a drive",
        "Away innings lose less than his peers'",
      ],
      weaknesses: [
        "Can go a session without a boundary and let the rate become a problem",
        "Short-ball plans still occupy him if the pitch has carry",
      ],
      development: "The career is in its last chapter. The away record is the part that will be re-read.",
    },
    milestones: [
      { label: "Test runs", current: 8904, target: 10000 },
      { label: "Test centuries", current: 32, target: 35 },
      { label: "Away centuries", current: 12, target: 14 },
    ],
    twinYears: 16,
    twinLines: [
      "Williamson lets the first hour belong to the bowler on purpose. The scoring starts when the bowler has bowled himself off his best length.",
      "He does not invent a shot for a field. He waits until the field moves.",
    ],
    blurb: "Root's nearest active twin. Less flourish, same refusal to hand over a session.",
    away: "Greatest away innings are the ones where he bats through the best spell and leaves the rate to someone else.",
    chases: "He will take a chase deep. Risk arrives only when the balls left demand it.",
    opponents: "Bowlers who can swing it both ways for a full spell. One-trick plans wash off him.",
  },
  {
    id: "steve-smith",
    name: "Steve Smith",
    teamId: "australia",
    role: "Batter",
    style: "Right-hand bat",
    age: 37,
    span: "2010 –",
    form: [8, 91, 17, 6, 121, 33, 4, 58],
    formLabel: "Last eight Test scores",
    formNote: "Still the odd method that makes a good length look like the wrong one.",
    dna: { technical: 96, consistency: 90, spin: 85, pace: 94, mental: 93, leadership: 78, adaptability: 88 },
    traits: [
      { label: "Technical", level: 97, note: "Turns a good length into a scoring ball by getting across." },
      { label: "Calculated", level: 93, note: "Premeditates the movement, not the shot." },
      { label: "Patient", level: 89, note: "Concentration outlasts a spell." },
      { label: "Creative", level: 86, note: "A method that still does not look like anyone else." },
    ],
    similar: [
      { id: "joe-root", score: 83, note: "Different hands, same ability to make a session feel short for the bowler." },
      { id: "kane-williamson", score: 75, note: "Two solutions to the same problem of the new ball." },
      { id: "virat-kohli", score: 80, note: "The other giant of the same decade, built for a different kind of innings." },
    ],
    projection: {
      headline: "Era-defining batter",
      elite: 93,
      captain: 40,
      worldXI: 82,
      landmark: "10,000 Test runs",
      landmarkChance: 73,
      retire: "2027",
      peakAge: 30,
    },
    report: {
      strengths: [
        "Turns a good length into a scoring ball by getting across",
        "Concentration spans that outlast a spell",
        "Still punishes anything on the pads",
      ],
      weaknesses: [
        "The leave is a smaller part of the game than it used to be",
        "Leg-side plans with a catcher at leg gully have a history",
      ],
      development: "Past the peak, still inside the elite band. The next year is about which dismissals he has retired.",
    },
    milestones: [
      { label: "Test runs", current: 9688, target: 10000 },
      { label: "Test centuries", current: 34, target: 36 },
      { label: "Ashes hundreds", current: 12, target: 13 },
    ],
    twinYears: 16,
    twinLines: [
      "Smith premeditates the movement, not the shot. Once he is across, the ball has to find a new line or it becomes a run.",
      "He still reviews the first ten balls as information, even when the scoreboard says he is attacking.",
    ],
    blurb: "A method that still does not look like anyone else, and still works.",
    away: "Away, the trigger movement gets bigger and the returns stay unreasonable.",
    chases: "He treats a chase like a first innings until the equation forces a gear change.",
    opponents: "The ball that leaves him from a full length, and patience from the captain.",
  },
  {
    id: "kumar-sangakkara",
    name: "Kumar Sangakkara",
    teamId: "sri-lanka",
    role: "Keeper",
    style: "Left-hand bat · career complete",
    age: 48,
    span: "2000 – 2015",
    form: [40, 105, 12, 87, 192, 6, 61, 117],
    formLabel: "A late-career sample",
    formNote: "Retired. He sits in the model as Root's nearest historical twin.",
    dna: { technical: 95, consistency: 96, spin: 93, pace: 90, mental: 94, leadership: 92, adaptability: 93 },
    traits: [
      { label: "Technical", level: 95, note: "Converted starts at a rate the modern game still chases." },
      { label: "Patient", level: 94, note: "Singles in clusters, then a boundary that did not look planned." },
      { label: "Calm", level: 92, note: "Closed chases by keeping the rate from becoming a story." },
      { label: "Calculated", level: 90, note: "Fluent against spin without forcing the day." },
    ],
    similar: [
      { id: "joe-root", score: 91, note: "The likeness is accumulation without a collapse in average." },
      { id: "kane-williamson", score: 82, note: "Same family of batters: late, calm, hard to rush." },
    ],
    projection: {
      headline: "Completed career",
      elite: 96,
      captain: 86,
      worldXI: 90,
      landmark: "Career already run",
      landmarkChance: 100,
      retire: "2015",
      peakAge: 35,
    },
    report: {
      strengths: [
        "Converted starts at a rate the modern game still chases",
        "Kept and batted without the batting falling away",
        "Fluent against both spin and the new ball",
      ],
      weaknesses: [
        "A finished career has no development left to model",
        "The keeper's glove work is not the reason he is in this file",
      ],
      development: "No projected peak. He is here because Root's shape keeps resolving to him.",
    },
    milestones: [
      { label: "Test runs", current: 12400, target: 12400 },
      { label: "Test centuries", current: 38, target: 38 },
      { label: "Double centuries", current: 11, target: 11 },
    ],
    twinYears: 15,
    twinLines: [
      "Sangakkara scored in clusters of singles and then a boundary that did not look planned. The field never quite set for both.",
      "Root's late hands are the echo. The stance is not.",
    ],
    blurb: "The historical twin. When the model is asked who Root resembles, this is the first name.",
    away: "Away runs were the substance of the career, not a footnote.",
    chases: "He closed chases by keeping the required rate from becoming a story.",
    opponents: "Quality off spin in the subcontinent, which he treated as a scoring option.",
  },
  {
    id: "matthew-potts",
    name: "Matthew Potts",
    teamId: "england",
    role: "Bowler",
    style: "Right-arm fast-medium",
    age: 27,
    span: "2022 –",
    form: [1, 3, 2, 0, 4, 1, 2, 3],
    formLabel: "Wickets in last eight inns",
    formNote: "Ownership 4% in the fantasy room. The model still has him at 61 expected points if he bowls day three.",
    dna: { technical: 78, consistency: 80, spin: 30, pace: 82, mental: 84, leadership: 60, adaptability: 77 },
    traits: [
      { label: "Relentless", level: 88, note: "Same length until the batter invents a shot." },
      { label: "Patient", level: 85, note: "Not the bowler for a wicket this over." },
      { label: "Calculated", level: 78, note: "Day-three footmarks are the brief." },
      { label: "Calm", level: 80, note: "No slower ball he trusts, so the plan stays honest." },
    ],
    similar: [
      { id: "jasprit-bumrah", score: 40, note: "Only in the job, not the method. Potts hits a length and waits." },
    ],
    projection: {
      headline: "Series bowler",
      elite: 62,
      captain: 8,
      worldXI: 24,
      landmark: "100 Test wickets",
      landmarkChance: 54,
      retire: "2034",
      peakAge: 29,
    },
    report: {
      strengths: [
        "Hits a heavy length for long spells",
        "Wickets come in clusters when the ball seams",
        "Low ownership makes him the clean differential",
      ],
      weaknesses: [
        "If the ball goes soft he can be scored off without risk",
        "He is not the bowler you start when you need a wicket this over",
      ],
      development: "A useful peak is ahead of him, not a famous one. Fantasy value is higher than reputation.",
    },
    milestones: [
      { label: "Test wickets", current: 48, target: 100 },
      { label: "Five-wicket hauls", current: 1, target: 4 },
      { label: "Matches", current: 18, target: 40 },
    ],
    twinYears: 4,
    twinLines: [
      "Potts bowls the same length until the batter invents a shot. The shot is usually the wicket.",
      "He does not have a slower ball he trusts, so the plan stays honest.",
    ],
    blurb: "The differential. Almost nobody has him, and day-three footmarks are his brief.",
    away: "Away he needs movement. Without it he is a holding bowler.",
    chases: "Defending, he is the bowler you use between the bursts.",
    opponents: "Batters who refuse to play him off the back foot.",
  },
  {
    id: "kuldeep-yadav",
    name: "Kuldeep Yadav",
    teamId: "india",
    role: "Bowler",
    style: "Left-arm wrist spin",
    age: 31,
    span: "2017 –",
    form: [2, 4, 1, 3, 0, 5, 2, 1],
    formLabel: "Wickets in last eight inns",
    formNote: "Has Brook already. Stokes is the live matchup.",
    dna: { technical: 88, consistency: 76, spin: 95, pace: 35, mental: 84, leadership: 62, adaptability: 86 },
    traits: [
      { label: "Creative", level: 94, note: "Wrong'un arrives without a tell." },
      { label: "Aggressive", level: 86, note: "Strike spinner, not a holding end." },
      { label: "Calculated", level: 82, note: "Wants the left-hander playing with turn that is not there." },
      { label: "Explosive", level: 80, note: "A bad over goes for ten. A good one ends a stand." },
    ],
    similar: [
      { id: "ravindra-jadeja", score: 58, note: "Same side of the ball, different job. Jadeja holds. Kuldeep strikes." },
    ],
    projection: {
      headline: "Strike spinner",
      elite: 80,
      captain: 6,
      worldXI: 55,
      landmark: "150 Test wickets",
      landmarkChance: 69,
      retire: "2033",
      peakAge: 31,
    },
    report: {
      strengths: [
        "The wrong'un still arrives without a tell",
        "Left-handers play him as if the ball will turn more than it does",
        "He broke the Root-Brook stand",
      ],
      weaknesses: [
        "A bad over goes for ten, and captains panic",
        "If Stokes survives the first two overs the spell can drift",
      ],
      development: "He is in his best years. The question is whether he bowls in the sessions that matter or only the ones that are already drifting.",
    },
    milestones: [
      { label: "Test wickets", current: 56, target: 150 },
      { label: "Five-wicket hauls", current: 3, target: 8 },
      { label: "Left-hand dismissals", current: 24, target: 40 },
    ],
    twinYears: 9,
    twinLines: [
      "Kuldeep shows the stock ball and hides the wrong'un in the same seam position. The batter's tell is a premeditated sweep.",
      "He wants the left-hander playing with the turn that is not there.",
    ],
    blurb: "The wicket India actually took against the stand. Stokes is next, and the first fifteen balls are the model.",
    away: "Away he needs a captain who will give him the over after a boundary.",
    chases: "In a chase he bowls at the stumps and invites the big shot.",
    opponents: "Left-handers early. Brook was the right-hand exception today because he charged.",
  },
  {
    id: "babar-azam",
    name: "Babar Azam",
    teamId: "pakistan",
    role: "Batter",
    style: "Right-hand bat",
    age: 31,
    span: "2016 –",
    form: [22, 8, 67, 14, 103, 5, 44, 31],
    formLabel: "Last eight Test scores",
    formNote: "Not in this Lord's Test. The file holds him for trajectory and similarity asks.",
    dna: { technical: 92, consistency: 88, spin: 86, pace: 90, mental: 87, leadership: 84, adaptability: 85 },
    traits: [
      { label: "Technical", level: 93, note: "Timing first. The bat looks late and still finds the middle." },
      { label: "Calm", level: 90, note: "Builds an innings without announcing the gear change." },
      { label: "Patient", level: 86, note: "Will take the single until the field invents a drive." },
      { label: "Calculated", level: 84, note: "Risk is staged, not invented in the first twenty balls." },
    ],
    similar: [
      { id: "joe-root", score: 78, note: "Control batting with a higher ceiling on the drive." },
      { id: "virat-kohli", score: 74, note: "Shared hunger for the innings that settles a side, different chase grammar." },
      { id: "kane-williamson", score: 72, note: "Late hands, same refusal to gift the new ball." },
    ],
    projection: {
      headline: "Pakistan's control batter",
      elite: 88,
      captain: 76,
      worldXI: 70,
      landmark: "10,000 international runs (all formats already close)",
      landmarkChance: 82,
      retire: "2032",
      peakAge: 30,
    },
    report: {
      strengths: [
        "Elite timing through cover and midwicket",
        "Rarely panics a chase into a collapse",
        "Converts starts more often than the noise around him suggests",
      ],
      weaknesses: [
        "Away seam that holds a fourth-stump line can occupy him",
        "Captaincy load has occasionally thinned the batting clarity",
      ],
      development: "Peak age is now. The next three years decide whether the Test average climbs into the Root-Kohli band or stays a notch below.",
    },
    milestones: [
      { label: "Test runs", current: 3890, target: 7000 },
      { label: "Test centuries", current: 9, target: 20 },
      { label: "Away centuries", current: 3, target: 8 },
    ],
    twinYears: 10,
    twinLines: [
      "Babar scores in soft hands until the bowler overpitches. The drive is a reward, not a hunt.",
      "Under pressure he shrinks the game to singles first. Boundaries return once the field spreads.",
    ],
    blurb: "Pakistan's reference batter. Closest living trajectory asks often resolve to Root or Kohli, depending on whether you weight control or chase appetite.",
    away: "Away hundreds are rarer than home ones. The method travels; the conversion rate is still climbing.",
    chases: "Strike rotation first. He does not try to finish a chase in a burst unless the required rate forces it.",
    opponents: "The ball that leaves him from a full length, and captains who starve the cover drive for a full hour.",
  },
  {
    id: "sachin-tendulkar",
    name: "Sachin Tendulkar",
    teamId: "india",
    role: "Batter",
    style: "Right-hand bat · career complete",
    age: 52,
    span: "1989 – 2013",
    form: [41, 122, 8, 76, 103, 15, 94, 37],
    formLabel: "A late-career sample",
    formNote: "Retired. Held for age-curve comparisons — especially Sachin at 24 vs modern batters.",
    dna: { technical: 98, consistency: 94, spin: 92, pace: 95, mental: 96, leadership: 80, adaptability: 94 },
    traits: [
      { label: "Technical", level: 98, note: "The textbook and the exception in the same stance." },
      { label: "Patient", level: 90, note: "Could bat time without looking like he was batting time." },
      { label: "Calculated", level: 92, note: "Shot selection aged better than most careers." },
      { label: "Calm", level: 88, note: "Dressing rooms settled when he walked out." },
    ],
    similar: [
      { id: "virat-kohli", score: 76, note: "Kohli at 24 was already a chase batter. Sachin at 24 was already a library." },
      { id: "joe-root", score: 71, note: "Shared accumulation instinct; different eras, different theatres." },
      { id: "steve-smith", score: 68, note: "Two batters who made bowlers rewrite a length." },
    ],
    projection: {
      headline: "Completed career",
      elite: 99,
      captain: 55,
      worldXI: 99,
      landmark: "Career already run",
      landmarkChance: 100,
      retire: "2013",
      peakAge: 28,
    },
    report: {
      strengths: [
        "Mastered every bowling type across a generation",
        "Converted starts into landmarks at a historic rate",
        "Age-curve still the reference for young batters",
      ],
      weaknesses: [
        "A finished career has no live development left",
        "Captaincy was never the centre of the file",
      ],
      development: "No projected peak. He is here so age comparisons have a ground truth.",
    },
    milestones: [
      { label: "Test runs", current: 15921, target: 15921 },
      { label: "Test centuries", current: 51, target: 51 },
      { label: "ODI runs", current: 18426, target: 18426 },
    ],
    twinYears: 24,
    twinLines: [
      "At 24 Sachin already had a full international vocabulary: leave, drive, pull, and the late cut that ended spells.",
      "He treated bowling plans as information. Once read, he scored without needing the plan to fail first.",
    ],
    blurb: "The age-curve reference. Sachin at 24 vs Kohli at 24 is the cleanest historical comparison the model holds.",
    away: "Away mastery was the argument for greatness, not a footnote.",
    chases: "He closed chases by shrinking the required rate, then taking the pockets.",
    opponents: "Every great bowler of two decades. The file is too wide for a single rivalry.",
  },
];

export const teams: Team[] = [
  {
    id: "england",
    name: "England",
    short: "ENG",
    accent: "eng",
    summary: "A side that tries to win the session before it tries to draw it.",
    dna: [
      { label: "Aggression", value: 92 },
      { label: "Tempo", value: 89 },
      { label: "Adaptability", value: 85 },
      { label: "Pressure", value: 88 },
      { label: "Spin resistance", value: 81 },
    ],
    styles: ["High risk", "High tempo", "Attack first"],
    analogue: {
      title: "2005 Australia",
      similarity: 81,
      note: "Same appetite for risk, same refusal to bat time for its own sake. A higher ceiling, and a messier floor when the new ball moves.",
    },
    evolution: [
      { year: "2019", title: "The rebuild", note: "A cautious side still batting in the previous captain's rhythm.", tempo: 62 },
      { year: "2022", title: "The break", note: "Bazball as a method, not a slogan. Sessions got shorter. Results got louder.", tempo: 90 },
      { year: "2024", title: "The correction", note: "They kept the tempo and started picking bowling attacks that could defend it.", tempo: 86 },
      { year: "2026", title: "This side", note: "Aggression 92, with Root still the brake pedal they actually use.", tempo: 89 },
    ],
    health: [
      { name: "Joe Root", playerId: "joe-root", role: "Batter", fitness: 94, workload: 58, risk: "Low", note: "Batting only. The 89 not out is a load he enjoys." },
      { name: "Harry Brook", playerId: "harry-brook", role: "Batter", fitness: 91, workload: 62, risk: "Low", note: "Innings closed. Available as a close catcher." },
      { name: "Ben Stokes", playerId: "ben-stokes", role: "All-rounder", fitness: 78, workload: 84, risk: "Watch", note: "Bowling capped. A burst of four overs is the plan, not twelve." },
      { name: "Jamie Smith", role: "Keeper", fitness: 96, workload: 70, risk: "Low", note: "Keeping day. No batting load yet." },
      { name: "Gus Atkinson", role: "Bowler", fitness: 88, workload: 66, risk: "Low", note: "First spell tomorrow if England bat once." },
      { name: "Chris Woakes", role: "Bowler", fitness: 71, workload: 94, risk: "High", note: "Calf tightness. Do not start him." },
      { name: "Matthew Potts", playerId: "matthew-potts", role: "Bowler", fitness: 93, workload: 48, risk: "Low", note: "Under-bowled this month. Ready for a long day-three spell." },
      { name: "Shoaib Bashir", role: "Bowler", fitness: 90, workload: 55, risk: "Low", note: "The holding spinner if the lead is built." },
    ],
    futures: [
      {
        year: 2026,
        captain: "Ben Stokes",
        note: "This XI, with Woakes held back and Potts bowling the third seamer's overs.",
        xi: ["Crawley", "Duckett", "Pope", "Root", "Brook", "Stokes", "J. Smith", "Atkinson", "Potts", "Bashir", "Archer"],
      },
      {
        year: 2029,
        captain: "Harry Brook",
        note: "Root has stepped back. Brook captains a side that still wants the first hour.",
        xi: ["Bethell", "Duckett", "Pope", "Brook", "J. Smith", "Rehan", "Atkinson", "Potts", "Bashir", "Archer", "Tongue"],
      },
      {
        year: 2032,
        captain: "Harry Brook",
        note: "The attack is Archer's if the body allows it. The batting method has not softened.",
        xi: ["Bethell", "A new opener", "Pope", "Brook", "J. Smith", "Rehan", "Atkinson", "Bashir", "Archer", "Tongue", "A left-arm quick"],
      },
    ],
  },
  {
    id: "india",
    name: "India",
    short: "IND",
    accent: "ind",
    summary: "Control through Bumrah, and a spin pair that has to work harder at Lord's than it does at home.",
    dna: [
      { label: "Control", value: 90 },
      { label: "Pace strike", value: 94 },
      { label: "Spin depth", value: 88 },
      { label: "Chase calm", value: 86 },
      { label: "Venue flexibility", value: 74 },
    ],
    styles: ["Strike with pace", "Hold with spin", "Chase late"],
    analogue: {
      title: "India in England, 2021",
      similarity: 77,
      note: "A pace leader who bends the game, and a batting order that has to survive the first morning before it can be itself.",
    },
    evolution: [
      { year: "2018", title: "The pace shift", note: "Bumrah's arrival changed what an away attack was allowed to look like.", tempo: 70 },
      { year: "2021", title: "The away proof", note: "They won in conditions that used to be a coin toss against them.", tempo: 74 },
      { year: "2024", title: "The spin refresh", note: "Kuldeep moved from a luxury to a plan.", tempo: 78 },
      { year: "2026", title: "This side", note: "Still Bumrah-shaped. Without him the win chance at Lord's falls to 18%.", tempo: 80 },
    ],
    health: [
      { name: "Jasprit Bumrah", playerId: "jasprit-bumrah", role: "Bowler", fitness: 86, workload: 88, risk: "Watch", note: "Peak speed, managed spells. Losing him swings the match." },
      { name: "Ravindra Jadeja", playerId: "ravindra-jadeja", role: "All-rounder", fitness: 90, workload: 72, risk: "Low", note: "Bowling load is fine. The matchup with Root is not." },
      { name: "Kuldeep Yadav", playerId: "kuldeep-yadav", role: "Bowler", fitness: 92, workload: 60, risk: "Low", note: "The wicket of Brook is in the book." },
      { name: "Mohammed Siraj", role: "Bowler", fitness: 89, workload: 76, risk: "Low", note: "Support spell. No wicket yet, runs leaking." },
      { name: "Virat Kohli", playerId: "virat-kohli", role: "Batter", fitness: 93, workload: 40, risk: "Low", note: "Yet to bat. The chase file is unused so far." },
      { name: "Rishabh Pant", role: "Keeper", fitness: 84, workload: 68, risk: "Watch", note: "Keeping a long day. Batting impact is later." },
      { name: "Shubman Gill", role: "Batter", fitness: 95, workload: 36, risk: "Low", note: "Fresh. First innings will define his week." },
      { name: "Yashasvi Jaiswal", role: "Batter", fitness: 97, workload: 34, risk: "Low", note: "Catch already taken. The batting is the job." },
    ],
    futures: [
      {
        year: 2026,
        captain: "Shubman Gill",
        note: "Bumrah still opens the bowling. Jadeja still closes the control.",
        xi: ["Jaiswal", "Rahul", "Gill", "Kohli", "Pant", "Jadeja", "Washington", "Kuldeep", "Bumrah", "Siraj", "Akash Deep"],
      },
      {
        year: 2029,
        captain: "Shubman Gill",
        note: "Kohli is a series pick, not an automatic. Bumrah's spells get shorter and more valuable.",
        xi: ["Jaiswal", "Gill", "A middle order", "Pant", "Jadeja", "Washington", "Kuldeep", "Bumrah", "Siraj", "A left-arm quick", "Akash Deep"],
      },
      {
        year: 2032,
        captain: "Yashasvi Jaiswal",
        note: "The attack is no longer one bowler. It has to be, because Bumrah's window is closing.",
        xi: ["Jaiswal", "Gill", "A new No. 3", "Pant", "Washington", "Kuldeep", "A seam all-rounder", "Siraj", "Akash Deep", "A wrist spinner", "A fast bowler"],
      },
    ],
  },
  {
    id: "australia",
    name: "Australia",
    short: "AUS",
    accent: "gold",
    summary: "Pace, slips, and a left-hand batter who tries to end the new ball as an idea.",
    dna: [
      { label: "Pace battery", value: 93 },
      { label: "Slip catching", value: 90 },
      { label: "Aggression", value: 88 },
      { label: "Spin reliance", value: 64 },
      { label: "Pressure", value: 91 },
    ],
    styles: ["New ball first", "Catch everything", "No quiet hours"],
    analogue: {
      title: "Australia 2019",
      similarity: 79,
      note: "A side that still believes a spell of pace can replace an hour of spin.",
    },
    evolution: [
      { year: "2019", title: "The hold", note: "Smith and the new ball were the whole method.", tempo: 72 },
      { year: "2023", title: "Head's years", note: "The left-hander started winning sessions on his own.", tempo: 84 },
      { year: "2026", title: "This side", note: "Still built to bowl teams out before tea on day two.", tempo: 82 },
    ],
    health: [
      { name: "Travis Head", playerId: "travis-head", role: "Batter", fitness: 90, workload: 50, risk: "Low", note: "The Bumrah matchup is the watch item, not his body." },
      { name: "Steve Smith", playerId: "steve-smith", role: "Batter", fitness: 88, workload: 64, risk: "Low", note: "Managed between series. Batting load only." },
      { name: "Pat Cummins", role: "Bowler", fitness: 85, workload: 80, risk: "Watch", note: "Captain and opening bowler. Spells are planned, not open-ended." },
    ],
    futures: [
      {
        year: 2026,
        captain: "Pat Cummins",
        note: "Head still bats in the top four. Smith still solves the new ball his own way.",
        xi: ["Khawaja", "Head", "Labuschagne", "Smith", "Green", "Carey", "Cummins", "Starc", "Hazlewood", "Lyon", "Marsh"],
      },
      {
        year: 2030,
        captain: "A pace bowler",
        note: "Smith's chapter closes. The pace battery is the identity that remains.",
        xi: ["A new opener", "Head", "Labuschagne", "Green", "Carey", "A middle order", "Cummins", "A quick", "Hazlewood", "Lyon", "An all-rounder"],
      },
    ],
  },
  {
    id: "new-zealand",
    name: "New Zealand",
    short: "NZ",
    accent: "lime",
    summary: "Technique, and the ability to bat through the best spell without announcing it.",
    dna: [
      { label: "Technique", value: 91 },
      { label: "Adaptability", value: 90 },
      { label: "Seam depth", value: 78 },
      { label: "Pressure", value: 88 },
      { label: "Ceiling", value: 74 },
    ],
    styles: ["Bat time", "Seam both ways", "No panic"],
    analogue: {
      title: "New Zealand 2021",
      similarity: 84,
      note: "A side that wins by removing your best hour, not by outscoring it.",
    },
    evolution: [
      { year: "2021", title: "The peak", note: "Williamson and a seam attack that knew its lengths.", tempo: 68 },
      { year: "2026", title: "The long fade", note: "The method remains. The great batter is in his last chapter.", tempo: 70 },
    ],
    health: [
      { name: "Kane Williamson", playerId: "kane-williamson", role: "Batter", fitness: 82, workload: 60, risk: "Watch", note: "Body management between Tests. The batting is unchanged." },
    ],
    futures: [
      {
        year: 2026,
        captain: "A successor",
        note: "Williamson still bats three when he plays. The side is learning to score without waiting for him.",
        xi: ["Conway", "Young", "Williamson", "Ravindra", "Mitchell", "Blundell", "Phillips", "Jamieson", "Henry", "Southee", "Ajaz"],
      },
      {
        year: 2030,
        captain: "Rachin Ravindra",
        note: "The Williamson chapter is closed. The lengths stay the same.",
        xi: ["A new opener", "Young", "Ravindra", "Mitchell", "Blundell", "Phillips", "A seamer", "Henry", "Jamieson", "Ajaz", "A quick"],
      },
    ],
  },
];

export const briefing = [
  {
    id: "root-runs",
    icon: "🎯",
    title: "Root needs 73 runs for 14,000",
    detail: "He is 89 not out. The milestone is a session, not a series.",
    screen: "players" as const,
    playerId: "joe-root",
    teamIds: ["england"] as string[],
  },
  {
    id: "brook-run",
    icon: "🔥",
    title: "Brook is on his best 10-match run",
    detail: "The 64 today fits the stretch. The dismissal, to spin, also fits the file.",
    screen: "players" as const,
    playerId: "harry-brook",
    teamIds: ["england"] as string[],
  },
  {
    id: "bumrah-pace",
    icon: "📈",
    title: "Bumrah is bowling 9% faster than his career average",
    detail: "146.2 kph against a career mean of 134.1. This is the peak window.",
    screen: "players" as const,
    playerId: "jasprit-bumrah",
    teamIds: ["india"] as string[],
  },
  {
    id: "england-session",
    icon: "📊",
    title: "England are +21 vs the phase model",
    detail: "Overs 22–30 did the damage. Win model: England 58%, India 42%.",
    screen: "match" as const,
    teamIds: ["england", "india"] as string[],
  },
  {
    id: "rain",
    icon: "⚠️",
    title: "Rain risk has increased",
    detail: "From 18% overnight to 34% for the last two sessions. The draw is back in the model.",
    screen: "match" as const,
    teamIds: ["england", "india"] as string[],
  },
  {
    id: "woakes",
    icon: "🩹",
    title: "Woakes calf alert for fantasy benches",
    detail: "Availability 40%. Potts is the differential if you still play that game.",
    screen: "fantasy" as const,
    teamIds: ["england"] as string[],
  },
];

export function personalBriefing(followedPlayers: string[], followedTeams: string[]) {
  const ranked = [...briefing].sort((a, b) => {
    const score = (item: (typeof briefing)[number]) => {
      let n = 0;
      if (item.playerId && followedPlayers.includes(item.playerId)) n += 3;
      if (item.teamIds?.some((id) => followedTeams.includes(id))) n += 2;
      return n;
    };
    return score(b) - score(a);
  });
  return ranked.slice(0, 4);
}

export const stories = [
  {
    id: "brook-goat",
    kicker: "Career",
    icon: "🔥",
    title: "Can Brook become England's next GOAT?",
    lede: "The rate says yes. The spin file says not yet.",
    body: [
      "Brook's last ten Tests are the loudest stretch of his career. He scores at a rate Root never needed, and he scores them against pace that most batters play for time. The model puts an elite Test career at 92%, and 10,000 Test runs at 76%.",
      "The gap is not talent. It is the early ball from a wrist spinner, and the innings he gives away when the plan has not settled. Root at the same age was slower, uglier, and already harder to dismiss twice in a session. Brook exceeds Root's runs-per-innings pace by 14%. He does not yet exceed Root's refusal to get out.",
      "Greatness, in this model, is the ugly afternoon as much as the hundred before lunch. Brook can become the best England batter of his era. Surpassing Root's career weight is a 38% outcome, and it depends on the next two years more than the last ten matches.",
    ],
  },
  {
    id: "bumrah-peak",
    kicker: "Peak",
    icon: "⚡",
    title: "Is Bumrah entering his peak?",
    lede: "The speed says he is already in it.",
    body: [
      "A fast bowler's peak is a window, not a feeling. Bumrah is releasing the ball at 146.2 kph this series, 9% above his own career mean. He has two wickets in the innings and he has not yet bowled the session that will decide the lead.",
      "The Twin reads his spells as three moves: a ball at the hip, a ball at the top of off, and a yorker only after the batter's weight is back. That sequence is at its sharpest now. The model has his peak age at 32, which is this year.",
      "The constraint is the body, not the method. If the spell is capped, India become an ordinary attack on this ground. If he bowls today, England's expected total drops. Peak is not a headline. It is whether he is on the park at 2pm.",
    ],
  },
  {
    id: "lords",
    kicker: "Venue",
    icon: "📊",
    title: "Why India struggle at this venue",
    lede: "The slope, the first morning, and a batting order that likes the ball older than Lord's allows.",
    body: [
      "Lord's does not turn into a minefield. It does something meaner. The slope takes the ball across the right-hander, the first twenty overs move enough to reward a length, and the square boundaries flatter only the batter who is already in.",
      "India's best cricket starts once the ball is older and a chase has a shape. Lord's asks them to be good before either of those things is true. Their right-hand heavy top order plays the same line they play at home, and the line is six inches away from where the slope puts the ball.",
      "They have solved other away grounds with Bumrah. Here he has to do it twice: once with the new ball, and again if England's lower order gets a lead. That is why the what-if is so violent. Without him, India's win chance in this match falls from 42% to 18%.",
    ],
  },
];

export const upcoming = {
  id: "aus-sa",
  title: "Australia vs South Africa",
  meta: "1st Test · Centurion · Thursday",
  note: "No ball in play. The model opens when the match starts. Until then it is a venue prior and a squad file, not a score.",
};

export const recommendations = [
  { q: "Why is Bumrah difficult to face today?", mode: "general" as const },
  { q: "Show Stokes' best chases", mode: "historical" as const },
  { q: "Most similar to Root", mode: "general" as const },
  { q: "Sachin at 24 vs Kohli", mode: "historical" as const },
  { q: "Closest trajectory to Babar", mode: "career" as const },
  { q: "Why is England winning?", mode: "predictions" as const },
  { q: "Summarise today's cricket in 30 seconds", mode: "general" as const },
];

export const trending = [
  { label: "Bumrah peak window", q: "Why is Bumrah dominating today?" },
  { label: "Root → 14,000", q: "Will Root get to 14,000 today?" },
  { label: "England +21", q: "Why is England winning?" },
  { label: "Stokes vs Kuldeep", q: "Who likely scores next?" },
];

export const askPrompts: Record<string, string[]> = {
  general: [
    "Why is Bumrah difficult to face?",
    "Summarise today's cricket in 30 seconds",
    "Most similar to Root",
    "Tell me everything important about England this week",
  ],
  predictions: [
    "Why is England winning?",
    "Project the final score",
    "Who likely scores next?",
    "What are the turning points?",
  ],
  fantasy: [
    "Who should captain?",
    "Why is Potts the differential?",
    "Does the Woakes injury change the XI?",
    "Is Bumrah still a must-start?",
  ],
  historical: [
    "Show Stokes' best chases",
    "Sachin at 24 vs Kohli",
    "Compare Root and Kohli at age 25",
    "Best Test innings since 2000",
  ],
  career: [
    "Closest trajectory to Babar",
    "Predict Brook's career",
    "Will Root get to 14,000 today?",
    "Most similar to Root",
  ],
  twin: [
    "Explain how Virat Kohli approaches run chases.",
    "How does Root play Jadeja once he is set?",
    "What does Brook do in the first fifteen balls against spin?",
    "How does Bumrah choose the yorker?",
  ],
};

export const matchPredictions = [
  {
    id: "top-scorer",
    label: "Most likely top scorer",
    pick: "Joe Root",
    chance: 61,
    note: "Already 89*. Model has him adding 28–45 more if he sees off Bumrah's first burst.",
  },
  {
    id: "dangerous",
    label: "Most dangerous bowler",
    pick: "Jasprit Bumrah",
    chance: 72,
    note: "Two wickets in the book. First four overs of the session move the model more than thirty quiet runs.",
  },
  {
    id: "next-bat",
    label: "Who scores next",
    pick: "Ben Stokes",
    chance: 54,
    note: "Live at the crease. Highest variance: a burst through Kuldeep or an early edge.",
  },
  {
    id: "matchup",
    label: "Key matchup",
    pick: "Stokes vs Kuldeep",
    chance: 68,
    note: "Dismissal risk peaks in the first fifteen balls of wrist spin. Six are done.",
  },
];

export const matchReport = {
  title: "Lord's session report · England 1st innings (so far)",
  kicker: "AI match report",
  status: "End of morning session · Day 2",
  summary:
    "England close the session 245 for 4, twenty-one runs ahead of the phase model. Root is the reason the lead exists. Brook was the tempo. Bumrah is still the over that can take it back.",
  whatHappened: [
    "Bumrah removed Crawley and Duckett with the harder ball. Pope fell to Jadeja. At 108 for 3 the innings was level with expectation.",
    "Overs 22 to 30 changed the match: 72 scored against 48 expected. Root took Jadeja's stock ball away. Brook forced India to abandon the holding plan.",
    "Kuldeep broke the stand — Brook caught behind for 64. Stokes arrived. The session ended with Root 89* and England ahead of the model without yet owning the day.",
  ],
  why: [
    "Root's leave-and-clip pattern neutralised spin before it could become a spell.",
    "India's older-ball bowling never pulled the phase back after the 22–30 surge.",
    "Brook's scoring rate bought time; his dismissal to wrist spin was the file's known hole, not a surprise.",
  ],
  keyOver: {
    label: "Most important over",
    value: "Over 27",
    detail: "Root and Brook took 14 off Jadeja. The control end stopped controlling. Momentum flipped for the rest of the morning.",
  },
  keyPerformance: {
    label: "Key performance",
    value: "Joe Root 89*",
    detail: "120 balls, nine fours, spin managed, milestone still 73 away. The innings that makes louder ones possible.",
  },
  implications: [
    "If Root sees off Bumrah's first four overs, England's expected total climbs toward 340–360.",
    "A wicket in that burst swings win chance back toward 50-50. Without Bumrah, India fall to 18%.",
    "Rain at 34% for the back end keeps the draw alive — and freezes Root short of 14,000 if the covers win.",
  ],
  figures: [
    { label: "Score", value: "245/4" },
    { label: "vs model", value: "+21" },
    { label: "Eng win", value: "58%" },
    { label: "Rain risk", value: "34%" },
  ],
};

export const smartAlerts = [
  {
    id: "root-milestone",
    title: "Root milestone watch",
    detail: "73 runs from 14,000. He is set on 89*. Alert when he reaches 95 or falls.",
    playerId: "joe-root",
    teamId: "england",
    kind: "milestone" as const,
  },
  {
    id: "woakes-fantasy",
    title: "Fantasy injury concern",
    detail: "Woakes calf tightness — 40% availability. Swap window before day three.",
    teamId: "england",
    kind: "injury" as const,
  },
  {
    id: "lords-venue",
    title: "India venue form",
    detail: "Lord's still asks India to be good before the ball is old. Bumrah is the workaround.",
    teamId: "india",
    kind: "venue" as const,
  },
  {
    id: "stokes-kuldeep",
    title: "Live matchup spike",
    detail: "Stokes vs Kuldeep: dismissal risk elevated for nine more balls.",
    playerId: "ben-stokes",
    teamId: "england",
    kind: "live" as const,
  },
];

export const batting = [
  { name: "Z. Crawley", how: "c Jaiswal b Bumrah", runs: 18, balls: 22, fours: 3, sixes: 0, out: true },
  { name: "B. Duckett", how: "lbw b Bumrah", runs: 41, balls: 36, fours: 6, sixes: 0, out: true },
  { name: "O. Pope", how: "c Rahul b Jadeja", runs: 22, balls: 34, fours: 2, sixes: 0, out: true },
  { name: "J. Root", how: "not out", runs: 89, balls: 120, fours: 9, sixes: 0, out: false },
  { name: "H. Brook", how: "c Pant b Kuldeep", runs: 64, balls: 68, fours: 8, sixes: 1, out: true },
  { name: "B. Stokes", how: "not out", runs: 3, balls: 6, fours: 0, sixes: 0, out: false },
];

export const bowling = [
  { name: "J. Bumrah", overs: "14", maidens: 3, runs: 41, wickets: 2 },
  { name: "M. Siraj", overs: "10", maidens: 1, runs: 58, wickets: 0 },
  { name: "Akash Deep", overs: "8", maidens: 1, runs: 52, wickets: 0 },
  { name: "R. Jadeja", overs: "11", maidens: 2, runs: 44, wickets: 1 },
  { name: "K. Yadav", overs: "5.2", maidens: 0, runs: 42, wickets: 1 },
];

export const phases = [
  { label: "Overs 1–10", scored: 48, expected: 44 },
  { label: "Overs 11–21", scored: 55, expected: 58 },
  { label: "Overs 22–30", scored: 72, expected: 48 },
  { label: "Overs 31–40", scored: 42, expected: 46 },
  { label: "Overs 41–48.2", scored: 28, expected: 28 },
];

export const fow = [
  "1-22 (Crawley, 4.3 ov)",
  "2-71 (Duckett, 14.1 ov)",
  "3-108 (Pope, 22.4 ov)",
  "4-241 (Brook, 47.5 ov)",
];

export const lastOver = ["·", "1", "4", "1", "·", "2"];

export const matchups = [
  {
    id: "root-bumrah",
    title: "Root vs Bumrah",
    live: true,
    balls: 46,
    dismissals: "0 today · 6 in the career file",
    sr: "41",
    control: 81,
    insight: "Root has left 18 of 46 balls. Bumrah has not yet bowled the hip ball twice in one over. The duel is even, which counts as a win for the batter this morning.",
  },
  {
    id: "brook-jadeja",
    title: "Brook vs Jadeja",
    live: false,
    balls: 28,
    dismissals: "0 to Jadeja · Brook fell to Kuldeep",
    sr: "96",
    control: 74,
    insight: "While they were together, Jadeja went at 4.2 an over and did not look like taking the wicket. Brook still gave it away to the wrist spinner, charging before he had the length.",
  },
  {
    id: "stokes-kuldeep",
    title: "Stokes vs Kuldeep",
    live: true,
    balls: 6,
    dismissals: "The spell has just started",
    sr: "50",
    control: 67,
    insight: "This is the live battle. Stokes' dismissal risk against wrist spin is highest in the first fifteen balls. He has six of them behind him.",
  },
  {
    id: "bumrah-head",
    title: "Bumrah vs Head",
    live: false,
    balls: 82,
    dismissals: "7 from 11 meetings",
    sr: "87",
    control: 71,
    insight: "Not this match. The career file: Head's dismissal risk increases 48% within the first 15 balls. He plays the same fourth-ball slash, and Bumrah now waits for it.",
  },
];

export const fieldPlans = [
  {
    id: "bumrah-root",
    title: "Bumrah to Root",
    note: "A ring on the off side, a short leg for the glove, and no man on the hook. He wants the leave to get later.",
    markers: [
      { x: 62, y: 38, label: "Slip" },
      { x: 70, y: 46, label: "Gully" },
      { x: 38, y: 42, label: "Short leg" },
      { x: 28, y: 58, label: "Midwicket" },
      { x: 78, y: 62, label: "Cover" },
      { x: 50, y: 18, label: "Long off" },
    ],
  },
  {
    id: "jadeja-stokes",
    title: "Jadeja to Stokes",
    note: "Men in front of square on the leg side. The shot he wants is the one that goes in the air to deep midwicket.",
    markers: [
      { x: 40, y: 36, label: "Slip" },
      { x: 34, y: 48, label: "Short leg" },
      { x: 24, y: 40, label: "Midwicket" },
      { x: 22, y: 24, label: "Deep mid" },
      { x: 68, y: 55, label: "Cover" },
      { x: 58, y: 78, label: "Long on" },
    ],
  },
  {
    id: "kuldeep-stokes",
    title: "Kuldeep to Stokes",
    note: "A sweeper out and a man at 45. The wrong'un is the wicket ball if Stokes premeditates.",
    markers: [
      { x: 44, y: 34, label: "Slip" },
      { x: 30, y: 30, label: "45" },
      { x: 18, y: 48, label: "Sweeper" },
      { x: 72, y: 50, label: "Cover" },
      { x: 50, y: 82, label: "Long on" },
      { x: 63, y: 28, label: "Point" },
    ],
  },
];

export const simScript = [
  { over: "48.3", text: "Jadeja angles into Stokes. Defended on the front foot.", runs: 0, wickets: 0, swing: -1 },
  { over: "48.4", text: "Stokes skips and lofts over extra cover. Four. The field was in.", runs: 4, wickets: 0, swing: 2 },
  { over: "48.5", text: "A single into the gap. Root has the strike for Bumrah.", runs: 1, wickets: 0, swing: 0 },
  { over: "48.6", text: "Bumrah, hip ball. Root clips it off his pads. One.", runs: 1, wickets: 0, swing: 1 },
  { over: "49.1", text: "Bumrah to Stokes, short of a length. Left alone. The first fifteen balls are still open.", runs: 0, wickets: 0, swing: 0 },
  { over: "49.2", text: "Stokes drives and the edge dies in front of slip. The control number drops.", runs: 0, wickets: 0, swing: -3 },
  { over: "49.3", text: "Full and straight. Stokes digs out a yorker. No run. The spell is working.", runs: 0, wickets: 0, swing: -2 },
  { over: "49.4", text: "Width. Stokes cuts hard, in the air, and gully's hands close. Stokes is gone.", runs: 0, wickets: 1, swing: -8 },
];

export const initialMood: Record<"england" | "india", Record<MoodKey, number>> = {
  england: { fire: 56, clap: 22, shock: 9, cry: 7, rage: 6, mind: 0 },
  india: { fire: 16, clap: 9, shock: 18, cry: 24, rage: 28, mind: 5 },
};

export const roomSeed = [
  { id: "m1", author: "Tom H.", side: "England", emoji: "🔥", text: "Root masterclass today. He has taken Jadeja out of the game without a single loud shot.", time: "6m" },
  { id: "m2", author: "Priya N.", side: "India", emoji: "😡", text: "India need wickets now. Another ten overs of this and the lead is out of reach before the new ball.", time: "5m" },
  { id: "m3", author: "Lewis K.", side: "Neutral", emoji: "📊", text: "Momentum shifted in overs 22 to 30. That phase was 72 against an expected 48.", time: "4m" },
  { id: "m4", author: "Asha P.", side: "India", emoji: "😱", text: "Bumrah is still the over. If Gill takes him off, this room will not be polite about it.", time: "3m" },
  { id: "m5", author: "Jonah R.", side: "England", emoji: "👏", text: "Brook's 64 was the tempo. Root's 89 is the reason they are ahead of the model.", time: "2m" },
];

export const polls = [
  {
    id: "session",
    question: "Where is this match after the next session?",
    options: [
      { id: "eng", label: "England push past 340", votes: 240 },
      { id: "bowl", label: "India take three wickets", votes: 188 },
      { id: "rain", label: "Rain has the louder say", votes: 76 },
    ],
  },
  {
    id: "player",
    question: "Who decides the next hour?",
    options: [
      { id: "root", label: "Root, if he sees off Bumrah", votes: 310 },
      { id: "bumrah", label: "Bumrah, if he gets the spell he wants", votes: 274 },
      { id: "stokes", label: "Stokes against Kuldeep", votes: 142 },
    ],
  },
];

export const debateSeed = {
  id: "brook",
  title: "Can Brook become England's next great?",
  prompt: "The rate is already ahead of Root. The dismissals are not.",
  sides: [
    { id: "yes", label: "Yes. The ceiling is higher than Root's", votes: 128 },
    { id: "no", label: "No. Greatness is the ugly innings Root already plays", votes: 96 },
  ],
};

export const whatIfs = [
  {
    id: "bumrah",
    title: "Bumrah unavailable",
    detail: "He does not bowl the rest of the innings.",
    eng: 82,
    ind: 18,
    draw: 0,
    extra: "England expected score +61 runs",
    note: "India's control percentage falls with the spell. Siraj and Akash Deep have not threatened the set batter.",
  },
  {
    id: "root-out",
    title: "Root falls in the first over",
    detail: "The new session starts with a wicket, not a leave.",
    eng: 41,
    ind: 59,
    draw: 0,
    extra: "England expected score −28 runs",
    note: "The lower order is then batting against the bowler who has already taken two, with the ball still hard.",
  },
  {
    id: "rain",
    title: "Rain takes the last two sessions",
    detail: "The risk has already moved from 18% to 34%.",
    eng: 22,
    ind: 14,
    draw: 64,
    extra: "Draw becomes the leading outcome",
    note: "A shortened match saves India from bowling England out and saves England from batting last on whatever the surface becomes.",
  },
  {
    id: "new-ball",
    title: "The new ball takes two wickets",
    detail: "Two wickets inside six overs with the second new ball.",
    eng: 39,
    ind: 61,
    draw: 0,
    extra: "India bowl last on their terms",
    note: "This is Bumrah's spell plus one more. It is the path back into a match India are currently losing on expectancy.",
  },
  {
    id: "stokes-burst",
    title: "Stokes takes two with the ball",
    detail: "He bowls a four-over burst once India bat, and both ends produce a wicket.",
    eng: 64,
    ind: 36,
    draw: 0,
    extra: "England win chance +6 from here",
    note: "The workload file allows the burst. It does not allow a second one.",
  },
];

export const histories = [
  {
    id: "bumrah-1990s",
    title: "What if Bumrah played in the 1990s?",
    era: "1994 – 2001",
    paragraphs: [
      "The action would have looked illegal to eyes trained on a side-on action, and it would have been legal. The yorker, bowled at a release speed the decade rarely saw, arrives before the batter's weight can get forward.",
      "Reverse swing was already the away weapon. Bumrah's version does not need the ball to be a scrap. He creates the angle with the wrist. In a decade of uncovered stories and thinner batting orders, the model gives him a Test average of 16.4 and a career that bends two World Cups.",
      "The cost is the same as now, only diagnosed more slowly. A 1990s board bowls him into the ground by 2002. The peak is brighter and shorter.",
    ],
    figures: [
      { label: "Modelled Test average", value: "16.4" },
      { label: "Five-wicket hauls", value: "31" },
      { label: "Peak ended", value: "2002" },
    ],
  },
  {
    id: "brook-2012",
    title: "What if Brook debuted in 2012?",
    era: "Beside Cook, not Stokes",
    paragraphs: [
      "A 2012 England side would have asked him to bat time. He would have refused, and the first two years would have been a fight about method rather than a run of hundreds.",
      "The model still has the talent clearing that fight. It does not have him matching Root's accumulation, because the pitches and the fields of that era punish the early charge more often than they do now.",
      "He becomes a very good England batter. He does not become the tempo of a whole team, because the team does not want a tempo.",
    ],
    figures: [
      { label: "Career average", value: "46" },
      { label: "Chance of 10,000", value: "41%" },
      { label: "Captaincy", value: "Unlikely" },
    ],
  },
  {
    id: "kohli-captain",
    title: "What if Kohli kept the captaincy?",
    era: "Through 2024",
    paragraphs: [
      "The batting does not collapse. The fields get braver, and the bowlers he trusts bowl more overs than their bodies preferred. Bumrah's workload file gets worse, not better.",
      "Results away from home stay strong for a year and then thin out, because the captain is still batting at four and still fielding at slip and still talking in the bowling meeting.",
      "The Twin's chase pattern does not change. The captaincy was never the source of it. The cost is years, not method.",
    ],
    figures: [
      { label: "Extra wins", value: "+4" },
      { label: "Bumrah overs", value: "Up 11%" },
      { label: "Retirement", value: "A year earlier" },
    ],
  },
];

export const aiXi = [
  { id: "yashasvi-jaiswal", name: "Y. Jaiswal", role: "Opener", reason: "He has already taken a catch and he bats in the top order when India reply. Runs plus a live involvement." },
  { id: "ben-duckett", name: "B. Duckett", role: "Opener", reason: "41 off 36 is a finished innings with a high rate. The points are banked." },
  { id: "harry-brook", name: "H. Brook", role: "Batter", reason: "64 with a six. The innings is over, so he is a points pick, not a live one." },
  { id: "joe-root", name: "J. Root", role: "Batter", reason: "89 not out, 21 runs ahead of the match model, and the milestone chase keeps him batting time." },
  { id: "virat-kohli", name: "V. Kohli", role: "Batter", reason: "Yet to bat. If England post 340 he gets a first innings with the game still shaped." },
  { id: "ben-stokes", name: "B. Stokes", role: "All-rounder", reason: "Live at the crease, and a four-over bowling burst is still in the file." },
  { id: "rishabh-pant", name: "R. Pant", role: "Keeper", reason: "The only keeper who also threatens a fifty. He has Brook's catch." },
  { id: "ravindra-jadeja", name: "R. Jadeja", role: "All-rounder", reason: "A wicket, and lower-order runs if India bat before the rain." },
  { id: "jasprit-bumrah", name: "J. Bumrah", role: "Bowler", reason: "Two wickets and the spell that can still take two more. Must-start, even on a managed workload." },
  { id: "kuldeep-yadav", name: "K. Yadav", role: "Bowler", reason: "He has the wicket that ended the stand. Stokes is the next over." },
  { id: "shoib-bashir", name: "S. Bashir", role: "Bowler", reason: "The safe last slot if England bowl on day three. Potts is the braver one." },
];

export const pottsPick = {
  id: "matthew-potts",
  name: "M. Potts",
  role: "Bowler",
  reason: "Ownership 4%. If England bat once he bowls into footmarks on day three. Expected return 61 points.",
  ownership: "4%",
  points: 61,
};

export const captains = [
  { id: "joe-root", name: "Joe Root", confidence: 93, note: "The floor is the highest on the board. He is not out, and he is already 21 runs ahead of the model." },
  { id: "jasprit-bumrah", name: "Jasprit Bumrah", confidence: 66, note: "The ceiling if he bowls a second spell and takes two more. Workload can cap the upside." },
  { id: "ravindra-jadeja", name: "Ravindra Jadeja", confidence: 64, note: "A wicket is in, but Root has taken the stock ball away from him." },
  { id: "harry-brook", name: "Harry Brook", confidence: 48, note: "The 64 is banked. There is no second innings in this round to captain." },
];

export const injuries = [
  { id: "woakes", player: "Chris Woakes", issue: "Calf tightness", impact: "Availability 40%. He does not start. The third seamer is Potts or Atkinson.", severity: "High" as const },
  { id: "bumrah", player: "Jasprit Bumrah", issue: "Spell cap", impact: "Still a must-start. If he is held to eight more overs, India's wicket share drops.", severity: "Watch" as const },
  { id: "stokes", player: "Ben Stokes", issue: "Bowling load", impact: "Batting value is intact. The ball is a burst of four overs, not a stock spell.", severity: "Watch" as const },
];

export const draftPool = [
  { id: "zak-crawley", name: "Zak Crawley", role: "Batter" as const, side: "ENG" },
  { id: "ben-duckett", name: "Ben Duckett", role: "Batter" as const, side: "ENG" },
  { id: "ollie-pope", name: "Ollie Pope", role: "Batter" as const, side: "ENG" },
  { id: "joe-root", name: "Joe Root", role: "Batter" as const, side: "ENG" },
  { id: "harry-brook", name: "Harry Brook", role: "Batter" as const, side: "ENG" },
  { id: "ben-stokes", name: "Ben Stokes", role: "All-rounder" as const, side: "ENG" },
  { id: "jamie-smith", name: "Jamie Smith", role: "Keeper" as const, side: "ENG" },
  { id: "matthew-potts", name: "Matthew Potts", role: "Bowler" as const, side: "ENG" },
  { id: "yashasvi-jaiswal", name: "Yashasvi Jaiswal", role: "Batter" as const, side: "IND" },
  { id: "shubman-gill", name: "Shubman Gill", role: "Batter" as const, side: "IND" },
  { id: "virat-kohli", name: "Virat Kohli", role: "Batter" as const, side: "IND" },
  { id: "rishabh-pant", name: "Rishabh Pant", role: "Keeper" as const, side: "IND" },
  { id: "ravindra-jadeja", name: "Ravindra Jadeja", role: "All-rounder" as const, side: "IND" },
  { id: "jasprit-bumrah", name: "Jasprit Bumrah", role: "Bowler" as const, side: "IND" },
  { id: "kuldeep-yadav", name: "Kuldeep Yadav", role: "Bowler" as const, side: "IND" },
  { id: "mohammed-siraj", name: "Mohammed Siraj", role: "Bowler" as const, side: "IND" },
];

export function getPlayer(id: string) {
  return players.find((player) => player.id === id);
}

export function getTeam(id: string) {
  return teams.find((team) => team.id === id);
}

export function teamLabel(id: string) {
  if (id === "sri-lanka") return "Sri Lanka";
  if (id === "pakistan") return "Pakistan";
  return getTeam(id)?.name ?? id;
}

export const onboardingPlayers = [
  "joe-root",
  "harry-brook",
  "ben-stokes",
  "jasprit-bumrah",
  "virat-kohli",
  "babar-azam",
  "kane-williamson",
  "travis-head",
];

export const onboardingTeams = ["england", "india", "australia", "new-zealand"] as const;

export const baseWin = { eng: 58, ind: 42 };
