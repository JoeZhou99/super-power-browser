"""Publish immutable kernel artifacts through the authenticated control API.

Read SPB_API_URL / SPB_RELEASE_TOKEN from the environment. Never print signed URLs.
No cloud access key is needed on the publishing workstation.
"""
import argparse
import hashlib
import http.client
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def safe_url(value):
    url = urllib.parse.urlsplit(value)
    if url.username or url.password or url.fragment or not url.hostname:
        raise ValueError('Invalid service URL')
    if url.scheme != 'https' and not (url.scheme == 'http' and url.hostname in ('localhost', '127.0.0.1', '::1')):
        raise ValueError('HTTPS is required outside local development')
    return url


class ReleaseApi:
    def __init__(self):
        self.base = os.environ.get('SPB_API_URL', '').rstrip('/')
        safe_url(self.base)
        self.token = os.environ.get('SPB_RELEASE_TOKEN', '')
        if not self.token:
            raise ValueError('Set SPB_RELEASE_TOKEN to a platform publisher login token')
        self.opener = urllib.request.build_opener(NoRedirect())

    def call(self, route, data=None):
        payload = None if data is None else json.dumps(data).encode()
        request = urllib.request.Request(self.base + '/api/runtime' + route, data=payload,
                                        headers={'Authorization': 'Bearer ' + self.token, 'Content-Type': 'application/json'})
        try:
            with self.opener.open(request, timeout=240) as response:
                body = response.read()
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as error:
            message = 'Control API HTTP ' + str(error.code)
            try:
                message += ': ' + json.loads(error.read(4096)).get('message', '')
            except (ValueError, AttributeError):
                pass
            raise ValueError(message) from None


def verify(archive, descriptor):
    if archive.stat().st_size != descriptor['archiveBytes']:
        raise ValueError('Archive size differs from descriptor')
    with archive.open('rb') as stream:
        actual = hashlib.file_digest(stream, 'sha256').hexdigest()
    if actual != descriptor['sha256']:
        raise ValueError('Archive SHA-256 differs from descriptor')


def upload(ticket, archive):
    url = safe_url(ticket['url'])
    connection_type = http.client.HTTPSConnection if url.scheme == 'https' else http.client.HTTPConnection
    connection = connection_type(url.hostname, url.port, timeout=120)
    target = urllib.parse.urlunsplit(('', '', url.path, url.query, ''))
    headers = dict(ticket['headers'])
    if any(name.lower() == 'authorization' for name in headers):
        raise ValueError('Unexpected authorization header in upload ticket')
    if not any(name.lower() == 'content-length' for name in headers):
        headers['Content-Length'] = str(archive.stat().st_size)
    try:
        with archive.open('rb') as stream:
            connection.request('PUT', target, body=stream, headers=headers)
            response = connection.getresponse()
            # A previous attempt may already have uploaded this immutable object.
            # The publish/activate call still verifies its actual size and digest.
            if response.status not in (200, 201, 204, 412):
                raise ValueError('Object upload HTTP ' + str(response.status))
            response.read(4096)
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('list')
    publish = sub.add_parser('publish')
    publish.add_argument('manifest', type=Path)
    publish.add_argument('--version', required=True)
    publish.add_argument('--platform', choices=['win32', 'darwin'])
    publish.add_argument('--arch', choices=['x64', 'arm64'])
    publish.add_argument('--recommended', action='store_true')
    migrate = sub.add_parser('migrate')
    migrate.add_argument('release_id')
    migrate.add_argument('archive', type=Path)
    sub.add_parser('disable').add_argument('release_id')
    enable = sub.add_parser('enable')
    enable.add_argument('release_id')
    enable.add_argument('--recommended', action='store_true')
    args = parser.parse_args()
    api = ReleaseApi()
    if args.command == 'list':
        for row in api.call('/releases')['items']:
            print(json.dumps({k: row[k] for k in ('id', 'version', 'platform', 'arch', 'fullVersion', 'state', 'recommended', 'storageType', 'sha256')}, ensure_ascii=False))
        return
    if args.command == 'disable':
        api.call('/releases/' + args.release_id + '/disable', {})
        print('Release disabled; stored artifact retained')
        return
    if args.command == 'enable':
        result = api.call('/releases/' + args.release_id + '/publish', {'recommended': args.recommended})
    elif args.command == 'migrate':
        row = next((r for r in api.call('/releases')['items'] if r['id'] == args.release_id), None)
        if row is None:
            raise ValueError('Release not found')
        verify(args.archive, row)
        upload(api.call('/releases/' + args.release_id + '/storage/upload', {}), args.archive)
        result = api.call('/releases/' + args.release_id + '/storage/activate', {})
    else:
        manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
        matches = [d for d in manifest['kernels'] if str(d['version']) == args.version and (not args.platform or d['platform'] == args.platform) and (not args.arch or d['arch'] == args.arch)]
        if len(matches) != 1:
            raise ValueError('Select exactly one release with --version, --platform and --arch')
        descriptor = matches[0]
        root = args.manifest.resolve().parent
        archive = (root / descriptor['archive']).resolve()
        if not archive.is_relative_to(root):
            raise ValueError('Archive path escapes manifest directory')
        verify(archive, descriptor)
        row = api.call('/releases', descriptor)
        if row['state'] == 'DRAFT':
            upload(api.call('/releases/' + row['id'] + '/upload', {}), archive)
        result = api.call('/releases/' + row['id'] + '/publish', {'recommended': args.recommended})
    print(json.dumps({k: result[k] for k in ('id', 'version', 'platform', 'arch', 'state', 'recommended', 'storageType')}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, http.client.HTTPException) as error:
        # Generic network errors must not leak signed URLs or credentials.
        print(str(error) if isinstance(error, ValueError) else 'Release operation failed; check configuration, network and local files', file=sys.stderr)
        sys.exit(1)
