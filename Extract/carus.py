import csv
import sys
import time
import os
import re
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

URL = "https://www.carus-verlag.com/musiknoten-und-aufnahmen/chorbuch-advent-208200.html"
DEFAULT_OUTPUT_CSV = "chorbuch_advent.csv"
ERROR_LOG = "errors.log"

def normalize(text: str) -> str:
    return " ".join(text.strip().split())

def clean_zur_person(text: str) -> str:
    """Entfernt die Phrase 'zur Person' (falls vorhanden) und normalisiert."""
    if not text:
        return ""
    cleaned = re.sub(r'\bzur Person\b', '', text, flags=re.IGNORECASE)
    return normalize(cleaned)

def clean_tonart(text: str) -> str:
    """Entfernt '-Moll' und '-Dur' aus der Tonart und normalisiert."""
    if not text:
        return ""
    t = normalize(text)
    t = re.sub(r'(?i)-moll', '', t)
    t = re.sub(r'(?i)-dur', '', t)
    return t.strip()

def format_person_name(name: str) -> str:
    """Wandelt 'Vorname Mittelname Nachname' in 'Nachname, Vorname Mittelname' um. Einzelne Wörter bleiben."""
    name = clean_zur_person(name)
    if not name:
        return ""
    if "," in name:
        return name  # schon formatiert
    parts = name.split()
    if len(parts) == 1:
        return parts[0]
    lastname = parts[-1]
    given = " ".join(parts[:-1])
    return f"{lastname}, {given}"

def remove_cookie_banner_completely(page):
    """Entfernt das Cookie-Banner/Overlay einmalig vollständig."""
    try:
        for sel in ["button:has-text('Alle akzeptieren')", "button:has-text('Akzeptieren')", "button:has-text('Alles akzeptieren')"]:
            btn = page.locator(sel)
            if btn.count() and btn.is_visible():
                try:
                    btn.click(timeout=1500)
                    time.sleep(0.2)
                except:
                    pass
        page.evaluate("""
            () => {
                const toRemove = [];
                ['CybotCookiebotDialog', 'CybotCookiebotDialogBodyUnderlay',
                 'CybotCookiebotDialogBodyContent', 'CybotCookiebotDialogRoot'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) toRemove.push(el);
                });
                document.querySelectorAll('[id^="CybotCookiebot"], .CybotMultilevel, .CybotCookiebotDialogActive').forEach(e => toRemove.push(e));
                toRemove.forEach(e => e.remove());
            }
        """)
        print("    -> Cookie-Banner/Overlay vollständig entfernt.")
        time.sleep(0.2)
    except Exception as e:
        print("    ! Fehler beim Entfernen des Cookie-Banners:", e)

def wait_until_panel_loaded(panel, timeout_ms=5000):
    """Warte darauf, dass der Panel-Inhalt vollständig geladen ist."""
    start = time.time()
    try:
        panel.locator("div.work-item-info").wait_for(state="visible", timeout=1500)
        return
    except:
        pass
    deadline = start + timeout_ms / 1000
    prev = None
    stable = 0
    while time.time() < deadline:
        try:
            current = panel.inner_html()
        except:
            current = ""
        if prev is not None and current == prev:
            stable += 1
            if stable >= 3:
                return
        else:
            stable = 0
            prev = current
        time.sleep(0.2)
    return

def open_entry_and_wait(link, panel, page):
    """Robust versuchen, einen Eintrag zu öffnen und warten, bis sein Panel geladen ist."""
    description = "Eintrag öffnen"
    try:
        link.click(timeout=5000)
    except Exception:
        pass
    time.sleep(0.2)
    if panel.is_visible():
        wait_until_panel_loaded(panel)
        return True

    try:
        link.evaluate("(el) => el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view: window}))")
    except Exception:
        pass
    time.sleep(0.2)
    if panel.is_visible():
        wait_until_panel_loaded(panel)
        return True

    try:
        link.scroll_into_view_if_needed()
    except:
        pass
    try:
        link.click(timeout=5000)
    except:
        pass
    time.sleep(0.3)
    if panel.is_visible():
        wait_until_panel_loaded(panel)
        return True

    try:
        link.click(force=True)
        print(f"        -> {description}: force-Klick verwendet.")
    except Exception:
        pass
    time.sleep(0.3)
    if panel.is_visible():
        wait_until_panel_loaded(panel)
        return True

    print(f"        ! {description} gescheitert, Panel nicht sichtbar.")
    return False

def load_existing_seen(csv_path):
    seen = set()
    if os.path.isfile(csv_path):
        try:
            with open(csv_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f, delimiter=';')
                for row in reader:
                    key = (
                        normalize(row.get("Komponist", "")),
                        normalize(row.get("Titel", "")),
                        normalize(row.get("Tonart", "")),
                        normalize(row.get("Besetzung", "")),
                        normalize(row.get("Textquelle", "")),
                        normalize(row.get("Dichter", "")),
                    )
                    seen.add(key)
            print(f"[*] Bereits {len(seen)} vorhandene Einträge aus '{csv_path}' geladen (Duplikat-Vermeidung).")
        except Exception as e:
            print(f"    ! Konnte vorhandene CSV nicht lesen: {e}")
    return seen

def scrape(url: str, output_csv: str):
    error_entries = []
    seen = load_existing_seen(output_csv)
    csv_file_exists = os.path.isfile(output_csv)
    csv_file = open(output_csv, "a", newline="", encoding="utf-8")
    fieldnames = ["Komponist", "Titel", "Tonart", "Besetzung", "Textquelle", "Dichter"]
    writer = csv.DictWriter(csv_file, fieldnames=fieldnames, delimiter=';')
    if not csv_file_exists or os.path.getsize(output_csv) == 0:
        writer.writeheader()
        csv_file.flush()

    consecutive_empty = 0  # Zähler für drei hintereinander komplett leere Einträge

    try:
        with sync_playwright() as p:
            print("[1/7] Browser starten und Seite laden...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle")
            time.sleep(1)
            print("[2/7] Seite geladen. Entferne Cookie-Banner/Overlay...")
            remove_cookie_banner_completely(page)

            links = page.locator("div.work-item-title a.work-item-link")
            total_links = links.count()
            print(f"[3/7] Gefundene Einträge: {total_links}. Verarbeite sequenziell...")

            for idx in range(total_links):
                print(f"    -> Eintrag {idx+1}/{total_links}: Öffnen und extrahieren...")
                link = links.nth(idx)
                panel_id = link.get_attribute("aria-controls") or (link.get_attribute("href") or "").lstrip("#")
                panel = page.locator(f"div#{panel_id}")

                opened = open_entry_and_wait(link, panel, page)
                if not opened:
                    msg = f"Eintrag {idx+1}/{total_links} ({panel_id}) konnte nicht geöffnet werden."
                    print("    !", msg)
                    error_entries.append(msg)
                    continue

                # Extraktion
                try:
                    komponist = ""
                    titel = ""
                    tonart = ""
                    besetzung = ""
                    textquelle = ""
                    fallback_textquelle = ""
                    dichter = ""
                    bibelstelle = ""

                    try:
                        komponist_span = link.locator("span.work-item-author-name")
                        if komponist_span.count():
                            komponist = normalize(komponist_span.inner_text())
                    except:
                        pass

                    try:
                        titel_elem = link.locator("strong.work-item-name-and-year")
                        if titel_elem.count():
                            titel = normalize(titel_elem.inner_text())
                    except:
                        pass

                    if panel and panel.count():
                        wait_until_panel_loaded(panel, timeout_ms=1500)
                        lis = panel.locator("ul.list-unstyled li")
                        for li_i in range(lis.count()):
                            li = lis.nth(li_i)
                            try:
                                text = normalize(li.inner_text())
                            except:
                                text = ""
                            strong = li.locator("strong")
                            if strong.count():
                                raw_label = normalize(strong.inner_text()).rstrip(":").lower()
                                label = raw_label.replace("*", "")
                                value = text.replace(normalize(strong.inner_text()), "").strip(" :")
                                if label == "besetzung":
                                    besetzung = value
                                elif label == "tonart":
                                    tonart = value
                                elif label == "textquelle":
                                    textquelle = value
                                elif label in ("komponist*in", "komponistin") and not komponist:
                                    komponist = value
                                elif label in ("textdichter*in", "textdichterin"):
                                    dichter = value
                                elif label == "bibelstelle":
                                    bibelstelle = value
                            else:
                                if not fallback_textquelle and text:
                                    fallback_textquelle = text

                    if not textquelle and fallback_textquelle:
                        textquelle = fallback_textquelle

                    # Bibelstelle ergänzen
                    if bibelstelle:
                        if textquelle:
                            textquelle = f"{textquelle}; Bibelstelle: {bibelstelle}"
                        else:
                            textquelle = bibelstelle

                    komponist = format_person_name(komponist) if komponist else ""
                    titel = clean_zur_person(titel)
                    tonart = clean_tonart(clean_zur_person(tonart))
                    besetzung = clean_zur_person(besetzung)
                    textquelle = clean_zur_person(textquelle)
                    dichter = format_person_name(dichter) if dichter else ""

                    # Welche Felder gefunden
                    parts_found = {
                        "Komponist": bool(komponist),
                        "Titel": bool(titel),
                        "Tonart": bool(tonart),
                        "Besetzung": bool(besetzung),
                        "Textquelle": bool(textquelle),
                        "Dichter": bool(dichter),
                    }
                    found_summary = " ".join(f"{k}={'✓' if v else '—'}" for k, v in parts_found.items())

                    # Ausgabe in Konsole
                    print(f"        -> Gefundene Felder: {found_summary}")
                    print(f"        -> Daten: Komponist='{komponist}', Titel='{titel}', Tonart='{tonart}', Besetzung='{besetzung}', Textquelle='{textquelle}', Dichter='{dichter}'")

                    key = (komponist, titel, tonart, besetzung, textquelle, dichter)
                    is_duplicate = key in seen

                    if not any(parts_found.values()):
                        consecutive_empty += 1
                        print(f"        -> Keine Daten extrahiert (consecutive_empty={consecutive_empty}).")
                    else:
                        consecutive_empty = 0

                    if consecutive_empty >= 3:
                        print(f"[!] Abbruch: Drei aufeinanderfolgende Einträge ohne Parsing ({idx+1}/{total_links}).")
                        break

                    if is_duplicate:
                        print("        -> Duplikat erkannt, wird nicht erneut geschrieben.")
                        continue

                    # Schreiben
                    seen.add(key)
                    entry = {
                        "Komponist": komponist,
                        "Titel": titel,
                        "Tonart": tonart,
                        "Besetzung": besetzung,
                        "Textquelle": textquelle,
                        "Dichter": dichter,
                    }
                    writer.writerow(entry)
                    csv_file.flush()
                    try:
                        os.fsync(csv_file.fileno())
                    except:
                        pass
                    print(f"        -> In CSV geschrieben.")

                except Exception as e:
                    msg = f"Fehler bei Extraktion Eintrag {idx+1}/{total_links}: {e}"
                    print("    !", msg)
                    error_entries.append(msg)

            print(f"[4/7] Verarbeitung abgeschlossen. CSV steht in '{output_csv}'.")

            if error_entries:
                print(f"[5/7] Fehler beim Öffnen/Extrahieren einiger Einträge. Schreibe Log nach '{ERROR_LOG}'...")
                with open(ERROR_LOG, "w", encoding="utf-8") as ef:
                    for e in error_entries:
                        ef.write(e + "\n")
            else:
                print("[5/7] Keine kritischen Fehler festgestellt.")

            browser.close()
            print("[6/7] Browser geschlossen.")
            print("[7/7] Fertig.")
    finally:
        csv_file.close()

if __name__ == "__main__":
    target = DEFAULT_OUTPUT_CSV
    if len(sys.argv) >= 2:
        target = sys.argv[1]
    scrape(URL, target)
