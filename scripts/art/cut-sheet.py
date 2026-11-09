"""Cut a GPT sheet of 512×512 cells into game files.

usage: python3 scripts/art/cut-sheet.py <sheet.png> <col,row:out.png[:icon]> ...
  col,row  1-based cell position on the sheet
  out.png  path under public/assets/ to write
  :icon    crop to the art's bounds (square, small padding) instead of keeping the full cell,
           for drawer icons that are shown centred rather than standing on an anchor
  :dy=N    shift the art N px down inside the cell (use the same N for every cell of one
           character so feet land on the shared anchor and the cells stay aligned)

Near-zero alpha noise (<= 3) is cleared so scaled sprites keep no dark haze.
The incoming sheet itself is never modified (public/assets/incoming/ is GPT's area).
"""
import sys, os
from PIL import Image

CELL = 512

def main():
    sheet = Image.open(sys.argv[1]).convert('RGBA')
    for spec in sys.argv[2:]:
        parts = spec.split(':')
        col, row = (int(v) for v in parts[0].split(','))
        out = os.path.join('public/assets', parts[1])
        cell = sheet.crop(((col - 1) * CELL, (row - 1) * CELL, col * CELL, row * CELL))
        cell.putalpha(cell.getchannel('A').point(lambda a: 0 if a <= 3 else a))
        for opt in parts[2:]:
            if opt.startswith('dy='):
                moved = Image.new('RGBA', cell.size, (0, 0, 0, 0))
                moved.paste(cell, (0, int(opt[3:])))
                cell = moved
        if 'icon' in parts[2:]:
            box = cell.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
            if box:
                side = max(box[2] - box[0], box[3] - box[1]) + 32
                cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
                square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
                square.paste(cell.crop(box), (side // 2 - (cx - box[0]), side // 2 - (cy - box[1])))
                cell = square.resize((256, 256), Image.LANCZOS)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        cell.save(out, optimize=True)
        print(out, cell.size)

if __name__ == '__main__':
    main()
