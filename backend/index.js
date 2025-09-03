import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Debug route to check env
app.get("/debug", (req, res) => {
  res.json({
    status: "ok",
    keysLoaded: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    },
    time: new Date().toISOString(),
  });
});

// Test route to confirm backend is live
app.get("/", (req, res) => {
  res.send("🎵 Welcome to Moodify Backend with OpenAI + Gemini fallback");
});

// Main playlist route
app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;
    if (!mood) {
      return res.status(400).json({ error: "Mood query parameter is required" });
    }

    let songList;

    // --- Try OpenAI first ---
    try {
      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a music assistant. Suggest songs based on mood.",
          },
          {
            role: "user",
            content: `Suggest 5 songs for this mood: ${mood}. Reply ONLY in JSON with fields: title, artist.`,
          },
        ],
      });

      const rawContent = aiResponse.choices[0].message.content;
      songList = JSON.parse(rawContent);
    } catch (err) {
      console.error("❌ OpenAI failed, falling back to Gemini:", err.message);

      // --- Fallback: Gemini ---
      try {
        const geminiRes = await axios.post(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Suggest 5 songs for this mood: ${mood}. Reply ONLY in JSON with fields: title, artist.`,
                  },
                ],
              },
            ],
          },
          {
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": process.env.GEMINI_API_KEY,
            },
          }
        );

        const text = geminiRes.data.candidates[0].content.parts[0].text;
        songList = JSON.parse(text);
      } catch (gemErr) {
        console.error("❌ Gemini also failed:", gemErr.message);
        return res.status(500).json({ error: "All AI models failed" });
      }
    }

    // --- YouTube Search for each song ---
    const results = [];
    for (const song of songList) {
      try {
        const query = `${song.title} ${song.artist}`;
        const yt = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            part: "snippet",
            q: query,
            key: process.env.YOUTUBE_API_KEY,
            maxResults: 1,
            type: "video",
          },
        });

        const video = yt.data.items[0];
        if (video) {
          results.push({
            title: song.title,
            artist: song.artist,
            youtubeId: video.id.videoId,
            thumbnail: video.snippet.thumbnails.default.url,
          });
        }
      } catch (ytErr) {
        console.error("YouTube search failed for", song, ytErr.message);
      }
    }

    if (results.length === 0) {
      return res.json({ mood, playlist: [], message: "No songs found. Try another mood." });
    }

    res.json({ mood, playlist: results });
  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("🚀 Server running on port", process.env.PORT || 5000);
});
