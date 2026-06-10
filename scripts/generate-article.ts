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

// Fallback LLM Models on Hugging Face Serverless (via router.huggingface.co)
const LLM_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.3",
  "HuggingFaceH4/zephyr-7b-beta",
  "microsoft/Phi-3-mini-128k-instruct",
  "google/gemma-2-2b-it"
];

const FLUX_MODEL = "black-forest-labs/FLUX.1-schnell";
const HF_IMAGE_URL = (model: string) => `https://router.huggingface.co/hf-inference/models/${model}`;

async function callLLM(prompt: string, colabUrl: string): Promise<any> {
  const systemInstruction = "You are a professional educational publisher. Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no code block backticks (do not wrap in ```json), just raw JSON.";
  colabUrl = colabUrl.replace(/\/$/, '');

  console.log(`🤖 Using Colab LLM...`);
  
  const response = await fetch(`${colabUrl}/generate/text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_prompt: systemInstruction,
      user_prompt: prompt
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const data: any = await response.json();
  const content = data.result;
  if (!content) {
    throw new Error("Empty content returned from model.");
  }

  // Robust JSON extraction
  let jsonText = content.trim();
  const jsonStart = jsonText.indexOf('{');
  const jsonEnd = jsonText.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
  }
  return JSON.parse(jsonText);
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

  let colabUrl = process.argv[2] && (process.argv[2].startsWith("http://") || process.argv[2].startsWith("https://"))
    ? process.argv[2]
    : process.env.COLAB_API_URL;

  if (colabUrl) {
    colabUrl = colabUrl.replace(/\/$/, '');
  }

  if (!colabUrl) {
    console.error("Error: COLAB_API_URL is not provided via command line argument or environment variable.");
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

  console.log("Calling Colab API for text generation...");
  let parsedArticle: any;
  try {
    parsedArticle = await callLLM(prompt, colabUrl);
    if (!parsedArticle || !parsedArticle.id || !parsedArticle.title) {
      throw new Error("AI returned an invalid article structure.");
    }
  } catch (error: any) {
    console.warn("⚠️ Hugging Face LLM generation failed. Using local fallback templates...");
    console.warn(`   Reason: ${error.message || error}`);
    
    // Load local templates
    const templatesPath = path.join(process.cwd(), "scripts/fallback-templates.json");
    if (!fs.existsSync(templatesPath)) {
      throw new Error(`Fallback templates file missing at: ${templatesPath}`);
    }
    
    const templatesData = JSON.parse(fs.readFileSync(templatesPath, "utf-8"));
    const templatesForLevel = templatesData[String(nextLevel)];
    
    if (!templatesForLevel || templatesForLevel.length === 0) {
      throw new Error(`No fallback templates found for Level ${nextLevel}`);
    }
    
    // Pick a template randomly from the available ones
    const selectedTemplate = templatesForLevel[Math.floor(Math.random() * templatesForLevel.length)];
    
    // Clone template so we don't mutate shared references
    parsedArticle = JSON.parse(JSON.stringify(selectedTemplate));
  }

  // Ensure dynamic attributes are synchronized with execution state
  parsedArticle.level = nextLevel;
  parsedArticle.levelName = levelName;
  parsedArticle.timeOfDay = targetTime;
  parsedArticle.publishedAt = publishedAt;

  // Ensure unique ID with timestamp
  const originalId = parsedArticle.id;
  parsedArticle.id = `${originalId.split("-").slice(0, 4).join("-")}-${Date.now()}`;

  // Call Image Generation APIs (Hugging Face -> Pollinations AI -> AI Horde as fallback)
  const imagePrompt = parsedArticle.imagePrompt || `Vintage British newspaper illustration of ${topicHint}`;
  const promptFull = `${imagePrompt}, vintage styled newspaper print illustration, monochrome charcoal engraving`;
  let imageSavedPath = "";

  // 1. Try Colab API Stable Diffusion
  try {
    console.log(`Calling Colab Stable Diffusion for prompt: "${imagePrompt}"...`);
    const colabRes = await fetch(`${colabUrl}/generate/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: promptFull, width: 512, height: 512 }),
    });

    if (colabRes.ok) {
      const resJson: any = await colabRes.json();
      const base64Str = resJson.image_base64;
      if (base64Str) {
        const fileName = `${parsedArticle.id}.jpg`;
        const localPath = path.join(IMAGES_DIR, fileName);
        fs.writeFileSync(localPath, Buffer.from(base64Str, 'base64'));
        imageSavedPath = `/images/${fileName}`;
        console.log(`Saved Colab image to: ${localPath}`);
      }
    } else {
      console.warn("Colab Image API returned non-200 status:", colabRes.status, colabRes.statusText);
    }
  } catch (err) {
    console.error("Colab Image API execution failed:", err);
  }

  // 2. Try Pollinations AI as second option
  if (!imageSavedPath) {
    try {
      console.log(`Calling Pollinations AI for prompt: "${imagePrompt}"...`);
      const encodedPrompt = encodeURIComponent(promptFull);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=450&nologo=true&private=true`;
      
      const polRes = await fetch(pollinationsUrl);
      if (polRes.ok) {
        const buffer = await polRes.arrayBuffer();
        const fileName = `${parsedArticle.id}.jpg`;
        const localPath = path.join(IMAGES_DIR, fileName);
        fs.writeFileSync(localPath, Buffer.from(buffer));
        imageSavedPath = `/images/${fileName}`;
        console.log(`Saved Pollinations AI image to: ${localPath}`);
      } else {
        console.warn("Pollinations AI returned non-200 status:", polRes.status);
      }
    } catch (err) {
      console.error("Pollinations AI execution failed:", err);
    }
  }

  // 3. Try AI Horde as third option (crowd-sourced free queue)
  if (!imageSavedPath) {
    try {
      console.log("Calling AI Horde for prompt...");
      const submitResp = await fetch("https://aihorde.net/api/v2/generate/async", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "0000000000",
          "Client-Agent": "NihongoApp:1.0:user@example.com"
        },
        body: JSON.stringify({
          prompt: promptFull,
          params: {
            width: 512,
            height: 512,
            steps: 20
          }
        })
      });

      if (submitResp.ok) {
        const submitData: any = await submitResp.json();
        const jobId = submitData.id;
        console.log(`AI Horde accepted request! Job ID: ${jobId}. Polling...`);
        
        // Poll status up to 15 times (45 seconds max)
        for (let poll = 1; poll <= 15; poll++) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          const statusResp = await fetch(`https://aihorde.net/api/v2/generate/status/${jobId}`);
          if (statusResp.ok) {
            const statusData: any = await statusResp.json();
            if (statusData.done === true) {
              const imgUrl = statusData.generations?.[0]?.img;
              if (imgUrl) {
                const imgResp = await fetch(imgUrl);
                if (imgResp.ok) {
                  const buffer = await imgResp.arrayBuffer();
                  const fileName = `${parsedArticle.id}.jpg`;
                  const localPath = path.join(IMAGES_DIR, fileName);
                  fs.writeFileSync(localPath, Buffer.from(buffer));
                  imageSavedPath = `/images/${fileName}`;
                  console.log(`Saved AI Horde image to: ${localPath}`);
                  break;
                }
              }
            } else if (statusData.faulted === true) {
              console.warn("AI Horde job failed (faulted).");
              break;
            }
          }
        }
      } else {
        console.warn("AI Horde submission returned status:", submitResp.status);
      }
    } catch (err) {
      console.error("AI Horde execution failed:", err);
    }
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
