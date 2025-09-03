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
      // Extract and clean JSON safely
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
        params: { part: "snippet", q: query, key: process.env.YOUTUBE_API_KEY, maxResults: 1, type: "video" }
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
