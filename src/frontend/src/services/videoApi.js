const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const getDefaultHeaders = () => ({
  "ngrok-skip-browser-warning": "true",
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

export async function fetchAllVideos() {
  const res = await fetch(`${API_BASE}/api/videos/all`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка загрузки списка видео");
  return res.json();
}

export function uploadVideo(file, title = '', thumbnailFile = null, tags = [], requiredTierId = null, onProgress = null, description = '') {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title || file.name);
    if (description) formData.append("description", description);
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    tags.forEach(tag => formData.append("tags", tag));
    if (requiredTierId) formData.append("requiredTierId", requiredTierId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/videos/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("token")}`);
    xhr.setRequestHeader("ngrok-skip-browser-warning", "true");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new Error(body.error || "Ошибка при загрузке видео"));
        } catch {
          reject(new Error("Ошибка при загрузке видео"));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Ошибка сети"));
    xhr.send(formData);
  });
}

export async function deleteVideo(id) {
  const res = await fetch(`${API_BASE}/api/videos/${id}`, {
    method: 'DELETE',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка при удалении видео');
}

export async function getVideoStatus(videoId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/status`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка проверки статуса");
  return res.json();
}

export function getStreamUrl(filePath) {
  return `${API_BASE}/${filePath}`;
}

export function getSubtitlesUrl(filePath) {
  if (!filePath) return null;
  return `${API_BASE}/${filePath.replace('master.m3u8', 'transcription.txt')}`;
}

export async function fetchMyVideos() {
    const res = await fetch(`${API_BASE}/api/videos/my`, {
        headers: getDefaultHeaders(),
    });
    if (!res.ok) throw new Error("Ошибка загрузки видео");
    
    return res.json();
}

export async function fetchUserVideos(userId) {
  const res = await fetch(`${API_BASE}/api/videos/user/${userId}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка загрузки видео пользователя");
  return res.json();
}

export function getThumbnailUrl(thumbnailPath, version){
  if (!thumbnailPath) return null;
  const url = `${API_BASE}/${thumbnailPath}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

export async function getVideoById(id) {
  const res = await fetch(`${API_BASE}/api/videos/${id}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Видео не найдено");
  return res.json();
}

export async function recordView(id) {
  await fetch(`${API_BASE}/api/videos/${id}/view`, {
    method: 'POST',
    headers: getDefaultHeaders(),
  });
}

export async function updateVideo(id, { title, description, tags, thumbnail, requiredTierId }) {
  const formData = new FormData();
  if (title != null) formData.append("title", title);
  if (description != null) formData.append("description", description);
  if (tags) tags.forEach(tag => formData.append("tags", tag));
  if (thumbnail) formData.append("thumbnail", thumbnail);
  if (requiredTierId !== undefined) {
    formData.append("requiredTierId", requiredTierId === null ? "" : requiredTierId);
  }

  const res = await fetch(`${API_BASE}/api/videos/${id}`, {
    method: "PUT",
    body: formData,
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка при обновлении видео");
  return res.json();
}

export async function fetchRelatedVideos(id, limit = 8) {
  const res = await fetch(`${API_BASE}/api/videos/${id}/related?limit=${limit}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

// --- Rating API ---

export async function getRating(videoId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/rating`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return { average: 0, count: 0, myRating: 0 };
  return res.json();
}

export async function rateVideo(videoId, value) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/rating`, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Ошибка при оценке видео");
  return res.json();
}

// --- Comments API ---

export async function fetchComments(videoId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addComment(videoId, text, hidden = false) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments`, {
    method: 'POST',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, hidden }),
  });
  if (!res.ok) throw new Error("Ошибка при добавлении комментария");
  return res.json();
}

export async function editComment(videoId, commentId, text) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      ...getDefaultHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Ошибка при редактировании комментария");
  return res.json();
}

export async function deleteComment(videoId, commentId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка при удалении комментария");
}

export async function likeComment(videoId, commentId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments/${commentId}/like`, {
    method: 'POST',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка");
  return res.json();
}

export async function dislikeComment(videoId, commentId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments/${commentId}/dislike`, {
    method: 'POST',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка");
  return res.json();
}

export async function authorLikeComment(videoId, commentId) {
  const res = await fetch(`${API_BASE}/api/videos/${videoId}/comments/${commentId}/author-like`, {
    method: 'POST',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка");
  return res.json();
}

// --- Favorites API ---

export async function toggleFavorite(videoId) {
  const res = await fetch(`${API_BASE}/api/favorites/${videoId}`, {
    method: 'POST',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка при изменении избранного");
  return res.json();
}

export async function fetchFavorites() {
  const res = await fetch(`${API_BASE}/api/favorites`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка загрузки избранного");
  return res.json();
}