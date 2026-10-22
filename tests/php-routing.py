#!/usr/bin/env python3
"""HTTP regression test against a running test-only container (stdlib only).
Run tests/php-routing.sh; never point this at a production service.
"""
import json, sys, urllib.request, urllib.error
base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8080'

def request(path, expected=200, data=None):
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data else None,
                                 headers={'Content-Type': 'application/json'} if data else {})
    try:
        response = urllib.request.urlopen(req, timeout=15)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read()
    assert response.status == expected, (path, response.status, body[:300])
    assert b'PHP_SOURCE_SENTINEL' not in body, path
    return body, response.headers

for path in ['/index.php', '/sub/index.php', '/probe.php', '/sub/probe.php', '/probe.PHP', '/probe.php/extra',
             '/probe%2ephp', '/probe.phtml', '/probe.phar', '/probe.php.bak',
             '/missing.php', '/_h5ai/public/cache/probe.php',
             '/_h5ai/private/php/class-bootstrap.php', '/_h5ai/private/conf/options.json',
             '/_h5ai/public/index.php/extra', '/_h5ai/public/heif-preview.php/extra']:
    request(path, 404)
for path in ['/', '/sub/', '/_h5ai/public/index.php']:
    body, _ = request(path)
    assert b'h5ai' in body
assert request('/hello.txt')[0] == b'hello\n'
request('/_h5ai/public/js/heif-preview.js')
body, _ = request('/_h5ai/public/index.php', data={'action': 'get', 'options': True})
assert 'options' in json.loads(body), body[:300]
request('/_h5ai/public/heif-preview.php', 400)
request('/_h5ai/public/heif-preview.php?href=/hello.txt', 415)
# Optional fixture supplied by the operator, needed for real decoder verification.
if '--heif' in sys.argv:
    body, headers = request('/_h5ai/public/heif-preview.php?href=/sample.heic')
    assert headers.get_content_type() == 'image/jpeg' and body.startswith(b'\xff\xd8')
    body, _ = request('/_h5ai/public/heif-preview.php?href=/sample.heic&metadata=1')
    assert json.loads(body)['width'] > 0
if '--compat' in sys.argv:
    assert request('/tools/status.php')[0] == b'COMPAT_OK'
    request('/tools/status.php/extra', 404)
else:
    request('/tools/status.php', 404)
print('PASS: PHP routing, listing, API, static download, HEIF endpoint' + (' and decoder' if '--heif' in sys.argv else '') )
