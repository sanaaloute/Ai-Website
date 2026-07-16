FROM alpine:latest

ARG PB_VERSION=0.22.46
ARG TARGETARCH

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

WORKDIR /pb

# Download the appropriate binary for the build architecture
RUN case "${TARGETARCH}" in \
    amd64)  PB_ARCH=linux_amd64 ;; \
    arm64)  PB_ARCH=linux_arm64 ;; \
    *)      PB_ARCH=linux_amd64 ;; \
    esac && \
    wget -qO pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" && \
    unzip -q pocketbase.zip && \
    rm pocketbase.zip && \
    chmod +x /pb/pocketbase

# Copy migrations and hooks so the schema is applied on first run
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
