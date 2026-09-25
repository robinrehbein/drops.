# syntax=docker/dockerfile:1
# Build context: repository root (the server shares :core with the apps).

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts gradle.properties ./
COPY gradle ./gradle
COPY core ./core
COPY server ./server
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon -Pdrops.serverOnly=true :server:installDist

FROM eclipse-temurin:21-jre
RUN groupadd --system drops && useradd --system --gid drops --home /app drops \
    && mkdir -p /data && chown drops:drops /data
COPY --from=build /src/server/build/install/server /app
USER drops
ENV PORT=8080 \
    DATABASE_PATH=/data/drops.db \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/bin/server"]
