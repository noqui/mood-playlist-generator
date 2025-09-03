app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;

    console.log("👉 Mood:", mood);
    console.log("👉 OPENAI key loaded?", !!process.env.OPENAI_API_KEY);
    console.log("👉 YOUTUBE key loaded?", !!process.env.YOUTUBE_API_KEY);

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return ONLY valid JSON: [{\"title\":\"Song\",\"artist\":\"Artist\"}]" },
        { role: "user", content: `Suggest 5 songs for this mood: ${mood}` }
      ]
    });

    let raw = aiResponse.choices[0].message.content;
    console.log("👉 Raw AI:", raw);

    // Safe JSON extraction
    let songList;
    try {
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      songList = JSON.parse(raw.slice(start, end + 1));
    } catch (e) {
      console.error("❌ JSON parse error:", e.message);
      return res.status(500).json({ error: "AI response was invalid JSON" });
    }

    if (!Array.isArray(songList) || songList.length === 0) {
      return res.json({ mood, playlist: [] });
    }

    const results = [];
    for (const song of songList) {
      try {
        const q = `${song.title} ${song.artist}`;
        const yt = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: { part: "snippet", q, key: process.env.YOUTUBE_API_KEY, maxResults: 1, type: "video" }
        });
        if (yt.data.items?.length) {
          const v = yt.data.items[0];
          results.push({
            title: song.title,
            artist: song.artist,
            youtubeId: v.id.videoId,
            thumbnail: v.snippet.thumbnails.default.url
          });
        }
      } catch (e) {
        console.error("❌ YouTube search failed:", e.response?.data || e.message);
      }
    }

    console.log("✅ Playlist to client:", results);
    res.json({ mood, playlist: results });
  } catch (error) {
    console.error("❌ General error:", error.response?.data || error.message || error);
    res.status(500).json({ error: "Failed to generate playlist" });
  }
});
