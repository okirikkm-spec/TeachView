const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const getDefaultHeaders = () => ({
  "ngrok-skip-browser-warning": "true",
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

const jsonHeaders = () => ({
  ...getDefaultHeaders(),
  "Content-Type": "application/json",
});

// ─── Tiers ───

export async function fetchTiers(authorId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/tiers/${authorId}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function createTier({ name, description, price, sortOrder }) {
  const res = await fetch(`${API_BASE}/api/subscriptions/tiers`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, description, price, sortOrder }),
  });
  if (!res.ok) throw new Error("Ошибка создания уровня подписки");
  return res.json();
}

export async function updateTier(tierId, { name, description, price, sortOrder }) {
  const res = await fetch(`${API_BASE}/api/subscriptions/tiers/${tierId}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, description, price, sortOrder }),
  });
  if (!res.ok) throw new Error("Ошибка обновления уровня подписки");
  return res.json();
}

export async function deleteTier(tierId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/tiers/${tierId}`, {
    method: "DELETE",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка удаления уровня подписки");
}

// ─── Subscriptions ───

export async function subscribe(tierId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/subscribe/${tierId}`, {
    method: "POST",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка оформления подписки");
  return res.json();
}

export async function unsubscribe(authorId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/unsubscribe/${authorId}`, {
    method: "POST",
    headers: getDefaultHeaders(),
  });
  if (!res.ok) throw new Error("Ошибка отмены подписки");
}

export async function fetchMySubscriptions() {
  const res = await fetch(`${API_BASE}/api/subscriptions/my`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return [];
  return res.json();
}

export async function checkSubscription(authorId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/check/${authorId}`, {
    headers: getDefaultHeaders(),
  });
  if (res.status === 204 || !res.ok) return null;
  return res.json();
}

export async function fetchSubscriberCount(authorId) {
  const res = await fetch(`${API_BASE}/api/subscriptions/count/${authorId}`, {
    headers: getDefaultHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.count || 0;
}
