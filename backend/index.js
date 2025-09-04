import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- NEW: Mood to Spotify Genre and Audio Feature Mapping ---
const moodMappings = {
  upbeat: {
    seed_genres: ["pop", "dance", "happy", "summer", "party"],
    target_valence: 0.8, // High valence = happy, cheerful
    target_energy: 0.7,
  },
  energetic: {
    seed_genres: ["rock", "electronic", "work-out", "techno", "hard-rock"],
    target_energy: 0.9, // High energy
    target_danceability: 0.8,
  },
  downbeat: {
    seed_genres: ["sad", "acoustic", "rainy-day", "blues", "folk"],
    target_valence: 0.2, // Low valence = sad, melancholic
    target_energy: 0.3,
  },
  mellow: {
    seed_genres: ["chill", "ambient", "jazz", "sleep", "r-n-b"],
    target_energy: 0.4, // Low energy
    target_acousticness: 0.7,
  },
};

let spotifyToken = null;
let tokenExpiry = 0;

// Function: Get Spotify Access Token
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

// --- UPDATED: Playlist endpoint now uses Recommendations API ---
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

    // Randomly pick one genre from our list to use as a seed
    const randomGenre = mapping.seed_genres[Math.floor(Math.random() * mapping.seed_genres.length)];

    const params = {
      limit: 5,
      seed_genres: randomGenre,
      ...mapping, // Spread the rest of the mapping properties (like target_valence)
    };
    
    // Use the Recommendations endpoint instead of Search
    const recommendationsResp = await axios.get(
      "https://api.spotify.com/v1/search/recommendations",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: params,
      }
    );
    
    // The response structure is slightly different for recommendations
    const playlist = recommendationsResp.data.tracks.map((track) => ({
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      albumArt: track.album.images[0]?.url,
      url: track.external_urls.spotify,
      previewUrl: track.preview_url,
    }));

    res.json({ mood, playlist });

  } catch (err) {
    console.error("Playlist error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

// Debug route
app.get("/debug", async (req, res) => {
  res.json({
    status: "ok",
    spotifyIdLoaded: !!process.env.SPOTIFY_CLIENT_ID,
    spotifySecretLoaded: !!process.env.SPOTIFY_CLIENT_SECRET,
    time: new Date().toISOString(),
  });
});

app.listen(process.env.PORT || 5001, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
