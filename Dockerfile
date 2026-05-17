# Шаг 1: Собираем React фронтенд
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY src/frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY src/frontend/ ./
RUN npm run build

# Шаг 2: Собираем Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /app
COPY pom.xml ./
RUN mvn dependency:go-offline
COPY src/main ./src/main
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static
RUN mvn package -DskipTests

# Шаг 3: Финальный образ (Debian-based для Python + faster-whisper)
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
# Neural networks disabled — no heavy dependencies needed
RUN pip install --no-cache-dir requests

COPY scripts /app/scripts
COPY --from=backend-build /app/target/*.jar app.jar

ENV TRANSCRIBE_SCRIPTS_DIR=/app/scripts
ENV HF_HOME=/app/whisper-cache

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
