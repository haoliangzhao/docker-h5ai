# docker-h5ai Fork

This fork was developed with the help of `Codex`. It is based on
[awesometic/docker-h5ai](https://github.com/awesometic/docker-h5ai).

## Changes

- Adds light and dark themes.
- Improves the sidebar and responsive layout.
- Improves file selection, file information, and previews.
- Adds HEIC and HEIF image support.
- Adds an optional rendered README panel.
- Adds a live development mode with Docker Compose.

## How to Deploy

Docker Compose can build this image directly from GitHub. The repository does
not need to be cloned on the server.

Create a `docker-compose.yaml` file in a dedicated directory:

```yaml
services:
  h5ai:
    build:
      context: "https://github.com/haoliangzhao/docker-h5ai.git#master"
    image: docker-h5ai:prod
    container_name: docker-h5ai
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
    environment:
      PUID: "1000"
      PGID: "1000"
    volumes:
      - ./files:/h5ai:ro
      - ./config:/config
    logging:
      options:
        max-size: "10m"
        max-file: "3"
```

Place the files to be served in `./files`.
Change `PUID` and `PGID` if the files are owned by another user.

Build and start the container:

```bash
docker compose up -d --build
```


The service is available to a reverse proxy at `http://127.0.0.1:8080`.
