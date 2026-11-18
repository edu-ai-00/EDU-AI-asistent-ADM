"""Generate the media used by the EDU AI demo courses (macOS).

Every image states what it is (size, format, role) so a tester can tell at a
glance whether the app picked the right asset and kept its aspect ratio. The
video and audio carry a Czech voice (macOS `say`, voice Zuzana) and the video
shows a running seconds counter, so "it plays" is visible on a screenshot.

vector.svg is hand-written and not generated here.

Needs Pillow and ffmpeg. Usage: python3 gen_media.py media
"""
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

PALETTE = {
    "indigo": ((79, 70, 229), (124, 58, 237)),
    "teal": ((13, 148, 136), (8, 145, 178)),
    "amber": ((217, 119, 6), (220, 38, 38)),
    "green": ((22, 163, 74), (13, 148, 136)),
    "slate": ((51, 65, 85), (30, 41, 59)),
    "pink": ((219, 39, 119), (124, 58, 237)),
}


def font(path, size):
    return ImageFont.truetype(path, size)


def gradient(w, h, c1, c2):
    img = Image.new("RGB", (w, h), c1)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w * 0.6 + y / h * 0.4)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img


def centered(draw, w, y, text, f, fill=(255, 255, 255)):
    tw = draw.textlength(text, font=f)
    draw.text(((w - tw) / 2, y), text, font=f, fill=fill)


def banner(name, w, h, colors, title, subtitle, fmt="PNG", tag=None):
    img = gradient(w, h, *PALETTE[colors])
    d = ImageDraw.Draw(img)
    # Decorative circles, so a stretched image is visibly stretched.
    r = min(w, h) // 5
    for i, (cx, cy) in enumerate([(w * 0.12, h * 0.25), (w * 0.88, h * 0.75)]):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255), width=max(2, r // 18))
    ts = max(24, min(w // 14, h // 5))
    centered(d, w, h / 2 - ts * 1.1, title, font(BOLD, ts))
    centered(d, w, h / 2 + ts * 0.25, subtitle, font(REG, max(16, ts // 2)))
    label = tag or f"{w}×{h} · {fmt.lower()} · kruhy musí být kulaté"
    lf = font(REG, max(12, ts // 3))
    d.text((16, h - lf.size - 14), label, font=lf, fill=(255, 255, 255))
    path = os.path.join(OUT, name)
    if fmt == "JPEG":
        img.save(path, fmt, quality=85)
    elif fmt == "WEBP":
        img.save(path, fmt, quality=85)
    else:
        img.save(path, fmt, optimize=True)
    return path


# Course + lesson covers
banner("cover.png", 1600, 900, "indigo", "Demo kurz EDU AI", "Všechny typy bloků, kroků a otázek",
       tag="Obrázek kurzu (header_image) · 1600×900 · musí být vidět v náhledu I po otevření kurzu")
# Step images in different shapes/formats
banner("landscape.jpg", 1280, 720, "teal", "Obrázek na šířku", "JPEG 16:9", fmt="JPEG")
banner("portrait.png", 600, 1000, "amber", "Na výšku", "PNG 3:5")
banner("square.webp", 800, 800, "green", "Čtverec", "WEBP 1:1", fmt="WEBP")
banner("panorama.jpg", 2400, 500, "slate", "Panorama 24:5", "Nesmí přetéct ani se oříznout", fmt="JPEG")
banner("feedback.png", 900, 400, "green", "Obrázek ve zpětné vazbě", "feedback_image u možnosti")
banner("solution.png", 900, 400, "indigo", "Obrázek v řešení", "solution_image")

# Transparent PNG (alpha must not turn black)
t = Image.new("RGBA", (600, 600), (0, 0, 0, 0))
d = ImageDraw.Draw(t)
d.ellipse([60, 60, 540, 540], fill=(79, 70, 229, 255))
d.polygon([(300, 120), (480, 450), (120, 450)], fill=(250, 204, 21, 230))
centered(d, 600, 270, "PNG s průhledností", font(BOLD, 40), fill=(15, 23, 42, 255))
centered(d, 600, 320, "pozadí nesmí být černé", font(REG, 26), fill=(15, 23, 42, 255))
t.save(os.path.join(OUT, "transparent.png"))

# Right triangle for the Pythagoras example (light background, used inline)
w, h = 900, 600
tri = Image.new("RGB", (w, h), (248, 250, 252))
d = ImageDraw.Draw(tri)
A, B, C = (150, 480), (750, 480), (150, 120)
d.polygon([A, B, C], outline=(30, 41, 59), width=6, fill=(224, 231, 255))
d.rectangle([150, 430, 200, 480], outline=(30, 41, 59), width=4)
f = font(BOLD, 48)
d.text((430, 495), "a", font=f, fill=(30, 41, 59))
d.text((95, 270), "b", font=f, fill=(30, 41, 59))
d.text((470, 250), "c", font=f, fill=(220, 38, 38))
d.text((560, 60), "a² + b² = c²", font=font(BOLD, 44), fill=(79, 70, 229))
d.text((20, h - 34), "900×600 · png · pravoúhlý trojúhelník", font=font(REG, 20), fill=(100, 116, 139))
tri.save(os.path.join(OUT, "triangle.png"))

# Video + audio. The background frame lives in a temp dir, not in media/.
FFMPEG = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
with tempfile.TemporaryDirectory() as tmp:
    old_out, OUT = OUT, tmp
    banner("video-bg.png", 1280, 720, "indigo", "Demo video EDU AI",
           "MP4 · H.264 + AAC · cca 9 s · počítadlo vpravo nahoře",
           tag="Pokud vidíš tenhle snímek a slyšíš hlas, video funguje")
    OUT = old_out
    voice = os.path.join(tmp, "video.aiff")
    subprocess.run(["say", "-v", "Zuzana", "-o", voice,
                    "Ahoj, tohle je demo video kurzu EDU AI. Pokud slyšíš tenhle hlas "
                    "a vidíš obraz, přehrávání videa funguje správně."], check=True)
    counter = (f"[0:v]drawtext=fontfile={BOLD.replace(' ', chr(92) + ' ')}:text='%{{eif\\:t\\:d}} s'"
               ":x=w-tw-40:y=40:fontsize=64:fontcolor=white:box=1:boxcolor=black@0.4"
               ":boxborderw=12,format=yuv420p[v]")
    subprocess.run(FFMPEG + ["-loop", "1", "-i", os.path.join(tmp, "video-bg.png"), "-i", voice,
                             "-filter_complex", counter, "-map", "[v]", "-map", "1:a",
                             "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-r", "25",
                             "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart",
                             os.path.join(OUT, "demo-video.mp4")], check=True)
    voice = os.path.join(tmp, "audio.aiff")
    subprocess.run(["say", "-v", "Zuzana", "-o", voice,
                    "Tohle je zvukový krok. Přehrávač musí jít spustit, pozastavit a posunout. "
                    "Délka nahrávky je zhruba deset sekund."], check=True)
    subprocess.run(FFMPEG + ["-i", voice, "-c:a", "libmp3lame", "-b:a", "96k",
                             os.path.join(OUT, "demo-audio.mp3")], check=True)

print("\n".join(sorted(os.listdir(OUT))))
