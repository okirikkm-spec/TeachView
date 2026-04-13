const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const getDefaultHeaders = () => ({
  "ngrok-skip-browser-warning": "true",
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

const jsonHeaders = () => ({
  ...getDefaultHeaders(),
  "Content-Type": "application/json",
});

// ─── Плейлисты ───

export async function fetchMyPlaylists() {
  const res = await fetch(`${API_BASE}/api/playlists/my`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAuthorPlaylists(authorId) {
  const res = await fetch(`${API_BASE}/api/playlists/author/${authorId}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchPlaylist(playlistId) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Плейлист не найден");
  return res.json();
}

export async function createPlaylist({ name, description, isPublic }) {
  const res = await fetch(`${API_BASE}/api/playlists`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, description, isPublic }),
  });
  if (!res.ok) throw new Error("Ошибка создания плейлиста");
  return res.json();
}

export async function updatePlaylist(playlistId, { name, description, isPublic }) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, description, isPublic }),
  });
  if (!res.ok) throw new Error("Ошибка обновления плейлиста");
  return res.json();
}

export async function deletePlaylist(playlistId) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}`, {
    method: "DELETE",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка удаления плейлиста");
}

// ─── Видео в плейлисте ───

export async function addVideoToPlaylist(playlistId, videoId) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/videos/${videoId}`, {
    method: "POST",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка добавления видео в плейлист");
  return res.json();
}

export async function reorderPlaylistVideos(playlistId, videoIds) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/reorder`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(videoIds),
  });
  if (!res.ok) throw new Error("Ошибка сортировки");
  return res.json();
}

export async function removeVideoFromPlaylist(playlistId, videoId) {
  const res = await fetch(`${API_BASE}/api/playlists/${playlistId}/videos/${videoId}`, {
    method: "DELETE",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка удаления видео из плейлиста");
  return res.json();
}