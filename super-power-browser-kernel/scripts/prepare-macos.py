"""Prepare a pinned DMG on macOS without installing it or changing signatures."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def package_app(app, archive, arch, full_version):
    metadata = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
    if metadata.get('CFBundleShortVersionString') != full_version:
        raise ValueError('App version differs from pinned fullVersion')
    main = app / 'Contents/MacOS' / metadata['CFBundleExecutable']
    if not main.is_file() or main.is_symlink() or not os.access(main, os.X_OK):
        raise ValueError('Missing executable in app bundle')
    cpu = 'x86_64' if arch == 'x64' else 'arm64'
    subprocess.run(['lipo', '-verify_arch', cpu, str(main)], check=True)
    subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for directory, dirs, files in os.walk(app, followlinks=False):
            dirs.sort()
            for name in sorted(dirs + files):
                file = Path(directory) / name
                relative = file.relative_to(app.parent).as_posix()
                if file.is_symlink():
                    target = os.readlink(file)
                    if os.path.isabs(target) or not file.resolve(strict=True).is_relative_to(app.resolve()):
                        raise ValueError('App link escapes bundle or is broken: ' + relative)
                    entry = zipfile.ZipInfo(relative)
                    entry.create_system = 3
                    entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                    output.writestr(entry, target.encode('utf-8'))
                elif file.is_file():
                    with file.open('rb') as stream:
                        magic = stream.read(4)
                    if magic in (b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'\xca\xfe\xba\xbe', b'\xca\xfe\xba\xbf'):
                        subprocess.run(['lipo', '-verify_arch', cpu, str(file)], check=True)
                    output.write(file, relative)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dmg', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--arch', choices=['x64', 'arm64'], required=True)
    parser.add_argument('--lock', type=Path, default=Path(__file__).resolve().parent.parent / 'upstream.mac.lock.json')
    args = parser.parse_args()
    if sys.platform != 'darwin':
        raise ValueError('Prepare the Mac runtime on macOS (hdiutil, lipo, codesign required)')
    lock = json.loads(args.lock.read_text(encoding='utf-8'))
    if lock['platform'] != 'darwin' or args.dmg.stat().st_size != lock['archiveBytes'] or digest(args.dmg) != lock['sha256']:
        raise ValueError('DMG differs from pinned metadata')
    args.output.mkdir(parents=True, exist_ok=True)
    archive = args.output / f"kernel-{lock['version']}-mac-{args.arch}.zip"
    metadata = archive.with_suffix('.lock.json')
    if archive.exists() or metadata.exists():
        raise ValueError('Output already exists; reuse verified outputs or choose an empty directory')
    with tempfile.TemporaryDirectory(prefix='spb-kernel-mac-') as folder:
        mount = Path(folder) / 'volume'
        subprocess.run(['hdiutil', 'attach', '-readonly', '-nobrowse', '-mountpoint', str(mount), str(args.dmg.resolve())], check=True, stdout=subprocess.DEVNULL)
        try:
            apps = [p for p in mount.glob('*.app') if p.is_dir() and not p.is_symlink()]
            if len(apps) != 1:
                raise ValueError('Expected exactly one app at DMG root')
            temporary = Path(folder) / 'runtime.zip'
            package_app(apps[0], temporary, args.arch, lock['fullVersion'])
            lock.update(arch=args.arch, upstreamSha256=lock['sha256'], sha256=digest(temporary), archiveBytes=temporary.stat().st_size, archiveName=archive.name)
            lock['verification'] = 'DMG checksum, app version/signature, Mach-O architectures, internal links and permissions checked; native startup acceptance still required.'
            with archive.open('xb') as target, temporary.open('rb') as source:
                shutil.copyfileobj(source, target)
            with metadata.open('x', encoding='utf-8') as target:
                json.dump(lock, target, ensure_ascii=False, indent=2)
        finally:
            subprocess.run(['hdiutil', 'detach', str(mount)], check=True, stdout=subprocess.DEVNULL)
    print(json.dumps({'archive': str(archive), 'lock': str(metadata), 'arch': args.arch}))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
