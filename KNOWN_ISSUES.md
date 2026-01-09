# Bekannte Probleme / Offene Tests

## PDF Viewer - Text-Selektion

### Status: Zu testen
Nach mehreren Fixes (sequenzielles Rendering, TextLayer API, pointer-events) muss die Text-Selektion noch verifiziert werden:

**Test-Schritte:**
1. PDF hochladen
2. In der Toolbar auf das Hand-Icon klicken → wechselt zu Pointer-Icon (Selection Mode)
3. Text markieren und mit Strg+C kopieren

**Erwartetes Verhalten:**
- Im **Hand Mode** (Default): Drag bewegt das PDF (Pan)
- Im **Pointer Mode**: Text kann markiert und kopiert werden
- Wenn PDF keinen Text enthält (Scan): Anzeige "(kein Text im PDF)"

**Mögliche Probleme:**
- PDF ist ein Scan ohne Textlayer → dann funktioniert Selektion nicht (OCR wäre nötig)
- TextLayer wird nicht korrekt gerendert → DevTools prüfen ob `.textLayer` `<span>` Elemente enthält
- CSS/Pointer-Events blockieren Selektion

**Konsole prüfen auf:**
- `Text layer render error: ...`
- `PDF.js text layer renderer not available in this build.`

---

## PDF Viewer - Pan/Drag Navigation

### Status: Zu testen
- Default Mode sollte Pan sein (grab cursor)
- Drag sollte das PDF bewegen
- Scroll sollte durch alle Seiten kontinuierlich scrollen

---

## Nächste Schritte
1. Beide Modi im Browser testen
2. Bei Problemen: Browser DevTools → Elements → `.textLayer` inspizieren
3. Bei Problemen: Browser Konsole auf Fehler prüfen
