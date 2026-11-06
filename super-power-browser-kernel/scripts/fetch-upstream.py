"""Fetch the pinned public runtime and source without vendor tokens or installation paths."""
import argparse
import hashlib
import json
from pathlib import Path
import time
import urllib.request


def download(opener, url, target, expected=None):
    if target.exists() and expected:
        with target.open('rb') as existing:
            if hashlib.file_digest(existing, 'sha256').hexdigest() == expected:
                return
    partial = target.with_suffix(target.suffix + '.partial')
    started = time.monotonic()
    digest = hashlib.sha256()
    done = 0
    request = urllib.request.Request(url, headers={'User-Agent': 'SuperPowerBrowser-runtime-setup'})
    with opener.open(request, timeout=30) as response, partial.open('wb') as output:
        while chunk := response.read(1024 * 1024):
            if time.monotonic() - started > 600:
                raise TimeoutError('Runtime download exceeded ten minutes')
            digest.update(chunk)
            output.write(chunk)
            done += len(chunk)
            if done % (20 * 1024 * 1024) == 0:
                print(f'{target.name}: {done // (1024 * 1024)} MiB', flush=True)
    if expected and digest.hexdigest() != expected:
        partial.unlink()
        raise ValueError('Upstream SHA-256 mismatch')
    partial.replace(target)
    print(json.dumps({'file': target.name, 'bytes': done, 'sha256': digest.hexdigest()}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    parser.add_argument('--proxy')
    parser.add_argument('--lock', type=Path, default=Path(__file__).resolve().parent.parent / 'upstream.lock.json')
    args = parser.parse_args()
    lock = json.loads(args.lock.read_text(encoding='utf-8'))
    args.output.mkdir(parents=True, exist_ok=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': args.proxy} if args.proxy else {}))
    download(opener, lock['downloadUrl'], args.output / lock.get('archiveName', 'fingerprint-chromium-144-win-x64.zip'), lock['sha256'])
    download(opener, lock['sourceUrl'], args.output / ('source-' + lock['sourceCommit'] + '.zip'), lock.get('sourceSha256'))


if __name__ == '__main__':
    main()
