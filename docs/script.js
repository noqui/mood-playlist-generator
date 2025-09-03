/**
 * Shows the results overlay.
 * Called by selectMood() before fetching the playlist.
 */
function showResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.style.display = 'flex';
}

/**
 * Hides the results overlay.
 * Called by the new close button (×).
 */
function closeResults() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.style.display = 'none';
}

/**
 * Sets the chosen mood and calls the playlist generator.
 * @param {string} mood - The mood chosen by the user.
 */
function selectMood(mood) {
  document.getElementById("moodInput").value = mood;
  generatePlaylist();
}

/**
 * Fetches the playlist and displays it in the overlay.
 */
async function generatePlaylist() {
  const mood = document.getElementById("moodInput").value;
  const playlistContent = document.getElementById("playlist-content");

  if (!mood) return;

  // Show the overlay with a loading message
  showResults();
  playlistContent.innerHTML = `<p>Finding some ${mood.toLowerCase()} tunes for you... 🎵</p>`;

  try {
    const res = await fetch(`https://moodify-backend-9a9p.onrender.com/playlist?mood=${encodeURIComponent(mood)}`);
    const data = await res.json();

    // Clear the loading message
    playlistContent.innerHTML = "";

    if (data.playlist && data.playlist.length > 0) {
      data.playlist.forEach((song) => {
        const div = document.createElement("div");
        div.innerHTML = `
          <h3>${song.title} - ${song.artist}</h3>
          <a href="${song.url}" target="_blank">
            <img 
              src="${song.albumArt}" 
              alt="${song.title}" 
              width="200" 
              style="border-radius:12px; box-shadow:0 4px 8px rgba(0,0,0,0.2)" />
          </a>`;
        playlistContent.appendChild(div);
      });
    } else {
      playlistContent.innerHTML = "<p>No songs found. Try another mood 🎶</p>";
    }
  } catch (error) {
    console.error("Error fetching playlist:", error);
    playlistContent.innerHTML = "<p>Sorry, something went wrong. Please try again later. 😥</p>";
  }
}
