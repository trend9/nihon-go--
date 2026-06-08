import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initialArticles } from "./src/data/initialArticles.ts";
import { Article } from "./src/types.ts";
const app = express();
const PORT = 3000;
const ARTICLES_FILE = path.join(process.cwd(), "src/data/articles.json");

async function verifyGoogleToken(token: string): Promise<string | null> {
  try {
    const payloadBase64 = token.split(".")[1];
    const decodedPayload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
    return decodedPayload.email || null;
  } catch (error) {
    console.error("Token decoding failed:", error);
    return null;
  }
}

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

const getColabUrl = () => process.env.COLAB_API_URL?.replace(/\/$/, '');

async function callLLM(prompt: string, systemInstruction: string, colabUrl: string): Promise<any> {
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
    throw new Error("Empty content returned from Colab.");
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
// Admin Authorization Middleware (Verifying Google JWT token)
const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  
  if (!token) {
    return res.status(401).json({ error: "Access Denied. Authentication required." });
  }

  const email = await verifyGoogleToken(token);
  const allowedEmail = process.env.ADMIN_EMAIL;

  if (!email || !allowedEmail || email.toLowerCase() !== allowedEmail.toLowerCase()) {
    return res.status(403).json({
      error: "Access Denied. Unauthorized user.",
    });
  }
  next();
};

// Verify Google Token endpoint
app.post("/api/auth/verify", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required." });
    }
    const email = await verifyGoogleToken(token);
    const allowedEmail = process.env.ADMIN_EMAIL;
    if (email && allowedEmail && email.toLowerCase() === allowedEmail.toLowerCase()) {
      return res.json({ success: true, email });
    }
    return res.status(403).json({ error: "Access Denied. Unauthorized user." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
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
    const colabUrl = getColabUrl();
    if (!colabUrl) {
      return res.status(500).json({ error: "COLAB_API_URL environment variable is not configured." });
    }

    const systemInstruction = `You are an expert bilingual Japanese-English proofreader.
Analyze the Japanese contents (vocabulary, kana, romaji, example sentences, pronunciation tips) and English translations for any typos, spelling errors, character corruption (mojibake), or styling issues.
You must correct any errors you find.
Return ONLY a valid JSON object matching the exact provided structure of the Article. Do not warp the structure, remove any fields or append Markdown outside the JSON.`;

    const parsedData = await callLLM(JSON.stringify(article), systemInstruction, colabUrl);
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

    const colabUrl = getColabUrl();
    if (!colabUrl) {
      return res.status(500).json({ error: "COLAB_API_URL environment variable is not configured." });
    }

    const systemInstruction = "You are a professional educational publisher. Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no code block backticks (do not wrap in ```json), just raw JSON.";

    const parsedArticle = await callLLM(prompt, systemInstruction, colabUrl);

    if (!parsedArticle.id || !parsedArticle.title) {
      throw new Error("AI returned an invalid article structure.");
    }

    // Dynamic Image Generation via Hugging Face, Pollinations AI, and AI Horde as fallbacks
    const imagePrompt = parsedArticle.imagePrompt || `Vintage British newspaper illustration of ${topic || "Japanese scenery"}`;
    const promptFull = `${imagePrompt}, vintage styled newspaper print illustration, monochrome charcoal engraving`;
    let base64Image = "";

    // 1. Try Colab API Stable Diffusion
    try {
      console.log("Calling Colab Stable Diffusion for prompt:", imagePrompt);
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
          base64Image = `data:image/jpeg;base64,${base64Str}`;
          console.log("Colab image generated successfully.");
        }
      } else {
        console.warn("Colab Image API returned non-200:", colabRes.status, colabRes.statusText);
      }
    } catch (err) {
      console.error("Colab Image API execution failed, will fall back:", err);
    }

    // 2. Try Pollinations AI as second option
    if (!base64Image) {
      try {
        console.log("Calling Pollinations AI for image generation...");
        const encodedPrompt = encodeURIComponent(promptFull);
        const polRes = await fetch(`https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=450&nologo=true&private=true`);
        if (polRes.ok) {
          const buffer = await polRes.arrayBuffer();
          const base64Str = Buffer.from(buffer).toString("base64");
          base64Image = `data:image/jpeg;base64,${base64Str}`;
          console.log("Pollinations AI image generated successfully.");
        } else {
          console.warn("Pollinations AI returned non-200 status:", polRes.status);
        }
      } catch (err) {
        console.error("Pollinations AI execution failed:", err);
      }
    }

    // 3. Try AI Horde as third option
    if (!base64Image) {
      try {
        console.log("Calling AI Horde for image generation...");
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
                    const base64Str = Buffer.from(buffer).toString("base64");
                    base64Image = `data:image/jpeg;base64,${base64Str}`;
                    console.log("AI Horde image generated successfully.");
                    break;
                  }
                }
              } else if (statusData.faulted === true) {
                console.warn("AI Horde job failed.");
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error("AI Horde execution failed:", err);
      }
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
