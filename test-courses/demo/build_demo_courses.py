"""Build the EDU AI demo courses (Block V2) used for regression testing.

DEMOKURZ01 walks through every block, step and question variant the app
renders. Course-level switches that exclude each other (sequential lessons vs.
open lessons, quiz-only, quiz without evaluation) live in two small companion
courses, DEMOKURZ02 and DEMOKURZ03.

Every block tells the tester what should happen ("Co má být vidět"), so a
screenshot of a block is enough to judge it.

Usage: python3 build_demo_courses.py <out_dir> [media_base_url]
"""
import json
import os
import re
import sys

OUT = sys.argv[1]
MEDIA = (sys.argv[2] if len(sys.argv) > 2 else
         "https://pub-4e0c94219f454e70a63b7f41b436f85f.r2.dev/assets/DEMOKURZ01").rstrip("/")
UPDATED = "2026-10-20T18:00:00.000Z"
AUTHOR = "EduAI Team"


def m(name):
    return f"{MEDIA}/{name}"


# ---------------------------------------------------------------------------
# Block helpers
# ---------------------------------------------------------------------------

FSRS = {
    "initial_difficulty": 0.3, "initial_stability": 2.5, "initial_recall": 0.65,
    "forgetting_rate": 0.25, "repetitions": 0, "weight": 5.0,
    "min_interval": 1, "max_interval": 90,
}

# GPF dimension_index -> (domain, construct, subconstruct) from dimensions_cs.json
DIMS = {
    4: ("Číslo a operace", "Zlomky", "N3.1 Zlomky – určí a znázorní"),
    5: ("Číslo a operace", "Zlomky", "N3.2 Zlomky – porovná"),
    6: ("Číslo a operace", "Zlomky", "N3.3 Zlomky – převádí"),
    11: ("Číslo a operace", "Násobení a dělení", "N6.1 Násobení a dělení"),
    13: ("Číslo a operace", "Operace se zlomky", "N7.1 Operace se zlomky"),
    15: ("Číslo a operace", "Operace s desetinnými čísly", "N8.1 Operace s desetinnými čísly"),
    21: ("Míry", "Objem a obsah", "M4.1 Objem a obsah – vypočítá"),
    22: ("Geometrie", "Rovinné útvary", "G1.1 Rovinné útvary – rozpozná a popíše"),
    28: ("Statistika a pravděpodobnost", "Pravděpodobnost", "S3.1 Pravděpodobnost"),
    29: ("Algebra", "Číselné výrazy", "A1.1 Číselné výrazy – vyhodnotí"),
    31: ("Algebra", "Rovnice", "A2.1 Rovnice – řeší jednoduché"),
}


def gpf(dim=None, elo=4.0, level=2):
    """Display blocks get no vectors: the app would rate them 0.0 and drag ELO down."""
    if dim is None:
        return {"domain": None, "construct": None, "subconstruct": None, "grade": None,
                "level": level, "vector": [], "kb_vector": []}
    rel = [0] * 35
    elo_v = [0.0] * 35
    rel[dim] = 2
    elo_v[dim] = float(elo)
    domain, construct, sub = DIMS[dim]
    return {"domain": domain, "construct": construct, "subconstruct": sub, "grade": 7,
            "level": level, "vector": [], "kb_vector": [],
            "relation_vector": rel, "elo_vector": elo_v}


def learning(concepts, bloom=2, difficulty=2):
    return {"concepts": concepts, "competencies": {}, "bloom_level": bloom,
            "difficulty": difficulty, "prerequisites": []}


def block(block_id, btype, steps, *, concepts=(), dim=None, elo=4.0, xp=None,
          practice=False, duration="2 min", **extra):
    b = {
        "export_type": "block_v2", "block_id": block_id, "version": 1, "language": "cs",
        "author": AUTHOR, "updated": UPDATED, "status": "published", "type": btype,
        "duration": duration, "xp": xp if xp is not None else (10 if btype == "display" else 20),
        "gpf": gpf(dim, elo), "learning": learning(list(concepts)), "fsrs": dict(FSRS),
    }
    if practice:
        b["default_practice"] = True
    if steps is not None:
        b["steps"] = [dict(s, id=f"s{i}", order=i) for i, s in enumerate(steps, 1)]
    b.update(extra)
    return b


def text(content, **kw):
    return {"type": "text", "content": content.strip("\n"), **kw}


def image(name, alt):
    return {"type": "image", "image": {"url": m(name), "alt": alt}}


def video(name):
    return {"type": "video", "video": {"url": m(name)}}


def audio(name):
    return {"type": "audio", "audio": {"url": m(name)}}


def question(cfg, **kw):
    return {"type": "question", "question": cfg, **kw}


def opt(oid, txt, correct=False, **kw):
    return {"id": oid, "text": txt, "is_correct": correct, **kw}


def tf(statement_is_true):
    """True/false options the way the admin editor writes them (localized labels)."""
    return [opt("true", "True (Ano)", statement_is_true),
            opt("false", "False (Ne)", not statement_is_true)]


def check(*lines):
    """The "what should you see" card, rendered as a markdown blockquote."""
    body = "\n".join(f"> {line}" for line in lines)
    return f"> **🧪 Co má být vidět**\n{body}"


def lesson(lesson_id, name, description, block_ids):
    return {"lesson_id": lesson_id, "version": 1, "name": name, "description": description,
            "order": 0, "blocks": [{"block_id": bid, "order": i} for i, bid in enumerate(block_ids, 1)]}


# Bump a course's version here on every change: the API only accepts a
# re-upload with a higher version than the stored one.
VERSIONS = {"DEMOKURZ01": 3, "DEMOKURZ02": 1, "DEMOKURZ03": 1}


def course(course_id, name, description, pin, lessons, blocks, **flags):
    for i, l in enumerate(lessons, 1):
        l["order"] = i
    return {
        "export_type": "course_v2", "course_id": course_id, "version": VERSIONS[course_id], "name": name,
        "description": description, "language": "cs", "author": AUTHOR, "updated": UPDATED,
        "status": "published", "pin": pin,
        "header_image": {"url": m("cover.png"), "alt": "Demo kurz EDU AI"},
        **flags, "lessons": lessons, "blocks": blocks,
    }


# ---------------------------------------------------------------------------
# DEMOKURZ01 — every block / step / question variant
# ---------------------------------------------------------------------------

def demo_main():
    B = []

    # ---- Lekce 1: Zobrazovací bloky (display) --------------------------------
    B.append(block("DK1L1B01", "display", [
        text(r"""
# Demo kurz EDU AI

Tenhle kurz slouží k **testování aplikace**. Obsahuje všechny typy bloků, kroků a otázek, které aplikace umí zobrazit.

Každý blok začíná rámečkem **🧪 Co má být vidět** – podle něj poznáš, jestli se blok chová správně. Když něco nesedí, udělej screenshot a pošli ho i s názvem lekce a číslem bloku.

""" + check(
            "Obrázek kurzu (fialový banner) je vidět v náhledu kurzu **i po otevření kurzu** – ne ikona knížky.",
            "Všechny lekce jsou odemčené, můžeš začít kteroukoli.",
            "Tenhle text je rozdělený do odstavců, nadpis je velký a tučný.")),
        text(r"""
## Markdown – formátování textu

Text může být **tučný**, *kurzívou*, ***obojí najednou*** nebo `kód v řádku`.

### Odrážky
- první položka
- druhá položka s **tučným slovem**
- třetí položka

### Číslovaný seznam
1. připrav si papír
2. přečti si zadání
3. vyřeš úlohu

> Tohle je citace. Má se zobrazit jako zvýrazněný rámeček.

Odkaz ven: [web EDU AI](https://edu-ai.eu)

| Útvar | Obvod | Obsah |
|---|---|---|
| čtverec | 4a | a² |
| obdélník | 2(a + b) | a · b |
| kruh | 2πr | πr² |

""" + check(
            "Nadpisy, tučné písmo, kurzíva, odrážky, číslovaný seznam, citace v rámečku a tabulka se třemi sloupci.",
            "Odkaz „web EDU AI“ jde otevřít.",
            "Žádné hvězdičky, mřížky ani svislítka nejsou vidět jako znaky.")),
    ], concepts=["Ovládání kurzu"]))

    B.append(block("DK1L1B02", "display", [
        text(r"""
## LaTeX v řádku

Pythagorova věta $a^2 + b^2 = c^2$ platí v pravoúhlém trojúhelníku.
Zlomek $\frac{3}{4}$, odmocnina $\sqrt{2}$, mocnina $x^{10}$, index $a_{n+1}$ a desetinná čárka $3{,}14$.

""" + check("Všechny vzorce jsou vykreslené uvnitř věty. Nikde nejsou vidět znaky dolaru ani zpětná lomítka.")),
        text(r"""
## Samostatný vzorec mezi dvojitými dolary

Kvadratická rovnice se řeší vzorcem:

$$x_{1,2} = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

A tady text pokračuje pod vzorcem.

""" + check("Vzorec je na samostatném řádku a ve velkém stylu: zlomek je vysoký, ne zmenšený do výšky řádku.")),
        text(r"""
## Dvojité dolary uprostřed věty

Einsteinův vztah $$E = mc^2$$ je zapsaný uprostřed věty.

""" + check("Vzorec E = mc² je vykreslený, ne jako text s dolary. Může být na samostatném řádku.")),
        text(r"""
## Vzorec přes více řádků

$$
\begin{aligned}
2x + 3 &= 11 \\
2x &= 8 \\
x &= 4
\end{aligned}
$$

""" + check("Tři řádky úpravy rovnice zarovnané pod sebou podle rovnítka.")),
        text(r"""
## Další typy vzorců

Matice: $$\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} \cdot \begin{pmatrix} x \\ y \end{pmatrix}$$

Součet: $$\sum_{k=1}^{n} k = \frac{n(n+1)}{2}$$

Integrál: $$\int_0^1 x^2 \, dx = \frac{1}{3}$$

Dlouhý řetěz rovností: $$(a+b)^2 = (a+b)(a+b) = a^2 + ab + ba + b^2 = a^2 + 2ab + b^2$$

Řecká písmena: $\alpha, \beta, \gamma, \pi, \omega, \Delta, \Sigma$

| Veličina | Vzorec |
|---|---|
| rychlost | $v = \frac{s}{t}$ |
| hustota | $\rho = \frac{m}{V}$ |

""" + check(
            "Matice v kulatých závorkách, součet se sumou, integrál.",
            "Dlouhý řetěz rovností se může zalomit na více řádků, ale nesmí přetéct z obrazovky.",
            "Vzorce v tabulce jsou vykreslené.")),
    ], concepts=["LaTeX"]))

    B.append(block("DK1L1B03", "display", [
        text("## Obrázky jako samostatné kroky\n\nKaždý další krok je jeden obrázek v jiném formátu a tvaru.\n\n" + check(
            "Obrázky se odkrývají postupně, každý ve svém kroku.",
            "Kruhy na obrázcích jsou kulaté (obrázek není roztažený ani zmáčknutý).",
            "Pod obrázkem může být jeho popisek.")),
        image("landscape.jpg", "Obrázek na šířku (JPEG 16:9)"),
        image("portrait.png", "Obrázek na výšku (PNG 3:5)"),
        image("square.webp", "Čtvercový obrázek (WEBP)"),
        image("transparent.png", "PNG s průhledností – pozadí nesmí být černé"),
        image("vector.svg", "Vektorový obrázek (SVG)"),
        image("panorama.jpg", "Velmi široký obrázek (panorama)"),
    ], concepts=["Obrázky"]))

    B.append(block("DK1L1B04", "display", [
        text("## Obrázek nad textem\n\nTenhle krok má obrázek umístěný **nad** textem.\n\n" + check("Obrázek je nad tímto textem."),
             image={"url": m("landscape.jpg"), "alt": "Obrázek nad textem", "position": "above"}),
        text("## Obrázek pod textem\n\nTenhle krok má obrázek umístěný **pod** textem.\n\n" + check("Obrázek je pod tímto textem."),
             image={"url": m("square.webp"), "alt": "Obrázek pod textem", "position": "below"}),
        text(r"""
## Obrázek uvnitř textu

Obrázek může být vložený přímo mezi odstavce:

![Pravoúhlý trojúhelník](""" + m("triangle.png") + r""")

Pod obrázkem text pokračuje.

""" + check("Obrázek trojúhelníku je mezi dvěma odstavci.")),
    ], concepts=["Obrázky"]))

    B.append(block("DK1L1B05", "display", [
        text("## Video\n\nDalší krok je samostatné video (MP4).\n\n" + check(
            "Video jde spustit a zastavit klepnutím, je slyšet hlas a vpravo nahoře běží počítadlo sekund.")),
        video("demo-video.mp4"),
        text("## Video pod textem\n\nTenhle textový krok má video připojené **pod** textem.\n\n" + check("Pod tímto textem je přehrávač videa."),
             video={"url": m("demo-video.mp4"), "position": "below"}),
        text(r"""
## Video vložené v textu

![Video v textu](""" + m("demo-video.mp4") + r""")

""" + check("I video vložené přímo do textu se zobrazí jako přehrávač, ne jako rozbitý obrázek.")),
    ], concepts=["Video"], duration="3 min"))

    B.append(block("DK1L1B06", "display", [
        text("## Zvuk\n\nDalší krok je zvuková nahrávka (MP3, asi 9 sekund).\n\n" + check(
            "Přehrávač zvuku jde spustit, pozastavit a posunout. Zobrazuje se čas.")),
        audio("demo-audio.mp3"),
    ], concepts=["Zvuk"]))

    B.append(block("DK1L1B07", "display", [
        text(r"""
## Nápověda u výkladu

Obsah kruhu se počítá jako $S = \pi r^2$.

""" + check(
            "U tohoto kroku je tlačítko nápovědy (?).",
            "Nápověda ukáže krátký tip, tlačítko „Nerozumím tomu“ pak delší vysvětlení se vzorcem.",
            "Vzorce v nápovědě i ve vysvětlení jsou vykreslené."),
             hint=r"Poloměr $r$ je polovina průměru.",
             help=r"""Když má kruh průměr $d = 10$ cm, je poloměr $r = 5$ cm a obsah:

$$S = \pi \cdot 5^2 = 25\pi \approx 78{,}5 \text{ cm}^2$$"""),
        text("## Jen krátká nápověda\n\nTenhle krok má jen krátkou nápovědu, bez dlouhého vysvětlení.\n\n" + check(
            "Nápověda funguje i bez delšího vysvětlení."),
             hint="Krátký tip bez dalšího vysvětlení."),
    ], concepts=["Nápověda"]))

    B.append(block("DK1L1B08", "display", [
        text("<h3>Obsah ve formátu HTML</h3><p>Starší kurzy mohou mít text uložený jako HTML. Tento odstavec obsahuje <b>tučné</b> a <i>kurzívou psané</i> slovo.</p><ul><li>první položka</li><li>druhá položka</li></ul><p>🧪 Co má být vidět: nadpis, odstavec a odrážky bez viditelných HTML značek.</p>"),
    ], concepts=["HTML"]))

    B.append(block("DK1L1B09", "display", None, concepts=["Starší formát"],
                   content="## Starší formát bloku\n\nTento blok nemá kroky (steps) – je uložený ve starém formátu s textem a obrázkem přímo v bloku.\n\n" + check(
                       "Text i obrázek se zobrazí, i když blok nemá kroky."),
                   image={"url": m("landscape.jpg"), "alt": "Obrázek ve starém formátu"}))

    B.append(block("DK1L1B10", "display", [
        text(r"""
## Výklad k opakování

Tento blok je označený **k procvičování**. Po dokončení lekce se objeví v sekci procvičování (opakování) a tam si sám/sama ohodnotíš, jak dobře si ho pamatuješ.

Zapamatuj si: $1 \text{ km} = 1000 \text{ m}$.

""" + check("Po dokončení celé lekce 1 je tento blok k nalezení v procvičování.")),
    ], concepts=["Procvičování"], practice=True))

    # ---- Lekce 2: Otázky (question) ------------------------------------------
    B.append(block("DK1L2B01", "question", [
        text(r"""
## Výběr jedné odpovědi

Sčítání zlomků se stejným jmenovatelem je snadné – sčítají se jen čitatelé.

""" + check(
            "Po výběru se ukáže zpětná vazba k vybrané možnosti (se vzorcem).",
            "Pak se zobrazí řešení se vzorcem a s obrázkem.",
            "Nápověda (?) a „Nerozumím tomu“ fungují.")),
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", r"$\frac{3}{4}$", True, feedback=r"Správně! $$\frac{1}{2} + \frac{1}{4} = \frac{2}{4} + \frac{1}{4} = \frac{3}{4}$$"),
                opt("opt_2", r"$\frac{2}{6}$", feedback="Pozor – jmenovatele se nesčítají. Nejdřív zlomky převeď na stejný jmenovatel."),
                opt("opt_3", r"$\frac{1}{8}$", feedback="To je součin, ne součet."),
                opt("opt_4", "$1$", feedback=r"Celek by byl $\frac{4}{4}$, tady chybí čtvrtina."),
            ],
            "show_solution": True,
            "solution": r"$\frac{1}{2}$ převedeme na čtvrtiny: $$\frac{1}{2} = \frac{2}{4}$$ a sečteme: $\frac{2}{4} + \frac{1}{4} = \frac{3}{4}$.",
            "solution_image": {"url": m("solution.png"), "alt": "Obrázek v řešení"},
        }, content=r"Kolik je $\frac{1}{2} + \frac{1}{4}$?",
            hint="Převeď oba zlomky na čtvrtiny.",
            help=r"Polovina je totéž co dvě čtvrtiny: $\frac{1}{2} = \frac{2}{4}$. Pak už jen sečti čitatele."),
    ], concepts=["Sčítání zlomků"], dim=13, elo=4.0))

    B.append(block("DK1L2B02", "question", [
        text("## Více správných odpovědí\n\n" + check(
            "Možnosti mají zaškrtávací políčka, jde jich vybrat víc.",
            "Odpověď je správně jen když vybereš přesně všechna prvočísla.",
            "Možnost 2 má ve zpětné vazbě obrázek.")),
        question({
            "type": "multiple_choice", "allow_multiple": True,
            "options": [
                opt("opt_1", "2", True, feedback="2 je jediné sudé prvočíslo.",
                    feedback_image={"url": m("feedback.png"), "alt": "Obrázek ve zpětné vazbě"}),
                opt("opt_2", "3", True, feedback="3 je dělitelné jen 1 a 3."),
                opt("opt_3", "4", feedback="4 = 2 · 2, není to prvočíslo."),
                opt("opt_4", "9", feedback="9 = 3 · 3, není to prvočíslo."),
                opt("opt_5", "11", True, feedback="11 je prvočíslo."),
            ],
            "show_solution": True,
            "solution": "Prvočísla z nabídky jsou **2, 3 a 11**.",
        }, content="Která z čísel jsou prvočísla? Vyber všechna správná."),
    ], concepts=["Prvočísla"], dim=11, elo=4.5))

    B.append(block("DK1L2B03", "question", [
        question({
            "type": "true_false", "options": tf(True), "show_solution": True,
            "solution": r"$\sqrt{16} = 4$, protože $4 \cdot 4 = 16$.",
        }, content=r"""Platí, že $\sqrt{16} = 4$?

""" + check("Dvě tlačítka s popisky Ano / Ne (ne „True“ / „False“).")),
    ], concepts=["Odmocnina"], dim=29, elo=3.5))

    B.append(block("DK1L2B04", "question", [
        question({
            "type": "numeric", "correct_number": 84, "tolerance": 0, "show_solution": True,
            "solution": r"$12 \cdot 7 = 10 \cdot 7 + 2 \cdot 7 = 70 + 14 = 84$",
        }, content=r"""Vypočítej $12 \cdot 7$.

""" + check("Pole pro číslo. Správně je 84, při chybě se ukáže správné číslo."),
            hint=r"Rozlož si to: $10 \cdot 7 + 2 \cdot 7$."),
    ], concepts=["Násobení"], dim=11, elo=3.0))

    B.append(block("DK1L2B05", "question", [
        question({
            "type": "numeric", "correct_number": 3.14, "tolerance": 0.005, "show_solution": True,
            "solution": r"$\pi \approx 3{,}14159\ldots$, na dvě desetinná místa $3{,}14$.",
        }, content=r"""Zaokrouhli číslo $\pi$ na dvě desetinná místa.

""" + check(
            "Před odpovědí je vidět povolená tolerance.",
            "Přijme se zápis s čárkou (3,14) i s tečkou (3.14).")),
    ], concepts=["Zaokrouhlování"], dim=15, elo=3.5))

    B.append(block("DK1L2B06", "question", [
        question({
            "type": "numeric", "correct_number": 10, "tolerance": 0, "show_solution": True,
            "solution": r"$$c = \sqrt{6^2 + 8^2} = \sqrt{36 + 64} = \sqrt{100} = 10$$",
        }, content="Odvěsny pravoúhlého trojúhelníku měří 6 cm a 8 cm. Jak dlouhá je přepona v centimetrech?\n\n" + check(
            "Obrázek trojúhelníku je pod textem otázky a nad polem pro odpověď."),
            image={"url": m("triangle.png"), "alt": "Pravoúhlý trojúhelník"}),
    ], concepts=["Pythagorova věta"], dim=22, elo=5.0))

    B.append(block("DK1L2B07", "question", [
        question({
            "type": "open", "ai_evaluation": False,
            "correct_answer": "Praha\nHlavní město Praha",
            "show_solution": True,
            "solution": "Hlavním městem České republiky je **Praha**.",
        }, content="Jak se jmenuje hlavní město České republiky?\n\n" + check(
            "Textové pole. Odpověď vyhodnotí AI, ukáže se jen správně/špatně a řešení – bez AI komentáře.",
            "Očekávaná odpověď se nikdy nezobrazí jako taková.")),
    ], concepts=["Zeměpis"], dim=29, elo=2.0))

    B.append(block("DK1L2B08", "question", [
        question({
            "type": "open", "ai_evaluation": True,
            "correct_answer": "Zlomky jsou si rovny: když čitatel i jmenovatel zlomku 1/2 vynásobíme dvěma, dostaneme 2/4 (rozšíření zlomku).",
            "ai_criteria_list": [
                {"id": "crit_demo_1", "name": "Rovnost zlomků", "description": "Žák uvede, že oba zlomky vyjadřují stejnou část celku.", "weight": 40},
                {"id": "crit_demo_2", "name": "Rozšíření zlomku", "description": "Žák vysvětlí, že čitatel i jmenovatel se násobí stejným číslem.", "weight": 30},
                {"id": "crit_demo_3", "name": "Příklad nebo obrázek", "description": "Žák uvede konkrétní příklad, třeba půlku a dvě čtvrtiny pizzy.", "weight": 30},
            ],
            "show_solution": True,
            "solution": r"$$\frac{1}{2} = \frac{1 \cdot 2}{2 \cdot 2} = \frac{2}{4}$$ Rozšířením zlomku se jeho hodnota nemění.",
        }, content=r"""Vysvětli vlastními slovy, proč je $\frac{2}{4}$ totéž co $\frac{1}{2}$.

""" + check(
            "Víceřádkové textové pole.",
            "Po odeslání přijde komentář od AI, který projde tři kritéria.",
            "Odpověď jde přepracovat a poslat znovu.")),
    ], concepts=["Rozšiřování zlomků"], dim=6, elo=5.0, duration="3 min"))

    B.append(block("DK1L2B09", "question", [
        question({
            "type": "multiple_choice", "show_solution": False,
            "options": [
                opt("opt_1", "1 000", True, score_koef=1, mark="1", feedback=r"Výborný odhad: $50 \cdot 20 = 1000$."),
                opt("opt_2", "1 029", True, score_koef=0.5, mark="2", feedback="To je přesný výsledek – chtěli jsme ale odhad. Za to je polovina bodů."),
                opt("opt_3", "100", mark="5", feedback="O řád méně."),
                opt("opt_4", "10 000", mark="5", feedback="O řád více."),
            ],
        }, content=r"""Jaký je nejlepší **odhad** výsledku $49 \cdot 21$?

""" + check(
            "Po odpovědi se ukáže jen zpětná vazba k možnosti, **žádné řešení**.",
            "Možnost „1 029“ se počítá jako správná, ale jen za polovinu bodů.")),
    ], concepts=["Odhad"], dim=11, elo=4.0))

    B.append(block("DK1L2B10", "question", [
        question({
            "type": "multiple_choice", "show_answers": False,
            "options": [
                opt("opt_1", "😀 Super", True),
                opt("opt_2", "🙂 Dobrý", True),
                opt("opt_3", "😐 Nic moc", True),
            ],
        }, content="Jak se ti zatím kurz líbí?\n\n" + check(
            "Anketa: tlačítko je „Další“, nic se nevyhodnocuje a lekce plynule pokračuje.")),
    ], concepts=["Anketa"]))

    B.append(block("DK1L2B11", "question", [
        question({
            "type": "multiple_choice", "shuffle_options": True,
            "options": [
                opt("opt_1", "A – správná odpověď", True),
                opt("opt_2", "B"), opt("opt_3", "C"), opt("opt_4", "D"), opt("opt_5", "E"),
            ],
        }, content="Která možnost je označená jako správná?\n\n" + check(
            "Možnosti A–E jsou zamíchané (ne v abecedním pořadí). Při dalším otevření může být pořadí jiné.")),
    ], concepts=["Míchání odpovědí"]))

    B.append(block("DK1L2B12", "question", [
        text("## Více otázek v jednom bloku\n\n" + check(
            "Tři otázky pod sebou se vyhodnotí najednou jedním tlačítkem.",
            "Skóre bloku je podíl správných odpovědí (např. 2 ze 3).")),
        question({"type": "multiple_choice", "options": [
            opt("opt_1", "8", True), opt("opt_2", "6"), opt("opt_3", "9")]},
            content=r"Kolik je $2^3$?"),
        question({"type": "true_false", "options": tf(False)},
                 content=r"Platí, že $0{,}3 > 0{,}25 \cdot 2$?"),
        question({"type": "numeric", "correct_number": 25, "tolerance": 0},
                 content=r"Kolik procent je $\frac{1}{4}$?"),
    ], concepts=["Mix"], dim=29, elo=4.0))

    B.append(block("DK1L2B13", "question", [
        text("## Video před otázkou\n\nPusť si video a odpověz.\n\n" + check("Video i otázka jsou v jednom bloku.")),
        video("demo-video.mp4"),
        question({
            "type": "multiple_choice",
            "options": [opt("opt_1", "fialovou", True), opt("opt_2", "zelenou"), opt("opt_3", "oranžovou")],
            "show_solution": True, "solution": "Pozadí videa je fialové.",
        }, content="Jakou barvu má pozadí videa?"),
    ], concepts=["Video"]))

    # ---- Lekce 3: Cvičení (exercise → Kvíz) -----------------------------------
    B.append(block("DK1L3B00", "display", [
        text("## Cvičení a Kvíz\n\nVšechny další bloky v této lekci jsou **cvičení**. Jen cvičení se dostanou do Kvízu kurzu – je jich 8, takže Kvíz se zeptá na všechna.\n\n" + check(
            "Špatná odpověď ve cvičení uloží blok do procvičování.",
            "Kvíz kurzu obsahuje přesně těchto 8 otázek a ukazuje správně/špatně (vyhodnocení je zapnuté).")),
    ], concepts=["Kvíz"]))

    B.append(block("DK1L3B01", "exercise", [
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", r"$\frac{2}{3}$", True, feedback=r"Ano, $\frac{2}{3} \approx 0{,}67$ je největší."),
                opt("opt_2", r"$\frac{3}{5}$", feedback=r"$\frac{3}{5} = 0{,}6$"),
                opt("opt_3", r"$\frac{1}{2}$", feedback=r"$\frac{1}{2} = 0{,}5$"),
                opt("opt_4", r"$\frac{5}{9}$", feedback=r"$\frac{5}{9} \approx 0{,}56$"),
            ],
            "show_solution": True,
            "solution": r"Převedeme na desetinná čísla: $$\frac{2}{3} \approx 0{,}67 > \frac{3}{5} = 0{,}6 > \frac{5}{9} \approx 0{,}56 > \frac{1}{2}$$",
        }, content="Který zlomek je největší?",
            hint="Převeď zlomky na desetinná čísla.",
            help=r"Například $\frac{3}{5} = 3 : 5 = 0{,}6$."),
    ], concepts=["Porovnávání zlomků"], dim=5, elo=4.5, practice=True))

    B.append(block("DK1L3B02", "exercise", [
        question({
            "type": "multiple_choice", "allow_multiple": True,
            "options": [opt("opt_1", "12", True), opt("opt_2", "21", True), opt("opt_3", "25"),
                        opt("opt_4", "30", True), opt("opt_5", "44")],
            "show_solution": True,
            "solution": "Číslo je dělitelné třemi, když je jeho ciferný součet dělitelný třemi: 12 → 3, 21 → 3, 30 → 3.",
        }, content="Která čísla jsou dělitelná třemi? Vyber všechna."),
    ], concepts=["Dělitelnost"], dim=11, elo=4.0))

    B.append(block("DK1L3B03", "exercise", [
        question({"type": "true_false", "options": tf(True), "show_solution": True,
                  "solution": r"$0{,}5 = \frac{5}{10} = \frac{1}{2}$"},
                 content=r"Platí, že $0{,}5 = \frac{1}{2}$?"),
    ], concepts=["Převod zlomků"], dim=6, elo=3.0))

    B.append(block("DK1L3B04", "exercise", [
        question({"type": "numeric", "correct_number": 6, "tolerance": 0, "show_solution": True,
                  "solution": r"$$3x - 7 = 11 \Rightarrow 3x = 18 \Rightarrow x = 6$$"},
                 content=r"Vyřeš rovnici $3x - 7 = 11$. Kolik je $x$?",
                 hint="Nejdřív přičti 7 k oběma stranám."),
    ], concepts=["Lineární rovnice"], dim=31, elo=5.0))

    B.append(block("DK1L3B05", "exercise", [
        question({"type": "numeric", "correct_number": 1, "tolerance": 0, "show_solution": True,
                  "solution": r"$2{,}5 \cdot 0{,}4 = 1$"},
                 content=r"Vypočítej $2{,}5 \cdot 0{,}4$."),
    ], concepts=["Násobení desetinných čísel"], dim=15, elo=4.5))

    B.append(block("DK1L3B06", "exercise", [
        question({
            "type": "open", "ai_evaluation": True, "allow_photo": True,
            "correct_answer": "35 cm²\n35",
            "show_solution": True, "solution": r"$S = a \cdot b = 7 \cdot 5 = 35 \text{ cm}^2$",
        }, content="Vypočítej obsah obdélníku se stranami 7 cm a 5 cm. Postup můžeš napsat, nebo **vyfotit**.\n\n" + check(
            "U pole pro odpověď je možnost přiložit fotku.")),
    ], concepts=["Obsah obdélníku"], dim=21, elo=4.0))

    B.append(block("DK1L3B07", "exercise", [
        question({
            "type": "open", "ai_evaluation": True, "ai_guided": True, "ai_guided_attempts": 3,
            "correct_answer": "3/8\n0,375\n37,5 %",
            "ai_criteria_list": [
                {"id": "crit_demo_p1", "name": "Správný výsledek", "description": "Pravděpodobnost je 3/8.", "weight": 40},
                {"id": "crit_demo_p2", "name": "Příznivé výsledky", "description": "Žák určí, že modré kuličky jsou 3.", "weight": 20},
                {"id": "crit_demo_p3", "name": "Všechny výsledky", "description": "Žák určí, že kuliček je celkem 8.", "weight": 20},
                {"id": "crit_demo_p4", "name": "Zdůvodnění", "description": "Žák vysvětlí výpočet jako podíl příznivých a všech výsledků.", "weight": 20},
            ],
            "show_solution": True,
            "solution": r"$$P = \frac{\text{příznivé}}{\text{všechny}} = \frac{3}{5 + 3} = \frac{3}{8}$$",
        }, content="V sáčku je 5 červených a 3 modré kuličky. Jaká je pravděpodobnost, že vytáhneš modrou? Zdůvodni.\n\n" + check(
            "Řízené řešení s AI: při chybné odpovědi přijde rada a pole zůstane otevřené.",
            "Řešení se ukáže až po správné odpovědi nebo po 3 pokusech.",
            "V Kvízu je jen jeden pokus.")),
    ], concepts=["Pravděpodobnost"], dim=28, elo=5.5, duration="4 min"))

    B.append(block("DK1L3B08", "exercise", [
        text("Podívej se na trojúhelník na obrázku."),
        image("triangle.png", "Pravoúhlý trojúhelník se stranami a, b, c"),
        question({
            "type": "multiple_choice",
            "options": [opt("opt_1", "$a^2 + b^2 = c^2$", True), opt("opt_2", "$a + b = c$"),
                        opt("opt_3", "$a^2 - b^2 = c^2$")],
            "show_solution": True, "solution": "Pythagorova věta: součet čtverců odvěsen je roven čtverci přepony.",
        }, content="Která rovnost platí pro trojúhelník na obrázku?"),
    ], concepts=["Pythagorova věta"], dim=22, elo=3.5))

    # ---- Lekce 4: Navigace go_to ---------------------------------------------
    B.append(block("DK1L4B01", "question", [
        text(r"""
## Větvení podle odpovědi

Malá násobilka: $7 \cdot 8$ si můžeš spočítat jako $7 \cdot 10 - 7 \cdot 2$.

""" + check(
            "**56** → pokračuje krokem pod otázkou.",
            "**54** nebo **48** → nabídne „Zkusit znovu“ a neprozradí správnou odpověď.",
            "**Nevím, přeskočit** → blok hned skončí a lekce jde na další blok.")),
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", "56", True, go_to="NEXT_STEP"),
                opt("opt_2", "54", go_to="AGAIN"),
                opt("opt_3", "48", go_to="AGAIN"),
                opt("opt_4", "Nevím, přeskočit", go_to="END"),
            ],
        }, content=r"Kolik je $7 \cdot 8$?"),
        text("Krok pod otázkou: sem tě pošle správná odpověď 56. 🎉"),
    ], concepts=["Navigace"]))

    B.append(block("DK1L4B02", "question", [
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", "Ano, přeskočit další blok", True, go_to="DK1L4B04"),
                opt("opt_2", "Ne, pokračovat normálně", True, go_to="NEXT_STEP"),
            ],
        }, content="Chceš přeskočit následující blok?\n\n" + check(
            "„Ano“ → aktivní je rovnou blok „Cíl skoku“, „Přeskakovaný blok“ lekce přeskočí.",
            "„Ne“ pokračuje normálně.")),
    ], concepts=["Navigace"]))

    B.append(block("DK1L4B03", "display", [
        text("## Přeskakovaný blok\n\n" + check("Tento blok se prochází jen tehdy, když jsi v předchozí otázce zvolil(a) „Ne“. Při „Ano“ ho lekce přeskočí.")),
    ], concepts=["Navigace"]))

    B.append(block("DK1L4B04", "display", [
        text("## Cíl skoku\n\n" + check("Sem vede skok z otázky „Chceš přeskočit následující blok?“.")),
    ], concepts=["Navigace"]))

    B.append(block("DK1L4B05", "question", [
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", "Ano, otevřít chat s AI mentorem", True, go_to="CHAT"),
                opt("opt_2", "Ne, pokračovat", True, go_to="NEXT_STEP"),
            ],
        }, content="Chceš se na něco zeptat AI mentora?\n\n" + check(
            "„Ano“ ukončí blok a otevře chat s AI mentorem.")),
    ], concepts=["Navigace"]))

    B.append(block("DK1L4B06", "question", [
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", "Zpět na úplný začátek kurzu (lekce 1)", True, go_to="DK1L1B01"),
                opt("opt_2", "Pokračovat dál", True, go_to="NEXT_STEP"),
            ],
        }, content="Kam dál?\n\n" + check(
            "„Zpět na začátek“ otevře první blok lekce 1 (skok do jiné lekce).",
            "„Pokračovat dál“ dokončí lekci 4 – a to i když jsi předtím blok přeskočil(a) nebo otevřel(a) chat.")),
    ], concepts=["Navigace"]))

    # ---- Lekce 5: Okrajové případy -------------------------------------------
    B.append(block("DK1L5B01", "display", [
        text("## Dlouhý text\n\n" + " ".join([
            "Tenhle odstavec je schválně dlouhý, aby bylo vidět zalamování řádků na úzkém i širokém displeji."] * 6)
            + "\n\nVelmi dlouhé slovo: Nejneobhospodařovávatelnějšími.\n\n"
            "Dlouhý odkaz: https://edu-ai.eu/tohle/je/schvalne/velmi/dlouhy/odkaz/ktery/se/musi/nejak/zalomit/aby/nepretekl\n\n" + check(
                "Text se zalamuje a nic nepřetéká přes okraj obrazovky.")),
    ], concepts=["Okrajové případy"]))

    B.append(block("DK1L5B02", "display", [
        text("## Široká tabulka\n\n"
             "| n | n² | n³ | √n | 1/n | 2ⁿ | n! | Prvočíslo |\n"
             "|---|---|---|---|---|---|---|---|\n"
             "| 1 | 1 | 1 | 1,000 | 1,000 | 2 | 1 | ne |\n"
             "| 2 | 4 | 8 | 1,414 | 0,500 | 4 | 2 | ano |\n"
             "| 3 | 9 | 27 | 1,732 | 0,333 | 8 | 6 | ano |\n"
             "| 10 | 100 | 1 000 | 3,162 | 0,100 | 1 024 | 3 628 800 | ne |\n\n" + check(
                 "Na telefonu je tabulka širší než displej a jde posouvat do stran. Stránka sama se do stran neposouvá.")),
    ], concepts=["Okrajové případy"]))

    B.append(block("DK1L5B03", "question", [
        question({
            "type": "multiple_choice",
            "options": [
                opt("opt_1", "Tohle je schválně velmi dlouhá odpověď, která se musí zalomit na několik řádků a pořád zůstat čitelná a celá klikatelná.", True),
                opt("opt_2", r"Odpověď se vzorcem $\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}$"),
                opt("opt_3", "Krátká"),
                opt("opt_4", "Čtvrtá"), opt("opt_5", "Pátá"), opt("opt_6", "Šestá"),
                opt("opt_7", "Sedmá"), opt("opt_8", "Osmá možnost"),
            ],
        }, content="Otázka s osmi možnostmi. Která je první?\n\n" + check(
            "Všech 8 možností je vidět (případně po posunutí), dlouhá se zalamuje, vzorec v možnosti je vykreslený.")),
    ], concepts=["Okrajové případy"]))

    B.append(block("DK1L5B04", "display", [
        text("## Speciální znaky\n\n"
             "Příliš žluťoučký kůň úpěl ďábelské ódy. PŘÍLIŠ ŽLUŤOUČKÝ KŮŇ ÚPĚL ĎÁBELSKÉ ÓDY.\n\n"
             "Znaky: < > & \" ' % # @ € § ° ± × ÷ ≤ ≥ ≠ ∞ ½ ² ³ → ✓\n\n"
             "Emoji: 🎉 🧮 📐 🤖 ✅ ❌\n\n" + check(
                 "Všechna písmena s diakritikou, znaky i emoji se zobrazí správně, nic se nezmění na otazníky ani čtverečky.")),
    ], concepts=["Okrajové případy"]))

    B.append(block("DK1L5B05", "question", None, concepts=["Starší formát"], dim=11, elo=2.5,
                   content="**Starší formát otázky** (blok bez kroků): Kolik je $6 \\cdot 7$?\n\n" + check(
                       "Otázka ze starého formátu se zobrazí a jde na ni odpovědět."),
                   question={"type": "multiple_choice", "options": [
                       opt("opt_1", "42", True), opt("opt_2", "36"), opt("opt_3", "48")],
                       "solution": r"$6 \cdot 7 = 42$"},
                   hint="Násobilka sedmi.",
                   help=r"$6 \cdot 7 = 7 + 7 + 7 + 7 + 7 + 7 = 42$"))

    B.append(block("DK1L5B06", "question", None, concepts=["Starší formát"], dim=29, elo=2.0,
                   content="**Starší formát pravda/nepravda:** Platí, že $10 > 9$?",
                   question={"type": "true_false", "options": tf(True)}))

    B.append(block("DK1L5B07", "display", [
        text(f"## Krok {i} z 10\n\n" + (check("Kroky jdou popořadě 1, 2, … 10 (krok 10 je poslední, ne za krokem 1).") if i == 1 else f"Pokračuj na krok {i + 1}." if i < 10 else "Hotovo, tohle je poslední krok."))
        for i in range(1, 11)
    ], concepts=["Okrajové případy"], duration="3 min"))

    B.append(block("DK1L5B08", "display", [text("OK")], concepts=["Okrajové případy"]))

    lessons = [
        lesson("DK1_L1", "1 · Zobrazovací bloky",
               "Text, Markdown, LaTeX, obrázky, video, zvuk, nápověda, HTML a starší formát.",
               [b["block_id"] for b in B if b["block_id"].startswith("DK1L1")]),
        lesson("DK1_L2", "2 · Otázky",
               "Výběr z možností, více správných, pravda/nepravda, číselné a otevřené otázky.",
               [b["block_id"] for b in B if b["block_id"].startswith("DK1L2")]),
        lesson("DK1_L3", "3 · Cvičení a Kvíz",
               "Cvičení, která tvoří Kvíz kurzu, včetně fotky a řízeného řešení s AI.",
               [b["block_id"] for b in B if b["block_id"].startswith("DK1L3")]),
        lesson("DK1_L4", "4 · Navigace mezi kroky a bloky",
               "Opakování otázky, návrat na výklad, konec bloku, skok na jiný blok a do chatu.",
               [b["block_id"] for b in B if b["block_id"].startswith("DK1L4")]),
        lesson("DK1_L5", "5 · Okrajové případy",
               "Dlouhé texty, široké tabulky, mnoho možností, speciální znaky, starší formát.",
               [b["block_id"] for b in B if b["block_id"].startswith("DK1L5")]),
    ]
    return course(
        "DEMOKURZ01", "Demo kurz – všechny typy bloků a otázek",
        "Testovací kurz: všechny typy bloků, kroků a otázek, LaTeX, obrázky, video a zvuk. Každý blok popisuje, co má být vidět.",
        "424242", lessons, B,
        open_all_lessons=True, quiz_evaluate=True, shuffle_answers=False,
        open_answer_score="last", max_xp=1000,
        ai_context="Testovací kurz pro ověřování funkcí aplikace. Obsah je jednoduchá matematika pro 2. stupeň ZŠ.",
    )


# ---------------------------------------------------------------------------
# DEMOKURZ02 — starts with the quiz, lessons unlock one by one, shuffled answers
# ---------------------------------------------------------------------------

def demo_sequential():
    B = [
        block("DK2L1B01", "display", [text("## Lekce 1\n\nTenhle kurz **začíná Kvízem** a lekce se odemykají postupně.\n\n" + check(
            "Než dokončíš Kvíz, jsou lekce zamčené.",
            "Lekce 2 se odemkne až po dokončení lekce 1.",
            "Možnosti v otázkách jsou zamíchané (nastavení kurzu), pravda/nepravda se nemíchá."))],
              concepts=["Postupné lekce"]),
        block("DK2L1B02", "exercise", [question({
            "type": "multiple_choice",
            "options": [opt("opt_1", "A – správně", True), opt("opt_2", "B"), opt("opt_3", "C"), opt("opt_4", "D")],
            "show_solution": True, "solution": "Správně je A."}, content="Která možnost je správná? (Pořadí je zamíchané.)")],
              concepts=["Míchání"], dim=29, elo=3.0),
        block("DK2L1B03", "exercise", [question({"type": "true_false", "options": tf(True)},
                                                content=r"Platí, že $\frac{4}{8} = \frac{1}{2}$?")],
              concepts=["Zlomky"], dim=6, elo=3.0),
        block("DK2L2B01", "question", [question({
            "type": "open", "ai_evaluation": True, "correct_answer": "12",
            "show_solution": True, "solution": r"$3 \cdot 4 = 12$"},
            content=r"Kolik je $3 \cdot 4$? Napiš i krátký postup." + "\n\n" + check(
                "Kurz počítá u otevřených otázek **nejlepší** pokus: když odpověď přepracuješ hůř, výsledek se nezhorší."))],
              concepts=["Násobení"], dim=11, elo=2.5),
        block("DK2L2B02", "exercise", [question({"type": "numeric", "correct_number": 0.75, "tolerance": 0},
                                                content=r"Zapiš $\frac{3}{4}$ jako desetinné číslo.")],
              concepts=["Převod zlomků"], dim=6, elo=3.5),
        block("DK2L3B01", "display", [text("## Konec\n\nPoslední lekce kurzu.\n\n" + check(
            "Průběh kurzu ukazuje všechny lekce hotové."))], concepts=["Postupné lekce"]),
    ]
    lessons = [
        lesson("DK2_L1", "1 · Úvod", "Výklad a dvě cvičení.", ["DK2L1B01", "DK2L1B02", "DK2L1B03"]),
        lesson("DK2_L2", "2 · Otázky", "Otevřená otázka a číselné cvičení.", ["DK2L2B01", "DK2L2B02"]),
        lesson("DK2_L3", "3 · Konec", "Závěr kurzu.", ["DK2L3B01"]),
    ]
    return course(
        "DEMOKURZ02", "Demo kurz – začíná kvízem, lekce postupně",
        "Testovací kurz: nejdřív Kvíz, lekce se odemykají postupně, odpovědi se míchají, u otevřených otázek se počítá nejlepší pokus.",
        "424243", lessons, B,
        starts_with_quiz=True, open_all_lessons=False, quiz_evaluate=True,
        shuffle_answers=True, open_answer_score="best",
    )


# ---------------------------------------------------------------------------
# DEMOKURZ03 — quiz only, without evaluation
# ---------------------------------------------------------------------------

def demo_quiz_only():
    B = [
        block("DK3L1B01", "exercise", [question({
            "type": "multiple_choice",
            "options": [opt("opt_1", "4", True), opt("opt_2", "5"), opt("opt_3", "22")],
            "show_solution": True, "solution": "2 + 2 = 4"},
            content="Kolik je 2 + 2?\n\n" + check(
                "Kurz má jen Kvíz – žádné lekce.",
                "Vyhodnocení je vypnuté: žádné barvy, zpětná vazba ani řešení."))],
              concepts=["Sčítání"], dim=29, elo=1.5),
        block("DK3L1B02", "exercise", [question({"type": "true_false", "options": tf(False)},
                                                content=r"Platí, že $\frac{1}{3} > \frac{1}{2}$?")],
              concepts=["Porovnávání zlomků"], dim=5, elo=3.0),
        block("DK3L1B03", "exercise", [question({"type": "numeric", "correct_number": 9, "tolerance": 0},
                                                content=r"Kolik je $\sqrt{81}$?")],
              concepts=["Odmocnina"], dim=29, elo=3.0),
        block("DK3L1B04", "exercise", [question({
            "type": "multiple_choice", "allow_multiple": True,
            "options": [opt("opt_1", "čtverec", True), opt("opt_2", "obdélník", True), opt("opt_3", "trojúhelník")]},
            content="Které útvary mají čtyři pravé úhly?")],
              concepts=["Rovinné útvary"], dim=22, elo=2.5),
        block("DK3L1B05", "exercise", [question({
            "type": "open", "ai_evaluation": True, "correct_answer": "100 cm\n100"},
            content="Kolik centimetrů má jeden metr?")],
              concepts=["Jednotky délky"], dim=11, elo=2.0),
    ]
    lessons = [lesson("DK3_L1", "Kvíz", "Otázky Kvízu.", [b["block_id"] for b in B])]
    return course(
        "DEMOKURZ03", "Demo kurz – jen kvíz bez vyhodnocení",
        "Testovací kurz: obsahuje jen Kvíz, bez lekcí, a nezobrazuje vyhodnocení odpovědí.",
        "424244", lessons, B,
        only_quiz=True, starts_with_quiz=True, quiz_evaluate=False,
    )


# ---------------------------------------------------------------------------
# Validation — mirrors the admin export checks plus app pitfalls found in code
# ---------------------------------------------------------------------------

def validate(c):
    errs = []
    ids = [b["block_id"] for b in c["blocks"]]
    if len(ids) != len(set(ids)):
        errs.append("duplicate block_id")
    bound = [x["block_id"] for l in c["lessons"] for x in l["blocks"]]
    for bid in bound:
        if bid not in ids:
            errs.append(f"lesson binds unknown block {bid}")
    for bid in ids:
        if bid not in bound:
            errs.append(f"block {bid} not in any lesson")
    if len(c.get("description", "")) > 500:
        errs.append("description > 500 chars")
    if not re.fullmatch(r"[A-Z0-9]{6}", c["pin"]):
        errs.append("pin must be 6 alnum")

    def check_q(q, where):
        t = q["type"]
        opts = q.get("options") or []
        if t == "multiple_choice":
            if len(opts) < 2 or not any(o["is_correct"] for o in opts) or any(not o["text"].strip() for o in opts):
                errs.append(f"{where}: bad MCQ")
        elif t == "true_false":
            if len(opts) != 2 or sum(o["is_correct"] for o in opts) != 1:
                errs.append(f"{where}: bad TF")
        elif t == "numeric":
            if q.get("correct_number") is None:
                errs.append(f"{where}: numeric without correct_number")
        elif t == "open":
            if len(q.get("ai_criteria_list") or []) > 4:
                errs.append(f"{where}: >4 criteria")
            if q.get("ai_guided") and not q.get("ai_evaluation"):
                errs.append(f"{where}: ai_guided without ai_evaluation")
        else:
            errs.append(f"{where}: unknown question type {t}")
        for o in opts:
            g = o.get("go_to")
            if g and re.fullmatch(r"s\d+", g) and g not in step_ids:
                errs.append(f"{where}: go_to {g} missing")
            if g and not re.fullmatch(r"s\d+", g) and g not in ("NEXT_STEP", "AGAIN", "END", "CHAT", "LECTURE") and g not in ids:
                errs.append(f"{where}: go_to block {g} missing")

    def latex_ok(s, where, text_step):
        # Text steps turn every literal "\n" into a line break (block_model.dart),
        # so \neq, \nu, \nabla ... would be corrupted there.
        if text_step and re.search(r"\\n", s):
            errs.append(f"{where}: '\\n' sequence in text step breaks LaTeX")
        for line in s.split("\n"):
            # inline $..$ must close on the same line (ignore $$ pairs)
            singles = re.sub(r"\$\$", "", line).count("$")
            if singles % 2:
                errs.append(f"{where}: unbalanced $ on line: {line[:60]}")
        if s.count("$$") % 2:
            errs.append(f"{where}: unbalanced $$")
        if re.search(r"\\\(|\\\[", s):
            errs.append(f"{where}: \\( or \\[ delimiters are not supported")

    for b in c["blocks"]:
        bid = b["block_id"]
        steps = b.get("steps")
        if steps is None:
            latex_ok(b.get("content", ""), bid, True)
            if b["type"] != "display":
                step_ids = set()
                check_q(b["question"], bid)
            continue
        step_ids = {s["id"] for s in steps}
        if b["type"] == "display":
            if not any(s["type"] == "text" and s.get("content", "").strip() for s in steps):
                errs.append(f"{bid}: display without text step")
            if any(s["type"] == "question" for s in steps):
                errs.append(f"{bid}: display block with a question step")
        else:
            if not any(s["type"] == "question" for s in steps):
                errs.append(f"{bid}: no question step")
        if b["type"] == "exercise" and any(o.get("go_to") for s in steps if s["type"] == "question" for o in s["question"].get("options", [])):
            errs.append(f"{bid}: exercise blocks ignore go_to")
        for s in steps:
            where = f"{bid}/{s['id']}"
            if s.get("help") and not s.get("hint"):
                errs.append(f"{where}: help without hint is unreachable")
            for key in ("image", "video"):
                if isinstance(s.get(key), dict) and s[key].get("position") == "inline":
                    errs.append(f"{where}: position inline is never drawn")
            if s["type"] == "text":
                latex_ok(s["content"], where, True)
            if s["type"] == "question":
                q = s["question"]
                latex_ok(s.get("content", ""), where, False)
                for o in q.get("options", []):
                    latex_ok(o["text"], where, False)
                    latex_ok(o.get("feedback", ""), where, False)
                latex_ok(q.get("solution", ""), where, False)
                check_q(q, where)
            for k in ("hint", "help"):
                if s.get(k):
                    latex_ok(s[k], where, False)
    gv = [b for b in c["blocks"] if b["gpf"].get("relation_vector")]
    for b in gv:
        g = b["gpf"]
        if len(g["relation_vector"]) != 35 or len(g["elo_vector"]) != 35:
            errs.append(f"{b['block_id']}: vectors must have 35 entries")
        if b["type"] == "display":
            errs.append(f"{b['block_id']}: display block with ELO vectors")
    return errs


def stats(c):
    from collections import Counter
    cnt = Counter()
    for b in c["blocks"]:
        cnt[f"block:{b['type']}" + (":legacy" if "steps" not in b else "")] += 1
        for s in b.get("steps") or []:
            cnt[f"step:{s['type']}"] += 1
            q = s.get("question")
            if q:
                variant = q["type"]
                for flag in ("allow_multiple", "show_answers", "shuffle_options", "ai_evaluation",
                             "ai_guided", "allow_photo"):
                    if flag in q:
                        variant += f"+{flag}={q[flag]}"
                cnt[f"q:{variant}"] += 1
    return cnt


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    ok = True
    for build in (demo_main, demo_sequential, demo_quiz_only):
        c = build()
        errs = validate(c)
        path = os.path.join(OUT, f"{c['course_id']}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(c, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"{c['course_id']}: {len(c['lessons'])} lekcí, {len(c['blocks'])} bloků -> {path}")
        for k, v in sorted(stats(c).items()):
            print(f"   {k}: {v}")
        for e in errs:
            print("   ERROR", e)
        ok = ok and not errs
    sys.exit(0 if ok else 1)
