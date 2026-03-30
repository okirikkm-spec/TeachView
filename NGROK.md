# Запуск проекта через ngrok

## Шаги

1. **Запусти Spring Boot** (бэкенд на порту 8080):
   ```bash
   mvn spring-boot:run
   ```

2. **Запусти ngrok** в отдельном терминале:
   ```bash
   ngrok http 8080
   ```

3. **Скопируй HTTPS-URL** из вывода ngrok (типа `https://abc123.ngrok-free.app`).

4. **Создай файл** `src/frontend/.env`:
   ```
   REACT_APP_API_BASE=https://твой-url.ngrok-free.app
   ```
   (подставь свой URL из шага 3)

5. **Запусти фронтенд**:
   ```bash
   cd src/frontend
   npm start
   ```

6. Открой приложение в браузере — оно будет обращаться к бэкенду через ngrok.

---

**Примечание:** При каждом перезапуске ngrok URL меняется (на бесплатном плане). Обновляй `.env` новым URL и перезапускай `npm start`.
