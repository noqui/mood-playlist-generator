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

// ----------------- PLAYLIST ROUTE -----------------
app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;

    console.log("👉 Mood received:", mood);
    console.log("👉 OpenAI Key loaded:", !!process.env.OPENAI_API_KEY);
    console.log("👉 YouTube Key loaded:", !!process.env.YOUTUBE_API_KEY);

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a music assistant. Always return only valid JSON. Reply with an array of songs in this format: [{\"title\":\"Song\",\"artist\":\"Artist\"}]",
        },
        {
          role: "user",
          content: `Suggest 5 songs for this mood: ${mood}`,
        },
      ],
    });

    let raw = aiResponse.choices[0].message.content;
    console.log("👉 Raw AI response:", raw);

    // Parse AI response safely
    let songList;
    try {
      const jsonStart = raw.indexOf("[");
      const jsonEnd = raw.lastIndexOf("]");
      const jsonString = raw.slice(jsonStart, jsonEnd + 1);
      songList = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ JSON parsing failed:", err.message);
      return res.status(500).json({ error: "AI response was invalid JSON" });
    }

    if (!Array.isArray(songList) || songList.length === 0) {
      return res.json({ mood, playlist: [] });
    }

    const results = [];
    for (const song of songList) {
      try {
        const query = `${song.title} ${song.artist}`;
        const yt = await axios.get(
          "https://www.googleapis.com/youtube/v3/search",
          {
            params: {
              part: "snippet",
              q: query,
              key: process.env.YOUTUBE_API_KEY,
              maxResults: 1,
              type: "video",
            },
          }
        );

        if (yt.data.items.length > 0) {
          const video = yt.data.items[0];
          results.push({
            title: song.title,
            artist: song.artist,
            youtubeId: video.id.videoId,
            thumbnail: video.snippet.thumbnails.default.url,
          });
        }
      } catch (ytErr) {
        console.error("❌ YouTube search failed:", ytErr.message);
      }
    }

    console.log("✅ Final playlist:", results);
    res.json({ mood, playlist: results });
  } catch (error) {
    console.error("❌ General error:", error.message);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});
// --------------------------------------------------

// Default root
app.get("/", (req, res) => {
  res.send("Welcome to Moodify Backend");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
