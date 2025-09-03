import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Root route
app.get("/", (req, res) => {
  res.send("🎵 Welcome to Moodify Backend");
});

// Debug: check API keys
app.get("/debug", (req, res) => {
  res.json({
    status: "ok",
    keysLoaded: {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      YOUTUBE_API_KEY: !!process.env.YOUTUBE_API_KEY
    },
    time: new Date().toISOString()
  });
});

// Debug: see raw OpenAI output
app.get("/debug-openai", async (req, res) => {
  try {
    const { mood = "happy" } = req.query;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music assistant. Always reply in valid JSON only." },
        { role: "user", content: `Suggest 5 songs for this mood: ${mood}. Reply ONLY in JSON array with fields: title, artist.` }
      ]
    });

    res.json({
      raw: aiResponse.choices[0].message.content
    });
  } catch (err) {
    console.error("Debug OpenAI error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch OpenAI response" });
  }
});

// Playlist generator
app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music assistant. Always reply in valid JSON only." },
        { role: "user", content: `Suggest 5 songs for this mood: ${mood}. Reply ONLY in JSON array with fields: title, artist.` }
      ]
    });

    let songList;
    try {
      const rawText = aiResponse.choices[0].message.content.trim();
      songList = JSON.parse(rawText);
    } catch (err) {
      console.error("JSON parse error:", err);
      return res.status(500).json({ error: "AI response not valid JSON" });
    }

    if (!Array.isArray(songList)) {
      return res.status(500).json({ error: "AI did not return a song list" });
    }

    const results = [];

    for (const song of songList) {
      const query = `${song.title} ${song.artist}`;
      const yt = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          part: "snippet",
          q: query,
          key: process.env.YOUTUBE_API_KEY,
          maxResults: 1,
          type: "video"
        }
      });

      if (yt.data.items.length > 0) {
        const video = yt.data.items[0];
        results.push({
          title: song.title,
          artist: song.artist,
          youtubeId: video.id.videoId,
          thumbnail: video.snippet.thumbnails.default.url
        });
      }
    }

    res.json({ mood, playlist: results });
  } catch (error) {
    console.error("Playlist error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log("✅ Server running on port", process.env.PORT || 5000);
});
