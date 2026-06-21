# Erzeugt einfache App-Icons ohne externe Bibliotheken (minimales PNG via stdlib).
import struct, zlib, os

def write_png(path, size, rgb):
    w = h = size
    raw = bytearray()
    row = bytes(rgb) * w
    for _ in range(h):
        raw.append(0)            # Filter-Typ 0
        raw.extend(row)
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # 8-bit, Truecolor
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

here = os.path.dirname(__file__)
write_png(os.path.join(here, "icon-192.png"), 192, (29, 185, 84))
write_png(os.path.join(here, "icon-512.png"), 512, (29, 185, 84))
print("icons written")
