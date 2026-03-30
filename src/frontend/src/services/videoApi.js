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

export async function uploadVideo(file, title = '', thumbnailFile = null, tags = []) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title || file.name);
  if (thumbnailFile) {
    formData.append("thumbnail", thumbnailFile);
  }
  tags.forEach(tag => formData.append("tags", tag));

  const res = await fetch(`${API_BASE}/api/videos/upload`, {
    method: "POST",
    body: formData,
    headers: getDefaultHeaders(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Ошибка при загрузке видео");
  }

  return res.json();
}

export function getStreamUrl(filePath) {
  return `${API_BASE}/${filePath}`;
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

export function getThumbnailUrl(thumbnailPath){
  return thumbnailPath ? `${API_BASE}/${thumbnailPath}` : null;
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