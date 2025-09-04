import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const moodMappings = {
  upbeat: {
    genres: ["pop", "dance", "happy", "summer", "party"],
    features: { target_valence: 0.8, target_energy: 0.7 }
  },
  energetic: {
    genres: ["rock", "electronic", "work-out", "techno", "hard-rock"],
    features: { target_energy: 0.9, target_danceability: 0.8 }
  },
  downbeat: {
    genres: ["sad", "acoustic", "rainy-day", "blues", "folk"],
    features: { target_valence: 0.2, target_energy: 0.3 }
  },
  mellow: {
    genres: ["chill", "ambient", "jazz", "sleep", "r-n-b"],
    features: { target_energy: 0.4, target_acousticness: 0.7 }
  },
};

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiry) {
    return spotifyToken;
  }
  try {
    const resp = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              process.env.SPOTIFY_CLIENT_ID +
                ":" +
                process.env.SPOTIFY_CLIENT_SECRET
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    spotifyToken = resp.data.access_token;
    tokenExpiry = now + resp.data.expires_in * 1000;
    return spotifyToken;
  } catch (err) {
    console.error("Failed to fetch Spotify token:", err.response?.data || err);
    throw new Error("Spotify authentication failed");
  }
}

app.get("/playlist", async (req, res) => {
  try {
    const { mood } = req.query;
    if (!mood) return res.status(400).json({ error: "Mood is required" });

    const moodKey = mood.toLowerCase();
    const mapping = moodMappings[moodKey];

    if (!mapping) {
      return res.status(400).json({ error: "Invalid mood provided" });
    }

    const token = await getSpotifyToken();

    const randomGenre = mapping.genres[Math.floor(Math.random() * mapping.genres.length)];

    const params = {
      limit: 5,
      seed_genres: randomGenre,
      ...mapping.features,
    };
    
    const recommendationsResp = await axios.get(
      "https://api.spotify.com/v1/recommendations",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      }
    );
    
    const playlist = recommendationsResp.data.tracks.map((track) => ({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      albumArt: track.album.images[0]?.url,
      url: track.external_urls.spotify,
      previewUrl: track.preview_url,
    }));

    res.json({ mood, playlist });

  } catch (err) {
    console.error("Playlist error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

app.get("/debug", async (req, res) => {
  res.json({
    status: "ok",
    spotifyIdLoaded: !!process.env.SPOTIFY_CLIENT_ID,
    spotifySecretLoaded: !!process.env.SPOTIFY_CLIENT_SECRET,
    time: new Date().toISOString(),
  });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
