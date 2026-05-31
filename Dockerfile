# Step 1: Build React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY src/frontend/ ./
RUN npm run build

# Step 2: Build Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline
COPY src/main ./src/main
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static
RUN mvn package -DskipTests

# Step 3: Final image.
# Транскрипция/теги — через OpenAI API.
# Кодирование видео — ffmpeg, поддерживает CPU (libx264) и GPU (h264_nvenc).
# Для GPU нужны на хосте: NVIDIA-драйвер + nvidia-container-toolkit, плюс запуск
# с docker-compose.gpu.yml (он добавит device reservations для CUDA).
# В пакете ffmpeg из Debian/Ubuntu nvenc уже включён, runtime-библиотеки NVIDIA
# подмонтирует nvidia-container-toolkit автоматически.
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg python3 python3-pip python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir "openai>=1.40.0" "httpx[socks]>=0.27"

COPY scripts /app/scripts
COPY --from=backend-build /app/target/*.jar app.jar

ENV TRANSCRIBE_SCRIPTS_DIR=/app/scripts

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
