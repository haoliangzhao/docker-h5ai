# Validation record

Base: `0fdcac790e835e98105ad97f4ae9ba0c9bb9fb35` (master read on 2026-10-22).

Passed: git diff --check; Bash syntax checks; Python compilation; authentication
patch dry run; real Nginx 1.24.0 / PHP-FPM 8.3.6 config and HTTP tests with
temporary roots and port substitutions, using the repository application.
Default and explicit compatibility modes both passed.

HTTP coverage: directory listing despite shared index.php; POST options API;
static JS and file download; HEIF missing-input 400 and unsupported-format 415;
shared, mixed-case, encoded, backup suffix, PATH_INFO, cache and private PHP
denial; exact optional PHP page execution and its PATH_INFO denial.

Not run: Docker is unavailable. The production Alpine/Nginx 1.27/PHP 8.2 image
build, init/persistence lifecycle, real HEIC conversion/metadata and Docker
runner's missing-entry test require tests/php-routing.sh [sample.heic].
No claim is made that these tests passed. The host test changed root paths in
a disposable application copy to suit the local filesystem.

This is execution-scope hardening, not confirmation of a PHP2SHELL exploit.
