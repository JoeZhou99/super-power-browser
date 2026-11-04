// Dependency-free ZIP writer (stored entries). The two native-client packages
// must have manifest.json at archive root, with UTF-8 paths.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const table = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(data) { let n = 0xffffffff; for (const byte of data) n = table[(n ^ byte) & 255] ^ (n >>> 8); return (n ^ 0xffffffff) >>> 0; }
export async function files(directory, prefix = '') {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const relative = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error(`不支持符号链接: ${relative}`);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative + '/'));
    else result.push(relative);
  }
  return result;
}
export async function zipDirectory(directory) {
  const local = [], central = []; let offset = 0;
  for (const file of await files(directory)) {
    const name = Buffer.from(file), data = await readFile(path.join(directory, file));
    const crc = crc32(data), header = Buffer.alloc(30), entry = Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22); header.writeUInt16LE(name.length, 26);
    entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x800, 8);
    entry.writeUInt16LE(33, 14); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(data.length, 20); entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    local.push(header, name, data); central.push(entry, name); offset += header.length + name.length + data.length;
  }
  const directoryData = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(directoryData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directoryData, end]);
}
