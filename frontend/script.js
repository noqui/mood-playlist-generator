async function generatePlaylist() {
  const mood = document.getElementById("moodInput").value;
  const res = await fetch(`http://localhost:5000/playlist?mood=${encodeURIComponent(mood)}`);
  const data = await res.json();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  data.playlist.forEach((song) => {
    const div = document.createElement("div");
    div.innerHTML = `<h3>${song.title} - ${song.artist}</h3>
      <iframe width="300" height="200" src="https://www.youtube.com/embed/${song.youtubeId}" frameborder="0" allowfullscreen></iframe>`;
    resultsDiv.appendChild(div);
  });
}