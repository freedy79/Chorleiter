#!/usr/bin/env python3
"""
PWA Icon Generator für NAK Chorleiter
Erstellt Icons in verschiedenen Größen aus einem Basis-SVG
"""

import os
from PIL import Image, ImageDraw
from pathlib import Path

# Verzeichnis erstellen falls nicht vorhanden
icon_dir = Path("choir-app-frontend/public/assets/icons")
icon_dir.mkdir(parents=True, exist_ok=True)

# Farbschema
THEME_COLOR = (25, 118, 210)  # #1976d2 - Blau
ACCENT_COLOR = (255, 255, 255)  # Weiß
BG_COLOR = (255, 255, 255)  # Weiß
DARK_BG = (245, 245, 245)  # Hellgrau

def create_icon(size, filename, style="default"):
    """Erstellt ein Icon in der angegebenen Größe"""
    img = Image.new('RGBA', (size, size), (255, 255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Hintergrund
    if style == "maskable":
        # Für maskable icons: transparenter Hintergrund
        draw.rectangle([0, 0, size, size], fill=(255, 255, 255, 0))
    else:
        # Normales Icon mit weißem Hintergrund
        draw.rectangle([0, 0, size, size], fill=BG_COLOR)

    # Musik-Icon zeichnen
    margin = int(size * 0.15)
    inner_size = size - 2 * margin

    # Hintergrund-Kreis
    draw.ellipse(
        [margin, margin, margin + inner_size, margin + inner_size],
        fill=THEME_COLOR,
        outline=None
    )

    # Musiknoten-Symbol (vereinfacht)
    note_x = margin + int(inner_size * 0.3)
    note_y = margin + int(inner_size * 0.2)
    note_size = int(inner_size * 0.15)

    # Erste Note
    draw.ellipse(
        [note_x, note_y + note_size, note_x + note_size, note_y + 2 * note_size],
        fill=ACCENT_COLOR
    )
    draw.line(
        [(note_x + note_size, note_y + note_size), (note_x + note_size, note_y - int(inner_size * 0.3))],
        fill=ACCENT_COLOR,
        width=int(note_size * 0.3)
    )

    # Zweite Note
    note_x2 = note_x + int(inner_size * 0.35)
    draw.ellipse(
        [note_x2, note_y + int(inner_size * 0.1), note_x2 + note_size, note_y + int(inner_size * 0.25)],
        fill=ACCENT_COLOR
    )
    draw.line(
        [(note_x2 + note_size, note_y), (note_x2 + note_size, note_y - int(inner_size * 0.4))],
        fill=ACCENT_COLOR,
        width=int(note_size * 0.3)
    )

    # Balken zwischen den Noten
    draw.line(
        [(note_x + note_size, note_y - int(inner_size * 0.3)), (note_x2 + note_size, note_y - int(inner_size * 0.4))],
        fill=ACCENT_COLOR,
        width=int(note_size * 0.2)
    )

    # Speichern
    filepath = icon_dir / filename
    # PNG mit Alpha-Kanal speichern
    if style == "maskable":
        img.save(filepath, 'PNG')
    else:
        img.convert('RGB').save(filepath, 'PNG')

    print(f"✓ Erstellt: {filename} ({size}x{size})")

# Icons in verschiedenen Größen erstellen
sizes = {
    192: "icon-192x192.png",
    512: "icon-512x512.png",
    144: "icon-144x144.png",
    96: "icon-96x96.png",
}

for size, filename in sizes.items():
    create_icon(size, filename, style="default")

# Maskable Icons für bessere Android-Anpassung
maskable_sizes = {
    192: "icon-192x192-maskable.png",
    512: "icon-512x512-maskable.png",
}

for size, filename in maskable_sizes.items():
    create_icon(size, filename, style="maskable")

print("\n✓ Alle Icons erfolgreich erstellt!")

# Shortcut Icons
def create_shortcut_icon(size, filename, label_text, bg_color):
    """Erstellt Shortcut-Icons mit Text-Label"""
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Hintergrund
    draw.rectangle([0, 0, size, size], fill=bg_color)

    # Farbiger Kreis
    margin = int(size * 0.1)
    inner_size = size - 2 * margin
    draw.ellipse(
        [margin, margin, margin + inner_size, margin + inner_size],
        fill=THEME_COLOR
    )

    # Text (vereinfacht - ein Symbol statt Text)
    draw.text((size//2 - 5, size//2 - 5), "♪", fill=ACCENT_COLOR)

    filepath = icon_dir / filename
    img.save(filepath, 'PNG')
    print(f"✓ Shortcut erstellt: {filename}")

# Shortcut Icons
create_shortcut_icon(192, "shortcut-absence-192x192.png", "A", (232, 245, 233))
create_shortcut_icon(192, "shortcut-library-192x192.png", "L", (227, 242, 253))
create_shortcut_icon(192, "shortcut-performance-192x192.png", "E", (255, 243, 224))

# Screenshot Platzhalter
def create_screenshot(width, height, filename):
    """Erstellt Screenshot-Platzhalter"""
    img = Image.new('RGB', (width, height), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Einfache Gradientenoptik durch Rechtecke
    draw.rectangle([0, 0, width, height], fill=BG_COLOR)
    draw.rectangle([0, 0, width, int(height*0.1)], fill=THEME_COLOR)

    filepath = icon_dir / filename
    img.save(filepath, 'PNG')
    print(f"✓ Screenshot erstellt: {filename}")

create_screenshot(540, 720, "screenshot-1.png")
create_screenshot(1280, 720, "screenshot-2.png")

print("\n✓✓ PWA-Icon-Generierung abgeschlossen!")
