#!/usr/bin/env bash
# Builds the real image; requires Docker, Python 3 and curl. Optional HEIC fixture: $1.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
name="h5ai-routing-$$"
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
mkdir -p "$tmp/files/sub" "$tmp/files/tools" "$tmp/config/nginx/php-pages"
printf 'hello\n' > "$tmp/files/hello.txt"
for f in index.php probe.php sub/index.php sub/probe.php probe.PHP probe.phtml probe.phar probe.php.bak; do
    printf '<?php echo "PHP_SOURCE_SENTINEL"; ?>' > "$tmp/files/$f"
done
printf '<?php echo "COMPAT_OK"; ?>' > "$tmp/files/tools/status.php"
args=()
if [ -n "${1:-}" ]; then cp "$1" "$tmp/files/sample.heic"; args+=(--heif); fi
docker build -t docker-h5ai:routing-test .
start() {
    docker run -d --name "$name" -p 127.0.0.1::80 \
        -e TZ=UTC -v "$tmp/files:/h5ai:ro" -v "$tmp/config:/config" docker-h5ai:routing-test >/dev/null
    port=$(docker port "$name" 80/tcp | head -1)
    for i in {1..60}; do
        if curl -fsS "http://$port/hello.txt" >/dev/null; then return; fi
        sleep 1
    done
    docker logs "$name"; return 1
}
start
docker exec "$name" sh -c 'printf "<?php echo \"PHP_SOURCE_SENTINEL\"; ?>" > /config/h5ai/_h5ai/public/cache/probe.php'
docker exec "$name" nginx -t
docker exec "$name" php-fpm82 -t
python3 tests/php-routing.py "http://$port" "${args[@]}"
# Persistence: restarting must preserve a custom config rather than overwrite it.
printf '\n# persistence sentinel\n' >> "$tmp/config/nginx/h5ai.conf"
cp config/php-page.conf.example "$tmp/config/nginx/php-pages/status.conf"
docker rm -f "$name" >/dev/null
start
grep -q 'persistence sentinel' "$tmp/config/nginx/h5ai.conf"
python3 tests/php-routing.py "http://$port" --compat "${args[@]}"
# Missing exact application script must 404, never fall back to a nearby script.
docker exec "$name" mv /config/h5ai/_h5ai/public/heif-preview.php /config/h5ai/_h5ai/public/heif-preview.php.disabled
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://$port/_h5ai/public/heif-preview.php")" = 404 ]
