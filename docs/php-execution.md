# PHP execution defaults and migration

The default Nginx server executes exactly `/_h5ai/public/index.php` (UI,
listing, API, archives and thumbnails) and `/_h5ai/public/heif-preview.php`
(HEIF metadata and JPEG conversion). Internal PHP classes are loaded by PHP,
not exposed as HTTP entry points. Private application files return 404.

All other PHP-like URIs return 404, including shared PHP files, uppercase
suffixes, PATH_INFO, public cache scripts, `.phtml`, `.phar` and `.php.bak`.
They are not served as source. HTML indexes and static downloads remain available;
a shared `index.php` no longer shadows h5ai's directory listing.
Exact entry points use fixed script filenames and `try_files` checks.
PHP-FPM listens on loopback, restricts executable extensions to `.php`, and
`cgi.fix_pathinfo=0` disables script guessing. These FPM controls alone do NOT
prevent execution of shared `.php` files with an old Nginx configuration.

This reduces executable HTTP entry points; it does not establish exploitability
or remediation of a specific PHP2SHELL vulnerability. It is not isolation from
compromised application code. Keep PHP, Nginx and media decoders maintained.
The existing init process makes `/config` writable by the application user;
protect it and do not allow untrusted users to change application code or allowlists.

## Existing Docker Compose deployments

Run from the directory containing your Compose file. The commands below assume
the README service name `h5ai` and bind mount `./config:/config`. For named volumes,
use a temporary container mounting that volume to perform the same backup and
replacement. Do not delete the entire `/config` volume or its h5ai settings/cache.

1. Build the patched revision (use the patch branch/commit until merged):

   ```bash
   docker compose build --pull h5ai
   ```

   When building remotely, change `build.context` to the patched branch or commit.
   Building master before the patch is merged will retain the old configuration.

2. Extract the new default **without starting init**. This works even though an
   existing container already has `/config` mounted. Keep a backup outside any
   Nginx include directory:

   ```bash
   image=$(docker compose images -q h5ai | head -n 1)
   test -n "$image"
   docker run --rm --entrypoint cat "$image" \
     /usr/share/h5ai-defaults/h5ai.conf > h5ai.conf.new
   test -s h5ai.conf.new
   cp -p ./config/nginx/h5ai.conf ./h5ai.conf.backup
   diff -u ./config/nginx/h5ai.conf ./h5ai.conf.new || true
   ```

3. Merge your TLS, authentication, headers and routing customizations into
   `h5ai.conf.new`; remove old broad PHP handlers. Preserve both exact application
   locations and the deny rule. Review any custom `location`, `alias`, `^~` or
   rewrite that could bypass the deny rule. If using `HTPASSWD=true`, init will
   apply the authentication patch when the new config has no auth directives.
   Keep the environment setting consistent with custom authentication.

4. Replace the persisted configuration and recreate. Stop first to avoid serving
   requests while editing and to avoid symlink/bind mount inode surprises:

   ```bash
   docker compose stop h5ai
   mkdir -p ./config/nginx/php-pages
   cp ./h5ai.conf.new ./config/nginx/h5ai.conf
   docker compose up -d --force-recreate h5ai
   docker compose exec -T h5ai nginx -t
   docker compose exec -T h5ai php-fpm82 -t
   docker compose exec -T h5ai nginx -T
   ```

   Check the effective configuration has only intended FastCGI locations, then
   test a directory listing, static download and an actual HEIC preview. A request
   to a test PHP file in the shared directory must return 404 without source or
   execution. Init now validates config before starting services. If it fails,
   inspect `docker compose logs h5ai`.

Rollback: stop the service, restore `./h5ai.conf.backup` to
`./config/nginx/h5ai.conf`, then recreate. Restoring the old config also restores
its broader PHP execution policy. Image rebuilds and container recreation alone
never replace an existing persisted Nginx config.

## Explicit compatibility for trusted PHP pages

The default includes `/config/nginx/php-pages/*.conf` inside the server, before
its deny rule. No pages are enabled automatically. Copy
`config/php-page.conf.example` to `./config/nginx/php-pages/status.conf`, edit
both its exact URI and fixed filename, validate with `nginx -t`, then reload
Nginx (or recreate). For example it allows only `/tools/status.php`, not other
scripts in `/tools/`, and rejects `/tools/status.php/extra`. A missing file is 404.

Never allowlist cache or upload directories, or use a general PHP regex.
For a trusted PHP directory index, also explicitly configure that directory's
`index` directive to include its allowlisted page. Preserve authentication at
server level so both core and optional exact locations inherit it. Allowlisting
shared PHP intentionally restores code execution for those pages; ensure their
files cannot be replaced by untrusted writers.

## Regression tests

```bash
# Docker + Python 3 + curl; uses disposable config and shared-file directories.
./tests/php-routing.sh
# Include a real HEIC fixture to also verify JPEG conversion and metadata:
./tests/php-routing.sh /absolute/path/to/sample.heic
```

The test builds the actual image, validates Nginx/FPM, checks directory listings,
API, static downloads, blocked suffixes/PATH_INFO/cache/private files, exact-page
compatibility, missing entry points, and configuration persistence on recreation.
The optional HEIC test requires a decodable fixture; endpoint routing/error tests
alone do not verify the decoder. Tests never mount production configuration.
