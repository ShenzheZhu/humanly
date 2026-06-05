#!/usr/bin/env node

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "..");
const SEED_DIR = path.join(DATA_DIR, "texts", "seeds");
const MANIFEST_PATH = path.join(DATA_DIR, "human-seeds.csv");

const USER_AGENT = "humanly-research-seed-collector/0.2";

const REDDIT_SHORT_POSTS = [
  {
    seed_id: "short_reddit_finished_first_novel_2014_001",
    source_id: "t3_2mmh3m",
    source_url:
      "https://old.reddit.com/r/writing/comments/2mmh3m/today_at_909pm_november_17th_i_finished_the_first/",
    source_title:
      "Today, at 9:09PM, November 17th, I finished the first draft of my first novel. I'm fourteen, it's unreadable crap, but I couldn't be any prouder. Any advice?",
    author_or_signature: "u/TheSlurpeeKid",
    created_utc: "2014-11-18T02:23:12Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about finishing a first novel draft.",
  },
  {
    seed_id: "short_reddit_writing_worst_draft_post_2015_002",
    source_id: "t3_3j41t2",
    source_url:
      "https://old.reddit.com/r/writing/comments/3j41t2/i_created_writing_software_for_writers_its_free/",
    source_title:
      "I created writing software for writers. It's free and I hope it helps you.",
    author_or_signature: "u/CAPTAINLOCKS",
    created_utc: "2015-08-31T18:00:00Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about first-draft tools and editing constraints.",
  },
  {
    seed_id: "short_reddit_learning_writing_creativity_2013_003",
    source_id: "t3_1lz6vo",
    source_url:
      "https://old.reddit.com/r/writing/comments/1lz6vo/learning_about_writing_has_killed_my_creativity/",
    source_title: "Learning about writing has killed my creativity",
    author_or_signature: "u/iAesc",
    created_utc: "2013-09-08T16:34:05Z",
    inclusion_notes:
      "Pre-2017 reflective social-media self-post about creative writing education.",
  },
  {
    seed_id: "short_reddit_twenty_thousand_words_2016_004",
    source_id: "t3_5htqjb",
    source_url:
      "https://old.reddit.com/r/writing/comments/5htqjb/just_got_to_20000_words_couldnt_be_happier/",
    source_title: "Just got to 20,000 words, couldn't be happier.",
    author_or_signature: "u/inkwatanabe",
    created_utc: "2016-12-12T01:18:57Z",
    inclusion_notes:
      "Pre-2017 social-media self-post celebrating writing progress.",
  },
  {
    seed_id: "short_reddit_started_actually_writing_2016_005",
    source_id: "t3_4jojid",
    source_url:
      "https://old.reddit.com/r/writing/comments/4jojid/how_i_started_actually_writing_i_shelved_my/",
    source_title:
      'How I started actually writing: I shelved my ambitious "masterpiece" project, and wrote fanfic based on derpy video game placeholder lore.',
    author_or_signature: "u/CupcakeTrap",
    created_utc: "2016-05-17T01:41:20Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about changing writing strategy.",
  },
  {
    seed_id: "short_reddit_novel_done_2016_006",
    source_id: "t3_5gfhi3",
    source_url:
      "https://old.reddit.com/r/writing/comments/5gfhi3/i_need_a_moment_to_celebrate_after_three_years/",
    source_title:
      "I need a moment to celebrate! After three years and many rounds of revisions, my novel is DONE!!!",
    author_or_signature: "u/AriesWolf3",
    created_utc: "2016-12-04T13:49:28Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about finishing a revised novel.",
  },
  {
    seed_id: "short_reddit_received_offer_2016_007",
    source_id: "t3_541hpx",
    source_url:
      "https://old.reddit.com/r/writing/comments/541hpx/i_just_received_an_offer/",
    source_title: "I just received an offer!",
    author_or_signature: "u/ajaxsinger",
    created_utc: "2016-09-22T22:02:13Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about receiving a publishing offer.",
  },
  {
    seed_id: "short_reddit_plot_conspiracies_2015_008",
    source_id: "t3_393pc3",
    source_url:
      "https://old.reddit.com/r/writing/comments/393pc3/this_may_sound_weird_but_looking_at_my_plot_as_if/",
    source_title:
      "This may sound weird, but looking at my plot as if I was a fan trying to make weird conspiracies actually overturned a goldmine and I would recommend the exercise to anyone.",
    author_or_signature: "u/Maiesk",
    created_utc: "2015-06-09T01:08:17Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about a writing exercise.",
  },
  {
    seed_id: "short_reddit_barely_writing_2016_009",
    source_id: "t3_4ymq0f",
    source_url:
      "https://old.reddit.com/r/writing/comments/4ymq0f/after_barely_writing_at_all_for_2_years_ive/",
    source_title:
      "After barely writing at all for 2 years, I've written 30,920 words since Tuesday afternoon.",
    author_or_signature: "u/sorahart",
    created_utc: "2016-08-20T02:15:26Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about restarting a writing habit.",
  },
  {
    seed_id: "short_reddit_self_published_table_tennis_2016_010",
    source_id: "t3_51wjbf",
    source_url:
      "https://old.reddit.com/r/writing/comments/51wjbf/i_selfpublished_a_nonfiction_book_about_table/",
    source_title:
      "I self-published a non-fiction book about table tennis a year ago. It was #1 in its category on Amazon for most of that year and made a total of about $4,000",
    author_or_signature: "u/arbingsam",
    created_utc: "2016-09-09T09:27:10Z",
    inclusion_notes:
      "Pre-2017 social-media self-post about self-publishing a nonfiction book.",
  },
];

const WIKIVERSITY_MEDIUM_PAGES = [
  {
    seed_id: "medium_wikiversity_mindsets_2016_001",
    oldid: "1631194",
    source_title:
      "Motivation and emotion/Book/2016/Mindsets and motivation",
    created_utc: "2016-11-15T03:08:34Z",
  },
  {
    seed_id: "medium_wikiversity_stress_recovery_theory_2016_002",
    oldid: "1633492",
    source_title:
      "Motivation and emotion/Book/2016/Stress recovery theory",
    created_utc: "2016-11-21T01:38:31Z",
  },
  {
    seed_id: "medium_wikiversity_motivational_interviewing_2016_003",
    oldid: "1632684",
    source_title:
      "Motivation and emotion/Book/2016/Motivational interviewing",
    created_utc: "2016-11-19T08:20:09Z",
  },
  {
    seed_id: "medium_wikiversity_anorexia_extrinsic_motivation_2016_004",
    oldid: "1637178",
    source_title:
      "Motivation and emotion/Book/2016/Anorexia nervosa and extrinsic motivation",
    created_utc: "2016-12-02T05:03:18Z",
  },
  {
    seed_id: "medium_wikiversity_public_speaking_anxiety_2016_005",
    oldid: "1636983",
    source_title:
      "Motivation and emotion/Book/2016/Public speaking anxiety",
    created_utc: "2016-12-01T23:33:45Z",
  },
  {
    seed_id: "medium_wikiversity_grit_2016_006",
    oldid: "1636778",
    source_title: "Motivation and emotion/Book/2016/Grit",
    created_utc: "2016-12-01T11:52:54Z",
  },
  {
    seed_id: "medium_wikiversity_online_shopping_2016_007",
    oldid: "1637174",
    source_title:
      "Motivation and emotion/Book/2016/Online shopping motivation",
    created_utc: "2016-12-02T04:56:00Z",
  },
  {
    seed_id: "medium_wikiversity_broaden_build_2016_008",
    oldid: "1630905",
    source_title:
      "Motivation and emotion/Book/2016/Broaden-and-build theory of positive emotions",
    created_utc: "2016-11-14T08:04:36Z",
  },
  {
    seed_id: "medium_wikiversity_affective_forecasting_2016_009",
    oldid: "1635663",
    source_title:
      "Motivation and emotion/Book/2016/Affective forecasting",
    created_utc: "2016-11-27T22:18:00Z",
  },
  {
    seed_id: "medium_wikiversity_long_term_goal_2016_010",
    oldid: "1632079",
    source_title:
      "Motivation and emotion/Book/2016/Long-term goal achievement",
    created_utc: "2016-11-17T02:13:00Z",
  },
];

const OPENREVIEW_LONG_REVIEWS = [
  {
    seed_id: "long_openreview_iclr2017_video_sequences_review_001",
    forum: "HkxAAvcxx",
    review_id: "SJE7-lkVx",
  },
  {
    seed_id: "long_openreview_iclr2017_neural_combinatorial_review_002",
    forum: "rJY3vK9eg",
    review_id: "H1SVk-MVx",
  },
  {
    seed_id: "long_openreview_iclr2017_compositional_kernels_review_003",
    forum: "S1Bm3T_lg",
    review_id: "H1CUmANre",
  },
  {
    seed_id: "long_openreview_iclr2017_love_advice_review_004",
    forum: "ryQbbFile",
    review_id: "S1k0SOI4x",
  },
  {
    seed_id: "long_openreview_iclr2017_translation_refinement_review_005",
    forum: "r1y1aawlg",
    review_id: "ByFt_PmSl",
  },
  {
    seed_id: "long_openreview_iclr2017_tictactoe_review_006",
    forum: "rJo9n9Feg",
    review_id: "BkXHxhEEe",
  },
  {
    seed_id: "long_openreview_iclr2017_video_attention_review_007",
    forum: "SkJeEtclx",
    review_id: "Hk8khIG4l",
  },
  {
    seed_id: "long_openreview_iclr2017_expressive_power_review_008",
    forum: "B1TTpYKgx",
    review_id: "rJRzy9B4l",
  },
  {
    seed_id: "long_openreview_iclr2017_infusion_training_review_009",
    forum: "BJAFbaolg",
    review_id: "H1PYkpbEx",
  },
  {
    seed_id: "long_openreview_iclr2017_hypernetworks_review_010",
    forum: "rkpACe1lx",
    review_id: "SJVe59xVx",
  },
];

function wordCount(text) {
  return (text.match(/\b[\w’'-]+\b/g) || []).length;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#32;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function fetchText(url, accept = "text/html,application/json,text/plain,*/*") {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: accept,
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status}`);
  }
  return response.text();
}

function extractOldRedditThing(html, fullname) {
  const marker = `id="thing_${fullname}"`;
  const startIndex = html.indexOf(marker);
  if (startIndex < 0) {
    throw new Error(`Could not find Reddit thing ${fullname}`);
  }

  const segment = html.slice(startIndex, startIndex + 30000);
  const bodyIndex = segment.indexOf("usertext-body");
  const bodySegment = segment.slice(bodyIndex);
  const markdownStart = bodySegment.indexOf('<div class="md">');
  const markdownSegment = bodySegment.slice(markdownStart);
  const markdownEnd = markdownSegment.indexOf("</div>\n</div></form>");
  if (markdownStart < 0 || markdownEnd < 0) {
    throw new Error(`Could not extract Reddit markdown for ${fullname}`);
  }

  return decodeHtml(markdownSegment.slice(0, markdownEnd));
}

function cleanWikitext(text) {
  return text
    .replace(/^==+\s*(.*?)\s*==+$/gm, "$1")
    .replace(/\{\|[\s\S]*?\|\}/g, "")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/\[\[File:[^\n]*\]\]/g, "")
    .replace(/\[\[w:([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/''+/g, "")
    .replace(/^\*.*$/gm, "")
    .replace(/\nb\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncateToWordRange(text, minWords, maxWords) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const selected = [];
  for (const paragraph of paragraphs) {
    if (wordCount([...selected, paragraph].join("\n\n")) > maxWords) {
      break;
    }
    selected.push(paragraph);
    if (wordCount(selected.join("\n\n")) >= minWords) {
      break;
    }
  }

  return selected.length ? selected.join("\n\n") : text;
}

function extractWikiversityExcerpt(wikitext) {
  const sections = [...wikitext.matchAll(/^==([^=].*?)==$/gm)].map((match) => ({
    name: match[1].trim(),
    index: match.index,
  }));
  const start = sections[0]?.index ?? 0;
  const referencesIndex = sections.findIndex((section) =>
    /^(references|external links|see also|quiz)$/i.test(section.name),
  );
  const end =
    referencesIndex > 0
      ? sections[referencesIndex].index
      : Math.min(wikitext.length, start + 9000);
  const cleaned = cleanWikitext(wikitext.slice(start, end));
  return truncateToWordRange(cleaned, 400, 650);
}

async function collectRedditShortSeeds() {
  const seeds = [];
  for (const config of REDDIT_SHORT_POSTS) {
    const html = await fetchText(config.source_url, "text/html");
    const text = extractOldRedditThing(html, config.source_id);
    seeds.push({
      ...config,
      length_bucket: "short",
      task_type: "social_media_post",
      source_platform: "Reddit",
      license_notes:
        "Public Reddit self-post; redistribution/licensing should be reviewed before public release.",
      text,
    });
    await delay(400);
  }
  return seeds;
}

async function collectWikiversityMediumSeeds() {
  const seeds = [];
  for (const config of WIKIVERSITY_MEDIUM_PAGES) {
    const source_url = `https://en.wikiversity.org/w/index.php?oldid=${config.oldid}`;
    const raw_url = `${source_url}&action=raw`;
    const wikitext = await fetchText(raw_url, "text/plain");
    const text = extractWikiversityExcerpt(wikitext);
    seeds.push({
      ...config,
      length_bucket: "medium",
      task_type: "student_assignment_response",
      source_platform: "Wikiversity",
      source_url,
      source_id: `oldid=${config.oldid}`,
      author_or_signature: "Wikiversity contributors",
      license_notes:
        "Wikiversity text is available under CC BY-SA; attribution/share-alike requirements apply.",
      inclusion_notes:
        "Pre-2017 undergraduate course-writing excerpt; wiki markup, references, and templates removed without polishing the prose.",
      text,
    });
    await delay(400);
  }
  return seeds;
}

async function collectOpenReviewLongSeeds() {
  const seeds = [];
  for (const config of OPENREVIEW_LONG_REVIEWS) {
    const url = `https://api.openreview.net/notes?forum=${config.forum}`;
    const json = JSON.parse(await fetchText(url, "application/json"));
    const review = json.notes.find((note) => note.id === config.review_id);
    const submission = json.notes.find((note) => note.id === config.forum);
    if (!review?.content?.review) {
      throw new Error(`Could not find OpenReview review ${config.review_id}`);
    }

    seeds.push({
      seed_id: config.seed_id,
      length_bucket: "long",
      task_type: "paper_review",
      source_platform: "OpenReview",
      source_url: `https://openreview.net/forum?id=${config.forum}&noteId=${config.review_id}`,
      source_id: config.review_id,
      source_title: submission?.content?.title || "",
      author_or_signature:
        (review.signatures || []).join("; ") || "ICLR 2017 anonymous reviewer",
      created_utc: new Date(review.tcdate).toISOString(),
      license_notes:
        "Public ICLR 2017 OpenReview official review; redistribution/licensing should be reviewed before public release.",
      inclusion_notes:
        "ICLR 2017 official review selected because it is a long peer-review-style human seed in the target long bucket.",
      text: review.content.review.trim(),
    });
    await delay(400);
  }
  return seeds;
}

async function cleanSeedDirectory() {
  await mkdir(SEED_DIR, { recursive: true });
  for (const entry of await readdir(SEED_DIR)) {
    if (entry.endsWith(".txt")) {
      await unlink(path.join(SEED_DIR, entry));
    }
  }
}

async function main() {
  await cleanSeedDirectory();

  const seeds = [
    ...(await collectRedditShortSeeds()),
    ...(await collectWikiversityMediumSeeds()),
    ...(await collectOpenReviewLongSeeds()),
  ];

  for (const seed of seeds) {
    seed.word_count = wordCount(seed.text);
    seed.cleaned_text_path = `texts/seeds/${seed.seed_id}.txt`;
    await writeFile(path.join(DATA_DIR, seed.cleaned_text_path), `${seed.text}\n`);
  }

  const columns = [
    "seed_id",
    "length_bucket",
    "task_type",
    "source_platform",
    "source_url",
    "source_id",
    "source_title",
    "author_or_signature",
    "created_utc",
    "license_notes",
    "word_count",
    "cleaned_text_path",
    "inclusion_notes",
  ];

  const csv = [
    columns.join(","),
    ...seeds.map((seed) =>
      columns.map((column) => csvEscape(seed[column])).join(","),
    ),
  ].join("\n");

  await writeFile(MANIFEST_PATH, `${csv}\n`);

  const counts = seeds.reduce((acc, seed) => {
    acc[seed.length_bucket] = (acc[seed.length_bucket] || 0) + 1;
    return acc;
  }, {});

  for (const seed of seeds) {
    console.log(
      `${seed.seed_id}: ${seed.word_count} words -> ${seed.cleaned_text_path}`,
    );
  }
  console.log(`seed counts: ${JSON.stringify(counts)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
