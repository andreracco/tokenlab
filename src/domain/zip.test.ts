import { describe, expect, it } from "vitest";
import { crc32, createZip } from "./zip";

describe("createZip", () => {
  it("matches the published CRC-32 check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a readable archive whose central directory matches the local entries", () => {
    const files = [
      { name: "tokenlab.css", content: ":root { --a: 1; }\n" },
      { name: "notes/ü.md", content: "# Token ✓\n" },
    ];
    const zip = createZip(files);
    const view = new DataView(zip.buffer);
    const decoder = new TextDecoder();

    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(files.length);

    let central = view.getUint32(end + 16, true);
    for (const file of files) {
      expect(view.getUint32(central, true)).toBe(0x02014b50);
      const nameLength = view.getUint16(central + 28, true);
      const local = view.getUint32(central + 42, true);
      expect(decoder.decode(zip.subarray(central + 46, central + 46 + nameLength))).toBe(file.name);

      expect(view.getUint32(local, true)).toBe(0x04034b50);
      const size = view.getUint32(local + 18, true);
      const dataStart = local + 30 + view.getUint16(local + 26, true);
      const data = zip.subarray(dataStart, dataStart + size);
      expect(decoder.decode(data)).toBe(file.content);
      expect(view.getUint32(local + 14, true)).toBe(crc32(data));
      central += 46 + nameLength;
    }
  });

  it("is deterministic", () => {
    const files = [{ name: "a.txt", content: "same" }];
    expect(createZip(files)).toEqual(createZip(files));
  });
});
