async function generatePlaylist() {
  const mood = document.getElementById("moodInput").value;

  const res = await fetch(`https://moodify-backend-9a9p.onrender.com/playlist?mood=${encodeURIComponent(mood)}`);
  const data = await res.json();

  const resultsDiv = document.getElementById("results");
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
}
