/**
 * This new function is called when a user clicks a mood box.
 * It updates the hidden input and then calls your playlist generator.
 * @param {string} mood - The mood chosen by the user (e.g., 'Upbeat').
 */
function selectMood(mood) {
  // 1. Find the hidden input field and set its value to the chosen mood.
  const moodInput = document.getElementById("moodInput");
  moodInput.value = mood;
  
  // 2. Call your existing function to generate the playlist.
  generatePlaylist();
}


/**
 * Your existing function to generate the playlist.
 * It now reads the mood from the hidden input field.
 */
async function generatePlaylist() {
  const mood = document.getElementById("moodInput").value;
  const resultsDiv = document.getElementById("results");

  if (!mood) {
    console.log("A mood has not been selected.");
    return; // Exit if no mood is set
  }
  
  // Provide immediate feedback to the user
  resultsDiv.innerHTML = `<p>Finding some ${mood.toLowerCase()} tunes for you... 🎵</p>`;

  try {
    const res = await fetch(`https://moodify-backend-9a9p.onrender.com/playlist?mood=${encodeURIComponent(mood)}`);
    const data = await res.json();

    // Clear the loading message
    resultsDiv.innerHTML = "";

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
        resultsDiv.appendChild(div);
      });
    } else {
      resultsDiv.innerHTML = "<p>No songs found. Try another mood 🎶</p>";
    }
  } catch (error) {
      console.error("Error fetching playlist:", error);
      resultsDiv.innerHTML = "<p>Sorry, something went wrong. Please try again later. 😥</p>";
  }
}
