export const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

export async function register(username, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify({username, email, password}),
    });

    if (!res.ok) throw new Error("Ошибка регистрации");
    return res.json();
}

export async function login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json" },
        body: JSON.stringify({email, password}),
    });

    if (!res.ok) throw new Error("Неверный логин или пароль");
    return res.json();
}

export function saveToken(token){
    localStorage.setItem("token", token);
}

export function getToken(){
    return localStorage.getItem("token");
}

export function removeToken(){
    localStorage.removeItem("token");
}

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});


export async function fetchMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка загрузки профиля");
  return res.json();
}


export async function fetchUserById(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Пользователь не найден");
  return res.json();
}

export async function updateMe(data) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Ошибка обновления профиля");
  return res.json();
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/auth/me/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });
  if (!res.ok) throw new Error('Ошибка загрузки аватарки');
  return res.json();
}

export async function changePassword(oldPassword, newPassword) {
  const res = await fetch(`${API_BASE}/api/auth/me/password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Ошибка смены пароля');
  }
}