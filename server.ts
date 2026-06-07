import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initialArticles } from "./src/data/initialArticles.ts";
import { Article } from "./src/types.ts";

const app = express();
const PORT = 3000;
const ARTICLES_FILE = path.join(process.cwd(), "src/data/articles.json");

// Middleware
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Initialize local articles file with mock articles if it doesn't exist
function loadArticles(): Article[] {
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, "utf-8");
      return JSON.parse(data) as Article[];
    } else {
      fs.writeFileSync(ARTICLES_FILE, JSON.stringify(initialArticles, null, 2), "utf-8");
      return initialArticles;
    }
  } catch (error) {
    console.error("Error loading articles, fallback to initial seed:", error);
    return initialArticles;
  }
}

function saveArticles(articles: Article[]) {
  try {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving articles:", error);
  }
}

// Ensure database is populated at startup
let inMemoryArticles = loadArticles();

const getHfToken = () => process.env.HF_API_KEY || process.env.HF_TOKEN;

// Admin Authorization Middleware (Double checking email matches)
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const adminEmail = req.headers["x-admin-email"];
  if (adminEmail !== "mattan029@gmail.com") {
    return res.status(403).json({
      error: "Access Denied. Only mattan029@gmail.com is authorized to modify articles.",
    });
  }
  next();
};

// ==========================================
// API ROUTES
// ==========================================

// Get all articles
app.get("/api/articles", (req, res) => {
  res.json(inMemoryArticles);
});

// Create fully custom article
app.post("/api/articles", requireAdmin, (req, res) => {
  try {
    const newArticle = req.body as Article;
    if (!newArticle.id || !newArticle.title || !newArticle.level) {
      return res.status(400).json({ error: "Missing required fields (id, title, level)." });
    }

    // Check if ID already exists
    const exists = inMemoryArticles.some((a) => a.id === newArticle.id);
    if (exists) {
      return res.status(400).json({ error: "Article slug/ID already exists. Try changing the URL slug." });
    }

    inMemoryArticles.unshift(newArticle);
    saveArticles(inMemoryArticles);
    res.json({ success: true, article: newArticle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update an existing article (CMS edits)
app.put("/api/articles/:id", requireAdmin, (req, res) => {
  try {
    const articleId = req.params.id;
    const idx = inMemoryArticles.findIndex((a) => a.id === articleId);
    if (idx === -1) {
      return res.status(404).json({ error: "Article not found." });
    }

    const updatedArticle = { ...inMemoryArticles[idx], ...req.body } as Article;
    inMemoryArticles[idx] = updatedArticle;
    saveArticles(inMemoryArticles);

    res.json({ success: true, article: updatedArticle });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an article
app.delete("/api/articles/:id", requireAdmin, (req, res) => {
  try {
    const articleId = req.params.id;
    const initialLength = inMemoryArticles.length;
    inMemoryArticles = inMemoryArticles.filter((a) => a.id !== articleId);
    
    if (inMemoryArticles.length === initialLength) {
      return res.status(404).json({ error: "Article not found." });
    }

    saveArticles(inMemoryArticles);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Proofreading (検品) endpoint
app.post("/api/check-article", requireAdmin, async (req, res) => {
  try {
    const article = req.body as Article;
    const hfToken = getHfToken();
    if (!hfToken) {
      return res.status(500).json({ error: "HF_TOKEN / HF_API_KEY environment variable is not configured." });
    }

    const systemInstruction = `You are an expert bilingual Japanese-English proofreader.
Analyze the Japanese contents (vocabulary, kana, romaji, example sentences, pronunciation tips) and English translations for any typos, spelling errors, character corruption (mojibake), or styling issues.
You must correct any errors you find.
Return ONLY a valid JSON object matching the exact provided structure of the Article. Do not warp the structure, remove any fields or append Markdown outside the JSON.`;

    const textRes = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: JSON.stringify(article) }
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    });

    if (!textRes.ok) {
      const errorText = await textRes.text();
      return res.status(500).json({ error: `Hugging Face API error: ${errorText}` });
    }

    const textData = await textRes.json();
    const textOutput = textData.choices?.[0]?.message?.content?.trim();
    if (!textOutput) {
      return res.status(500).json({ error: "Empty response from Hugging Face API" });
    }

    const cleanedJson = textOutput.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsedData = JSON.parse(cleanedJson);
    parsedData.isVerified = true;
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI verify check failed:", err);
    res.status(500).json({ error: `AI validation failed: ${err.message}` });
  }
});

// AI Auto-Generation endpoint
app.post("/api/generate-article", requireAdmin, async (req, res) => {
  try {
    const { level, topic, timeOfDay } = req.body;
    const lvlNum = parseInt(level, 10) as Article["level"];
    
    const timeOfDayMap: Record<number, string> = {
      1: "Morning",
      2: "Late-Morning",
      3: "Afternoon",
      4: "Evening",
      5: "Night"
    };

    const targetTime = timeOfDay || timeOfDayMap[lvlNum] || "Morning";

    const prompt = `Create a high-quality Japanese language learning article optimized for English speakers.
Level: Level ${lvlNum} (${lvlNum === 1 ? 'Absolute Beginner - No Japanese skills' : lvlNum === 2 ? 'Basic Words & Short Requests' : lvlNum === 3 ? 'Intermediate Sentences & Desires' : lvlNum === 4 ? 'Upper-Intermediate Business & Conditional logic' : 'Advanced Aesthetics & Philosophical Nuance'}).
Theme/Topic hint: ${topic || "Any culturally engaging topic matching this level"}
Time of Day Update slotted at: ${targetTime} (usually, Morning is Level 1, Late-Morning is Level 2, Afternoon is level 3, Evening is Level 4, Night is Level 5).

Make the byline very professional, like a real British Newspaper desk (e.g., 'By Kenji Sato, Tokyo Bureau' or 'By Emma Sterling, Culture Desk').
Create an interesting Story/Introduction (introduction) in English with occasional Japanese quotes.
Provide general Grammar Analysis in prose.
Create EXACTLY 2 Japanese vocabulary cards (postIts) in details following the PostItData schema:
Each postIt should have:
- id: a unique string ID
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
  "id": "e.g. level1-tokyo-greetings-2",
  "title": "A beautiful catchy newspaper title",
  "subtitle": "An elegant editorial subtitle",
  "level": ${lvlNum},
  "levelName": "e.g. Level ${lvlNum}: ...",
  "timeOfDay": "${targetTime}",
  "publishedAt": "HH:MM format",
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

    const hfToken = getHfToken();
    if (!hfToken) {
      return res.status(500).json({ error: "HF_TOKEN / HF_API_KEY environment variable is not configured." });
    }

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
      return res.status(500).json({ error: `Hugging Face Text API returned status ${textRes.status}: ${errorText}` });
    }

    const textData = await textRes.json();
    const textOutput = textData.choices?.[0]?.message?.content?.trim();
    if (!textOutput) {
      return res.status(500).json({ error: "Empty response from Hugging Face API" });
    }

    const cleanedJson = textOutput.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsedArticle = JSON.parse(cleanedJson) as any;

    if (!parsedArticle.id || !parsedArticle.title) {
      throw new Error("AI returned an invalid article structure.");
    }

    // Dynamic Image Generation via Hugging Face
    const imagePrompt = parsedArticle.imagePrompt || `Vintage British newspaper illustration of ${topic || "Japanese scenery"}`;
    let base64Image = "";

    try {
      console.log("Calling Hugging Face image generation model for prompt:", imagePrompt);
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
        const base64Str = Buffer.from(buffer).toString("base64");
        base64Image = `data:image/jpeg;base64,${base64Str}`;
        console.log("Hugging face image generated successfully.");
      } else {
        console.warn("Hugging Face API returned non-200:", hfRes.status, hfRes.statusText);
      }
    } catch (err) {
      console.error("Hugging Face API execution failed, will fall back:", err);
    }

    // If Hugging Face fails or key not provided, assign a gorgeous matching Unsplash search string
    if (!base64Image) {
      const fallbackThemes: Record<number, string> = {
        1: "tokyo-morning",
        2: "japanese-food",
        3: "kyoto-temple",
        4: "tokyo-nightlife",
        5: "zen-garden"
      };
      const themeWord = topic ? encodeURIComponent(topic.split(" ")[0]) : fallbackThemes[lvlNum];
      parsedArticle.thumbnailUrl = `https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&q=80&w=800&keyword=${themeWord}`;
    } else {
      parsedArticle.thumbnailUrl = base64Image;
    }

    parsedArticle.thumbnailAlt = imagePrompt;
    parsedArticle.isVerified = true;

    // Prepend to database
    inMemoryArticles.unshift(parsedArticle);
    saveArticles(inMemoryArticles);

    res.json({ success: true, article: parsedArticle });
  } catch (err: any) {
    console.error("AI generation failed:", err);
    res.status(500).json({ error: `AI Article Generation failed: ${err.message}` });
  }
});


// ==========================================
// VITE AND STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[nihon-go!! Server] listening on http://localhost:${PORT}`);
  });
}

startServer();
