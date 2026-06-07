import "dotenv/config";
import fs from "fs";
import path from "path";
import { Article } from "../src/types";

const ARTICLES_FILE = path.join(process.cwd(), "src/data/articles.json");
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Load articles
function loadArticles(): Article[] {
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, "utf-8");
      return JSON.parse(data) as Article[];
    }
  } catch (error) {
    console.error("Error loading articles:", error);
  }
  return [];
}

// Save articles
function saveArticles(articles: Article[]) {
  try {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), "utf-8");
    console.log(`Successfully saved ${articles.length} articles to ${ARTICLES_FILE}`);
  } catch (error) {
    console.error("Error saving articles:", error);
  }
}

async function generate() {
  const articles = loadArticles();
  if (articles.length === 0) {
    console.error("No base articles found. Please ensure articles.json has initial data.");
    process.exit(1);
  }

  // Determine next level (cycle 1-5 based on the latest article)
  const latestArticle = articles[0];
  const nextLevel = ((latestArticle.level % 5) + 1) as Article["level"];
  console.log(`Generating article for Level ${nextLevel}`);

  const levelNamesMap: Record<number, string> = {
    1: "Level 1: Absolute Beginner",
    2: "Level 2: Basic Words & Short Requests",
    3: "Level 3: Intermediate Sentences & Desires",
    4: "Level 4: Upper-Intermediate Business & Conditional logic",
    5: "Level 5: Advanced Aesthetics & Philosophical Nuance"
  };

  const timeOfDayMap: Record<number, string> = {
    1: "Morning",
    2: "Late-Morning",
    3: "Afternoon",
    4: "Evening",
    5: "Night"
  };

  const publishedAtMap: Record<number, string> = {
    1: "07:00",
    2: "11:30",
    3: "15:00",
    4: "19:00",
    5: "22:00"
  };

  const targetTime = timeOfDayMap[nextLevel];
  const publishedAt = publishedAtMap[nextLevel];
  const levelName = levelNamesMap[nextLevel];

  // Pick a random topic hint to inspire Hugging Face model
  const topicsPool = [
    "ordering coffee and custom requests at a cafe",
    "asking for directions in a subway station",
    "shopping for souvenirs and asking for prices in Kyoto",
    "making polite business requests at a corporate meeting",
    "understanding local dining etiquette and ordering seasonal dishes",
    "buying tickets for an express train or shinkansen",
    "checking into a traditional ryokan inn and dining rules",
    "casual conversations with friends at an izakaya",
    "expressing seasonal changes and weather greetings in letters",
    "discussing travel schedules and vacation wishes",
    "philosophical terms like wabi-sabi, mono no aware, or yugen",
    "congratulating colleagues and offering toast expressions",
    "expressing urgency or requesting assistance during unexpected events",
    "describing household items and local daily routines"
  ];
  const topicHint = topicsPool[Math.floor(Math.random() * topicsPool.length)];

  const hfToken = process.env.HF_API_KEY || process.env.HF_TOKEN;
  if (!hfToken) {
    console.error("Error: HF_TOKEN or HF_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const prompt = `Create a high-quality Japanese language learning article optimized for English speakers.
Level: Level ${nextLevel} (${levelName}).
Theme/Topic hint: ${topicHint}
Time of Day Update slotted at: ${targetTime} (usually, Morning is Level 1, Late-Morning is Level 2, Afternoon is level 3, Evening is Level 4, Night is Level 5).

Make the byline very professional, like a real British Newspaper desk (e.g., 'By Kenji Sato, Tokyo Bureau' or 'By Emma Sterling, Culture Desk').
Create an interesting Story/Introduction (introduction) in English with occasional Japanese quotes.
Provide general Grammar Analysis in prose.
Create EXACTLY 2 Japanese vocabulary cards (postIts) in details following the PostItData schema:
Each postIt should have:
- id: a unique string ID (e.g. "p" + unique random string or timestamp)
- color: yellow, pink, blue, or green
- title: string (e.g. "Vocabulary: 今日")
- japanese: string (authentic Japanese)
- kana: string (correct reading)
- romaji: string (how to pronounce)
- english: string (English equivalent)
- explanation: string (bilingual note)
- exampleJp: string (authentic, corrected example)
- exampleEn: string (natural English translation)
- tip: optional pronunciation/usage tip

Create a culturalInsight (newspaper style editorial column).
Create a multiple choice quiz (1 quiz question) with 4 options, a correct answerIndex, and a helpful explanation.
Create a highly relevant, descriptive image generation prompt (this will be used to call Hugging Face) and put it under a field called "imagePrompt".
Provide a standard meta description (description) for SEO and a JSON stringified Schema markup (schemaMarkup) matching schema.org, representing either Article, HowTo, or ScholarlyArticle.

Ensure that there are absolutely zero spelling mistakes, typo slips, or mojibake (character issues). Translate properly.

JSON Structure Schema Required:
{
  "id": "e.g. level${nextLevel}-unique-slug-${Date.now()}",
  "title": "A beautiful catchy newspaper title",
  "subtitle": "An elegant editorial subtitle",
  "level": ${nextLevel},
  "levelName": "${levelName}",
  "timeOfDay": "${targetTime}",
  "publishedAt": "${publishedAt}",
  "description": "SEO description",
  "byline": "By ...",
  "introduction": "English newspaper-like prose...",
  "grammarExplanation": "Grammar details...",
  "postIts": [ ...Post-it notes array... ],
  "culturalInsight": "A cultural sidebar...",
  "quiz": { ...Quiz definition... },
  "schemaMarkup": "Stringified JSON-LD",
  "imagePrompt": "A detailed artistic image prompt (e.g., 'A vintage monochrome illustration of a sushi chef in Tokyo')"
}
`;

  console.log("Calling Hugging Face Inference API for text generation...");
  const textRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [
        {
          role: "system",
          content: "You are a professional educational publisher. Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no code block backticks (do not wrap in ```json), just raw JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!textRes.ok) {
    const errorText = await textRes.text();
    throw new Error(`Hugging Face Text API returned status ${textRes.status}: ${errorText}`);
  }

  const textData = await textRes.json();
  const textOutput = textData.choices?.[0]?.message?.content?.trim();
  if (!textOutput) {
    throw new Error("Hugging Face API returned an empty text completion.");
  }

  // Clean up code block formatting if LLM includes it
  const cleanedJson = textOutput.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  const parsedArticle = JSON.parse(cleanedJson) as Article & { imagePrompt?: string };

  if (!parsedArticle.id || !parsedArticle.title) {
    throw new Error("AI returned an invalid article structure.");
  }

  // Ensure unique ID with timestamp
  const originalId = parsedArticle.id;
  parsedArticle.id = `${originalId.split("-").slice(0, 4).join("-")}-${Date.now()}`;

  // Call Hugging Face API to generate image
  const imagePrompt = parsedArticle.imagePrompt || `Vintage British newspaper illustration of ${topicHint}`;
  let imageSavedPath = "";

  try {
    console.log(`Calling Hugging Face API (FLUX.1-schnell) for prompt: "${imagePrompt}"...`);
    const hfRes = await fetch("https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: `${imagePrompt}, vintage styled newspaper print illustration, monochrome charcoal engraving` }),
    });

    if (hfRes.ok) {
      const buffer = await hfRes.arrayBuffer();
      const fileName = `${parsedArticle.id}.jpg`;
      const localPath = path.join(IMAGES_DIR, fileName);
      fs.writeFileSync(localPath, Buffer.from(buffer));
      imageSavedPath = `/images/${fileName}`;
      console.log(`Saved Hugging Face image to: ${localPath}`);
    } else {
      console.warn("Hugging Face API returned non-200 status:", hfRes.status, hfRes.statusText);
    }
  } catch (err) {
    console.error("Hugging Face API execution failed:", err);
  }

  // Fallback to Unsplash if image wasn't saved
  if (!imageSavedPath) {
    const fallbackThemes: Record<number, string> = {
      1: "tokyo-morning",
      2: "japanese-food",
      3: "kyoto-temple",
      4: "tokyo-nightlife",
      5: "zen-garden"
    };
    const themeWord = topicHint ? encodeURIComponent(topicHint.split(" ")[0]) : fallbackThemes[nextLevel];
    parsedArticle.thumbnailUrl = `https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=800&keyword=${themeWord}`;
    parsedArticle.thumbnailAlt = imagePrompt;
    console.log("Fallback Unsplash URL assigned:", parsedArticle.thumbnailUrl);
  } else {
    parsedArticle.thumbnailUrl = imageSavedPath;
    parsedArticle.thumbnailAlt = imagePrompt;
  }

  parsedArticle.isVerified = true;

  // Add to the beginning of the articles list
  articles.unshift(parsedArticle);
  saveArticles(articles);
  console.log("Article auto-generation successfully completed!");
}

generate().catch((err) => {
  console.error("Auto generation failed:", err);
  process.exit(1);
});
