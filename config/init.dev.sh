#!/usr/bin/env bash

set -euo pipefail

timezone="${TZ:-Asia/Shanghai}"
printf '[Date]\ndate.timezone="%s"\n' "$timezone" > /etc/php82/conf.d/00_timezone.ini

echo "Starting h5ai development server (timezone: $timezone)..."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
