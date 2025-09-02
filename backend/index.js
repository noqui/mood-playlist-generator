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

app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a music assistant. Suggest songs based on mood." },
        { role: "user", content: `Suggest 5 songs for this mood: ${mood}. Reply in JSON with fields: title, artist.` }
      ]
    });

    const songList = JSON.parse(aiResponse.choices[0].message.content);
    const results = [];

    for (const song of songList) {
      const query = `${song.title} ${song.artist}`;
      const yt = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: { part: "snippet", q: query, key: process.env.YOUTUBE_API_KEY, maxResults: 1, type: "video" }
      });

      const video = yt.data.items[0];
      results.push({
        title: song.title,
        artist: song.artist,
        youtubeId: video.id.videoId,
        thumbnail: video.snippet.thumbnails.default.url
      });
    }

    res.json({ mood, playlist: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});