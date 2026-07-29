#!/usr/bin/env python3
"""
Draws the app icon and splash mark.

Kept as code rather than a binary so the colours stay tied to the theme and
the thing can be retuned without a design tool.
"""
import math
import sys
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets"

BG = (13, 17, 23)          # theme.colors.bg.base
BALL = (214, 242, 60)      # theme.colors.accent.ball — optic yellow
BALL_SHADE = (176, 202, 40)
SEAM = (250, 252, 240)

SIZE = 1024
SS = 4  # supersample, then downscale, so the curves come out clean


def draw_ball(img: Image.Image, cx: float, cy: float, r: float):
    draw = ImageDraw.Draw(img)
    # Body, with a slightly darker lower edge so it reads as a sphere.
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BALL_SHADE)
    draw.ellipse([cx - r, cy - r * 1.04, cx + r, cy + r * 0.96], fill=BALL)

    # Each seam is a shallow arc hugging one side, running rim to rim and
    # bowing gently toward the middle. Curves that meet at the top and bottom
    # instead close into a leaf shape, which is not what a ball looks like.
    big = r * 1.75
    seams = Image.new("RGBA", img.size, (0, 0, 0, 0))
    seam_draw = ImageDraw.Draw(seams)
    for side in (-1, 1):
        ox = cx + side * (r * 2.0)
        box = [ox - big, cy - big, ox + big, cy + big]
        # The slice of that circle facing the ball's centre.
        start, end = (-45, 45) if side < 0 else (135, 225)
        seam_draw.arc(box, start=start, end=end, fill=SEAM, width=int(r * 0.1))

    # Clip the seams to the ball, so they stop at its edge instead of running on.
    ball_mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(ball_mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    clipped = Image.new("L", img.size, 0)
    clipped.paste(seams.split()[3], (0, 0), ball_mask)
    img.paste(seams, (0, 0), clipped)


def render(path: str, *, background, ball_fraction: float, flatten: bool = False):
    canvas = SIZE * SS
    img = Image.new("RGBA", (canvas, canvas), background)
    draw_ball(img, canvas / 2, canvas / 2, canvas * ball_fraction / 2)
    out = img.resize((SIZE, SIZE), Image.LANCZOS)
    # The App Store rejects an icon that carries an alpha channel at all, even
    # a fully opaque one (ITMS-90717). Drop it rather than rely on the build
    # pipeline to flatten it for us.
    if flatten:
        out = out.convert("RGB")
    out.save(path)
    print(f"{path}  {SIZE}x{SIZE}  {out.mode}")


# Full-bleed square; iOS applies its own rounding.
render(f"{OUT}/icon.png", background=BG + (255,), ball_fraction=0.68, flatten=True)
# The splash sits on the theme background already, so the mark is transparent.
render(f"{OUT}/splash-icon.png", background=(0, 0, 0, 0), ball_fraction=0.92)
# Android foreground needs generous padding for its own mask.
render(f"{OUT}/android-icon-foreground.png", background=(0, 0, 0, 0), ball_fraction=0.56)
