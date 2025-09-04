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

  // Show the overlay
  showResults();
  
  // Set style to center the loading message vertically.
  playlistContent.style.justifyContent = 'center';
  playlistContent.innerHTML = `<p>Finding some ${mood.toLowerCase()} tunes for you... 🎵</p>`;

  try {
    const url = `https://moodify-backend-9a9p.onrender.com/playlist?mood=${encodeURIComponent(mood)}`;
    
    // FIX: Add { cache: 'no-store' } to force a new result from the server.
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    // Reset the justification for the list view and clear the message.
    playlistContent.style.justifyContent = 'flex-start';
    playlistContent.innerHTML = "";

    if (data.playlist && data.playlist.length > 0) {
      data.playlist.forEach((song) => {
        const div = document.createElement("div");
        div.className = 'song-item';
        
        div.innerHTML = `
          <a href="${song.url}" target="_blank">
            <img 
              src="${song.albumArt}" 
              alt="${song.title}" 
              width="100" 
              style="border-radius:8px; display: block;" />
          </a>
          <div class="song-info">
              <h3>${song.title}</h3>
              <p>${song.artist}</p>
          </div>
          `;
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
