#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EG (Evangelisches Gesangbuch) – Stammteil CSV (Nr 1–535)
Spalten: Nr; Titel; Rubrik; Komponist; Dichter
- Komponist/Dichter OHNE Jahreszahlen (werden entfernt).
- TLS steuerbar (system/certifi/none/--verify-path).
- Robuste Nummern+Titel-Erkennung direkt aus dem HTML (Regex), damit nicht nur 1 Titel geladen wird.

Benutzung (eine Variante wählen):
    pip install -U requests beautifulsoup4 tqdm certifi
    python eg_scraper.py --verify certifi
    # oder: python eg_scraper.py --verify-path /pfad/zu/firmenca.pem
    # Notlösung (unsicher): python eg_scraper.py --verify none
"""
import csv, re, sys, time, argparse
from typing import Dict, List, Tuple, Union
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm

try:
    import certifi
except Exception:
    certifi = None

WIKI_URL = "https://de.wikipedia.org/wiki/Liste_der_Kirchenlieder_im_Evangelischen_Gesangbuch"
LIEDERDB_URL = "https://liederdatenbank.strehle.de/songbook/8984"
BASE_SONG_URL = "https://liederdatenbank.strehle.de"
OUT_CSV = "EG_1-535.csv"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
}

VerifyType = Union[bool, str, None]

def resolve_verify(args) -> VerifyType:
    if args.verify_path:
        return args.verify_path
    choice = (args.verify or "system").lower()
    if choice == "none":
        return False
    if choice == "certifi":
        if certifi is None:
            print("HINWEIS: 'certifi' nicht installiert, nutze 'system'.", file=sys.stderr)
            return None
        return certifi.where()
    return None  # system/default

def clean_name(s: str) -> str:
    if not s:
        return ""
    # (1623–1676) / (1623) / 1623 entfernen
    s = re.sub(r"\(\s*\d{3,4}\s*[–-]\s*\d{1,4}\s*\)", "", s)
    s = re.sub(r"[\(\[]\s*\d{3,4}\s*[\)\]]", "", s)
    s = re.sub(r"\b\d{3,4}\b", "", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" ,;/")
    return s

def fetch_rubrik_for_nr(verify: VerifyType) -> Dict[int, str]:
    """Rubrik-Mapping {nr: rubrik}. Fällt bei Fehlern auf {} (Rubrik bleibt dann leer)."""
    try:
        resp = requests.get(WIKI_URL, headers=HEADERS, timeout=60, verify=verify)
        resp.raise_for_status()
    except requests.exceptions.SSLError as e:
        print(f"WARNUNG: SSL-Fehler Wikipedia: {e}", file=sys.stderr)
        print("Tipp: '--verify certifi' oder '--verify-path /pfad/ca.pem' oder '--verify none' (unsicher).", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"WARNUNG: Wikipedia nicht ladbar: {e}", file=sys.stderr)
        return {}
    soup = BeautifulSoup(resp.text, "html.parser")

    known = {
        "Advent","Weihnachten","Jahreswende","Epiphanias","Passion","Ostern",
        "Himmelfahrt","Pfingsten","Trinitatis","Besondere Tage","Ende des Kirchenjahres",
        "Eingang und Ausgang","Liturgische Gesänge","Wort Gottes","Taufe und Konfirmation",
        "Abendmahl","Beichte","Trauung","Sammlung und Sendung","Ökumene",
        "Psalmen und Lobgesänge","Biblische Erzähllieder",
        "Loben und Danken","Rechtfertigung und Zuversicht","Angst und Vertrauen",
        "Umkehr und Nachfolge","Geborgen in Gottes Liebe","Nächsten- und Feindesliebe",
        "Erhaltung der Schöpfung, Frieden und Gerechtigkeit","Morgen","Mittag und tägliches Brot",
        "Abend","Arbeit","Auf Reisen","Natur und Jahreszeiten",
        "Sterben und ewiges Leben, Bestattung"
    }
    rubrik_for_nr: Dict[int, str] = {}
    current = None

    for tag in soup.find_all(["h2","h3","ul","ol"]):
        if tag.name in ("h2","h3"):
            span = tag.find("span", class_="mw-headline")
            title = span.get_text(strip=True) if span else None
            if title in known:
                current = title
        elif tag.name in ("ul","ol") and current:
            for li in tag.find_all("li", recursive=False):
                text = li.get_text(" ", strip=True)
                m = re.match(r"^(\d{1,3})(?:\.\d+)?\s+", text)
                if m:
                    nr = int(m.group(1))
                    if 1 <= nr <= 535:
                        rubrik_for_nr.setdefault(nr, current)
    return rubrik_for_nr

def fetch_titles_and_song_links(verify: VerifyType) -> List[Tuple[int, str, str]]:
    """
    Robust: extrahiert Nummer+Titel direkt aus dem HTML mit Regex:
      <Zahl><whitespace><a href="/song/ID">Titel</a>
    Dadurch funktionieren auch Seiten, bei denen die Nummer nicht sauber im selben Tag steht.
    """
    try:
        resp = requests.get(LIEDERDB_URL, headers=HEADERS, timeout=60, verify=verify)
        resp.raise_for_status()
    except Exception as e:
        print(f"FEHLER: Liederdatenbank nicht ladbar: {e}", file=sys.stderr)
        return []

    html = resp.text
    # Matches: [Zahl] optional Spaces/Entities, dann der Song-Link
    # Beispiele im Quelltext: '1&nbsp;<a href="/song/123">Macht hoch…</a>'
    pattern = re.compile(r'(\d{1,3})\s*(?:&nbsp;|\s)*<a\s+href="(/song/\d+)">([^<]+)</a>', re.IGNORECASE)
    items = []
    for nr_str, href, title in pattern.findall(html):
        nr = int(nr_str)
        if 1 <= nr <= 535:
            link = requests.compat.urljoin(BASE_SONG_URL, href)
            # Titel aufräumen
            title = re.sub(r"\s{2,}", " ", title).strip()
            items.append((nr, title, link))

    # Dedup: gleiche EG-Nummer kann mehrfach vorkommen (z. B. 45 in mehreren Sprachen) -> ersten Eintrag behalten
    seen = set()
    unique = []
    for nr, title, link in items:
        if nr not in seen:
            seen.add(nr)
            unique.append((nr, title, link))
    unique.sort(key=lambda x: x[0])
    print(f"DEBUG: Gefundene Titel gesamt (vor Dedup): {len(items)}, einzigartig: {len(unique)}", file=sys.stderr)
    return unique

def fetch_authors_for_song(song_url: str, verify: VerifyType) -> Tuple[str,str]:
    """Gibt (Komponist, Dichter) zurück – aus Feldern 'Melodie:' und 'Text:' der Einzelseite."""
    try:
        resp = requests.get(song_url, headers=HEADERS, timeout=60, verify=verify)
        resp.raise_for_status()
    except Exception:
        return "", ""
    page_text = resp.text
    # Erst reines Textbild erzeugen
    text = BeautifulSoup(page_text, "html.parser").get_text("\n", strip=True)
    mt = re.search(r"Text\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    mm = re.search(r"Melodie\s*:\s*([^\n\r]+)", text, re.IGNORECASE)
    dichter  = clean_name(mt.group(1)) if mt else ""
    komponist = clean_name(mm.group(1)) if mm else ""
    return komponist, dichter

def main():
    ap = argparse.ArgumentParser(description="Erzeuge EG_1-535.csv (Nr;Titel;Rubrik;Komponist;Dichter)")
    ap.add_argument("--verify", choices=["system","certifi","none"], default="system",
                    help="TLS-Prüfung: system|certifi|none (unsicher)")
    ap.add_argument("--verify-path", default=None,
                    help="Pfad zu eigenem CA-Bundle (PEM). Überschreibt --verify.")
    ap.add_argument("--delay", type=float, default=0.15, help="Wartezeit zwischen Song-Abrufen (s)")
    args = ap.parse_args()

    verify = resolve_verify(args)
    print(f"TLS-Verify: {verify if isinstance(verify,str) else ('aus' if verify is False else 'system')}", file=sys.stderr)

    print("1/3: Rubriken (Wikipedia) …", file=sys.stderr)
    rubrik_for_nr = fetch_rubrik_for_nr(verify)

    print("2/3: Titel+Links (Liederdatenbank) …", file=sys.stderr)
    songs = fetch_titles_and_song_links(verify)
    if len(songs) < 400:
        print("WARNUNG: Deutlich weniger als erwartet – Netz/HTML prüfen. CSV wird dennoch erstellt.", file=sys.stderr)

    print("3/3: Melodie/Text je Lied …", file=sys.stderr)
    rows = []
    for nr, title, link in tqdm(songs, desc="Abruf Autoren"):
        komponist, dichter = fetch_authors_for_song(link, verify)
        rubrik = rubrik_for_nr.get(nr, "")
        rows.append([nr, title, rubrik, komponist, dichter])
        time.sleep(max(0.0, args.delay))

    with open(OUT_CSV, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(["Nr", "Titel", "Rubrik", "Komponist", "Dichter"])
        w.writerows(rows)

    print(f"Fertig: {OUT_CSV} ({len(rows)} Zeilen).", file=sys.stderr)
    if not rubrik_for_nr:
        print("HINWEIS: Rubriken leer (Wikipedia-SSL?). Du kannst sie später nachtragen.", file=sys.stderr)

if __name__ == "__main__":
    main()
