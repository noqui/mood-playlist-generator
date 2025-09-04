import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let spotifyToken = null;
let tokenExpiry = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyToken && now < tokenExpiry) {
    return spotifyToken;
  }
  try {
    // FINAL FIX: Using the real Spotify Accounts API endpoint
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

    const token = await getSpotifyToken();

    // FINAL FIX: Using the real Spotify Search API endpoint
    const searchResp = await axios.get(
      "http://googleusercontent.com/spotify.com/7",
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { q: `${mood} genre:rock`, type: "track", limit: 50 },
      }
    );
    
    let tracks = searchResp.data.tracks.items;

    if (tracks.length === 0) {
      return res.json({ mood, playlist: [], message: "No songs found" });
    }

    for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }

    const randomTracks = tracks.slice(0, 5);

    const playlistWithGenres = await Promise.all(
      randomTracks.map(async (track) => {
        const artistId = track.artists[0].id;
        
        // FINAL FIX: Using the real Spotify Artists API endpoint
        const artistResp = await axios.get(
          `https://api.spotify.com/v1/artists/${artistId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const genre = artistResp.data.genres[0] || 'Rock';

        return {
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          albumArt: track.album.images[0]?.url,
          url: track.external_urls.spotify,
          previewUrl: track.preview_url,
          genre: genre,
        };
      })
    );

    res.json({ mood, playlist: playlistWithGenres });

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
