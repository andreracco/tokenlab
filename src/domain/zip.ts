export type ZipFile = { name: string; content: string };

const encoder = new TextEncoder();
// Fixed DOS timestamp (1980-01-01) keeps the archive byte-for-byte deterministic.
const DOS_DATE = 0x0021;
const UTF8_FLAG = 0x0800;

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Builds an uncompressed (stored) zip archive; token files are small enough that deflate adds nothing. */
export function createZip(files: ZipFile[]): Uint8Array<ArrayBuffer> {
  const entries = files.map((file) => {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    return { name, data, crc: crc32(data) };
  });
  const localSize = entries.reduce(
    (sum, { name, data }) => sum + 30 + name.length + data.length,
    0,
  );
  const centralSize = entries.reduce((sum, { name }) => sum + 46 + name.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  const offsets: number[] = [];

  for (const { name, data, crc } of entries) {
    offsets.push(offset);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, UTF8_FLAG, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, DOS_DATE, true);
    view.setUint32(offset + 14, crc, true);
    view.setUint32(offset + 18, data.length, true);
    view.setUint32(offset + 22, data.length, true);
    view.setUint16(offset + 26, name.length, true);
    output.set(name, offset + 30);
    output.set(data, offset + 30 + name.length);
    offset += 30 + name.length + data.length;
  }

  const centralStart = offset;
  entries.forEach(({ name, data, crc }, index) => {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, UTF8_FLAG, true);
    view.setUint16(offset + 14, DOS_DATE, true);
    view.setUint32(offset + 16, crc, true);
    view.setUint32(offset + 20, data.length, true);
    view.setUint32(offset + 24, data.length, true);
    view.setUint16(offset + 28, name.length, true);
    view.setUint32(offset + 42, offsets[index], true);
    output.set(name, offset + 46);
    offset += 46 + name.length;
  });

  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  return output;
}
