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

// 🟢 Debug route: check if keys are loaded
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

// 🟢 Playlist route
app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    // Ask OpenAI for songs
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music assistant. Suggest songs based on mood." },
        { role: "user", content: `Suggest 5 songs for this mood: ${mood}. Reply in JSON with fields: title, artist.` }
      ]
    });

    let songList;
    try {
      songList = JSON.parse(aiResponse.choices[0].message.content);
    } catch (err) {
      console.error("❌ Failed to parse AI response:", aiResponse.choices[0].message.content);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }

    const results = [];

    for (const song of songList) {
      const query = `${song.title} ${song.artist}`;
      try {
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
      } catch (ytError) {
        console.error("❌ YouTube API error for query:", query, ytError.message);
      }
    }

    if (results.length === 0) {
      return res.json({ mood, playlist: [], message: "No songs found. Try another mood." });
    }

    res.json({ mood, playlist: results });
  } catch (error) {
    console.error("❌ Playlist route error:", error);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});

// 🟢 Root route
app.get("/", (req, res) => {
  res.send("🎵 Welcome to Moodify Backend!");
});

// 🟢 Start server
app.listen(process.env.PORT || 5000, () => {
  console.log("✅ Server running on port", process.env.PORT || 5000);
});
