# SEO de gohan.cat

Objectiu: que gohan.cat aparegui als cercadors i que les visites acabin al perfil professional d'**Ivan Picó** (https://ivanpico.com i https://www.linkedin.com/in/ivanpico). Els jocs i les aplicacions són l'aparador: demostren què sé fer. La conversió que compta és el clic cap a ivanpico.com o LinkedIn.

---

## 1. Què s'ha fet

### Auditoria inicial (abans dels canvis)

| Aspecte | Estat | Problema |
|---|---|---|
| Title / description | Genèrics («Projectes, aplicacions i notícies») | No hi sortien ni els projectes, ni el que són, ni l'autor |
| Idioma | Castellà només via JS | Google només indexava el català; `/?lang=es` no tenia URL pròpia ni hreflang |
| Canonical, hreflang | No n'hi havia | — |
| Open Graph / Twitter | No n'hi havia | Enllaços compartits sense imatge ni títol |
| Dades estructurades | No n'hi havia | — |
| robots.txt / sitemap.xml | No existien | GitHub Pages retornava 404 |
| Favicon | SVG en `data:` URI | Google no el pot rastrejar i no surt als resultats; no hi havia apple-touch-icon ni manifest |
| Headings | 1 h1, h2 per secció, h3 a targetes i notícies | Correcte |
| Captures | 1200×750 (35–52 KB) per mostrar-les a 128–176 px | Unes 3,5 vegades més grans del que calia |
| Fonts | Google Fonts amb `display=swap`, CSS que bloquejava el render | Millorable |
| CLS | Imatges amb `width`/`height` i `aspect-ratio` | Correcte |
| Autor | Ivan Picó no apareixia enlloc | Faltava la marca personal, que és l'objectiu |

### Canvis

- **Versió castellana indexable a `/es/`**: és una pàgina estàtica pre-renderitzada (`es/index.html`) que es genera amb `tools/build-es.mjs` a partir d'`index.html` i del diccionari `I18N.es`. Té `<html lang="es">`, el seu propi canonical, rutes relatives correctes (`../img/…`) i dates en castellà.
- **hreflang** `ca`, `es` i `x-default` (→ `/`) a les dues pàgines i també al sitemap.
- **Selector CA|ES**: ara són enllaços reals (`<a hreflang>`), cosa que Google pot seguir. Visualment no ha canviat. Navega entre `/` i `/es/`, conserva l'àncora (`#sobre`, `#noticia-…`) i desa la tria a `localStorage` (`gohan-lang`).
  - `/` no redirigeix mai segons l'idioma del navegador. Només envia a `/es/` si l'usuari havia triat ES explícitament. Googlebot no té `localStorage`, així que sempre veu el català a `/`.
  - `?lang=es` redirigeix a `/es/` i `?lang=ca`, a `/`. En tots dos casos es conserva l'àncora i s'esborra el paràmetre.
- **Title i description** orientats a la marca personal i a les cerques reals:
  - CA: «GoHan Cat · Projectes IA i aplicacions web» / «El laboratori d'Ivan Picó, Project Manager Tècnic: jocs cooperatius per al navegador com Overworking i apps web com Cost-Ledger.»
  - ES: «GoHan Cat · Proyectos IA y aplicaciones web» / «El laboratorio de Ivan Picó, Project Manager Técnico: …»
  - El text de la capçalera també parla ara de «jocs cooperatius per al navegador».
- **Open Graph i Twitter Card complets**, amb imatges pròpies de 1200×630: `img/og-image.png` (CA) i `img/og-image-es.png` (ES). Inclouen el gat amb el bol, «GoHan Cat», «Projectes IA i aplicacions web» i «Ivan Picó · Project Manager Tècnic». Les plantilles són a `tools/og/` (es renderitzen a 1200×630 amb Chrome headless). També hi ha `og:locale` ca_ES / es_ES amb l'idioma alternatiu.
- **Dades estructurades JSON-LD** (`@graph`), generades a partir del contingut visible:
  - `Person` Ivan Picó, que és l'entitat central (`@id https://gohan.cat/#ivan-pico`): `jobTitle` «Project Manager Tècnic/Técnico», `url` ivanpico.com i `sameAs` LinkedIn, GitHub i ivanpico.com.
  - `WebSite` i `WebPage`, amb `author`, `creator`, `publisher` i `about` apuntant a la Person.
  - `ItemList` dels 3 projectes:
    - Overworking com a `VideoGame`, amb jugadors 1–2, cooperatiu i gratuït.
    - Cost-Ledger com a `WebApplication` (FinanceApplication, gratuïta).
    - Viajar con Camper com a `WebSite` (sense oferta gratuïta perquè és un lloguer).
  - Un `BlogPosting` per notícia (titular, data, autor, imatge i idioma).
- **robots.txt** (ho permet tot i apunta al sitemap) i **sitemap.xml** amb `/` i `/es/`, alternates `xhtml:link` i `lastmod`.
- **Icones**:
  - `favicon.svg`: el mateix dibuix d'abans, ara com a fitxer rastrejable.
  - `favicon.ico` (48/32/16).
  - `img/icons/apple-touch-icon.png` (180), `icon-192.png` i `icon-512.png`.
  - `site.webmanifest` i `theme-color`.
- **Rendiment**:
  - Miniatures de 480 px (`img/projectes/*-480.webp`, 9–14 KB) amb `srcset`/`sizes`. Les captures passen de ~172 KB a ~48 KB. Les de 1200 px es mantenen per a JSON-LD i pantalles grans.
  - Les captures són sota la primera pantalla i mantenen `loading="lazy"`. No hi ha cap imatge LCP: el LCP és el text de l'h1 o el gat SVG en línia.
  - El CSS de Google Fonts ara no bloqueja el render (preload + `media="print"` → `all`, amb `noscript`). Es manté `preconnect` i `display=swap`.
- **Contingut i marca personal**:
  - Secció «Sobre» reescrita: intenció de la web i qui hi ha darrere, amb una crida a l'acció («Coneix el meu perfil» → ivanpico.com, «Connecta a LinkedIn»).
  - Peu de pàgina amb «Un projecte d'Ivan Picó, Project Manager Tècnic» i enllaços visibles a ivanpico.com, LinkedIn i GitHub (`rel="me noopener"`).
  - Cap enllaç té `nofollow`: tots els projectes són dominis propis.
- **Semàntica**: es manté un sol h1 i la jerarquia h2 → h3 (s'hi afegeix l'h3 «Qui hi ha darrere»). Els ids (`#projectes`, `#noticies`, `#sobre`, `#noticia-…`, `#qui-soc`) són estables i iguals a les dues versions. El resum de cada notícia és visible fora del `<details>` i el text complet també és a l'HTML, així que Google l'indexa.

---

## 2. Com mantenir-ho

### Quan canviïs `index.html`

1. Edita el text català a l'HTML i, si hi ha text nou, posa-li `data-i18n="clau"` i afegeix la clau a `I18N.ca` i `I18N.es` (al `<script>` del final).
2. Executa `node tools/build-es.mjs`. Regenera `es/index.html`, el JSON-LD de les dues pàgines i el `lastmod` del sitemap.
3. Commiteja `index.html`, `es/index.html` i `sitemap.xml` junts. Pots comprovar que tot està al dia amb `node tools/build-es.mjs --check`.

No editis mai `es/index.html` a mà: es reescriu cada vegada.

### Afegir una notícia

Copia un `<article class="post" id="noticia-xxx" aria-labelledby="nt-xxx">` existent dins `#noticies`:

- `<time datetime="AAAA-MM-DD" data-i18n-date>` amb la data en català.
- `h3` amb `data-i18n="xxx.title"` i un `id` únic.
- Resum `<p data-i18n="xxx.sum">` (ha d'acabar en `.sum`).
- Paràgrafs `xxx.b1`…

Afegeix les claus a `ca` i `es` i executa el build. El `BlogPosting` es crea sol. Si l'`id` coincideix amb el «Llegeix la notícia» d'una targeta, la notícia queda enllaçada al projecte i agafa la seva captura com a imatge. Si no, fa servir la imatge OG.

### Afegir un projecte

1. Copia una targeta `<article class="card">`. La clau de la descripció ha d'acabar en `.card` i l'etiqueta ha de ser `tag game` o `tag app`.
2. Afegeix la captura a `img/projectes/nom.webp` (1200×750) i `nom-480.webp` (480×300).
3. Afegeix el projecte a `PROJECT_META` de `tools/build-es.mjs`, amb el tipus, la categoria, si és gratuït i el nombre de jugadors. Sense entrada, el script dedueix el tipus de l'etiqueta.

### Sitemap

El build actualitza el `lastmod` a la data del dia, però només quan el contingut ha canviat. Si cal una data concreta: `node tools/build-es.mjs --lastmod=AAAA-MM-DD`.

### Imatge OG

Si canvies el subtítol de la imatge, regenera-la amb Chrome headless (1200×630) a partir d'una plantilla HTML amb el gat SVG de la pàgina, i desa-la com a `img/og-image.png` i `img/og-image-es.png`. Per refrescar la previsualització a les xarxes, fes servir el [Sharing Debugger de Facebook](https://developers.facebook.com/tools/debug/) i el [Post Inspector de LinkedIn](https://www.linkedin.com/post-inspector/).

---

## 3. Pla d'accions fora de la web (per ordre d'impacte)

1. **Google Search Console**:
   - Afegeix una propietat de **domini** `gohan.cat` i verifica-la amb un registre TXT al DNS de dinahosting (Panell → Dominis → gohan.cat → Zona DNS → registre TXT `google-site-verification=…`). La propietat de domini cobreix tots els subdominis.
   - Envia `https://gohan.cat/sitemap.xml`.
   - Amb «Inspecció d'URL», demana la indexació de `/` i `/es/`.
   - Comprova la «Prova de resultats enriquits» (https://search.google.com/test/rich-results) i el validador de schema.org (https://validator.schema.org/) amb les dues URL.
   - Fes el mateix per a `ivanpico.com` si encara no hi és: és la pàgina que ha de guanyar a la cerca «Ivan Picó».
2. **Bing Webmaster Tools**: importa la propietat des de Search Console (és el camí més ràpid) o verifica-la per DNS (CNAME/TXT a dinahosting). Envia el sitemap. Bing també alimenta DuckDuckGo, Ecosia i ChatGPT Search.
3. **Enllaços creuats entre ivanpico.com, LinkedIn i gohan.cat**, el triangle de la marca personal:
   - A ivanpico.com, una secció «Projectes personals» que enllaci a https://gohan.cat/ (i a `/es/` a la versió castellana), amb un text d'àncora descriptiu, per exemple «jocs i aplicacions web que desenvolupo a gohan.cat». Afegeix-hi `sameAs`/`url` de gohan.cat al JSON-LD Person d'ivanpico.com, amb el mateix nom i càrrec.
   - A LinkedIn: gohan.cat a la secció «Destacat» (Featured) i a «Projectes», el lloc web del perfil apuntant a ivanpico.com i una publicació presentant Overworking, que fa broma del caos d'una oficina tècnica. Encaixa amb el perfil de PM i és el contingut que més pot circular.
   - Mantén el mateix nom («Ivan Picó») i càrrec («Project Manager Tècnic») a tot arreu perquè Google consolidi l'entitat.
4. **GitHub**:
   - Al perfil https://github.com/ivan-pico, posa ivanpico.com com a web i un README de perfil que enllaci a gohan.cat i a LinkedIn.
   - A cada repo, omple el camp *Website* amb el seu subdomini (overworking.gohan.cat, etc.), afegeix *topics* (`browser-game`, `coop-game`, `html5-canvas`, `pwa`, `personal-finance`…) i, al README, una línia «Part de [gohan.cat](https://gohan.cat) · per [Ivan Picó](https://ivanpico.com)».
5. **Directoris de jocs web**, per a Overworking i els jocs que vinguin. Cada fitxa és un enllaç i una font de trànsit real:
   - itch.io: pàgina de joc HTML5 incrustat, o enllaç extern, amb tags «co-op», «local multiplayer», «office» i «management» i enllaç a gohan.cat i ivanpico.com al perfil de creador.
   - Newgrounds, Game Jolt, CrazyGames/Poki (aquests dos revisen els jocs que s'hi envien) i el subreddit r/WebGames.
   - Una publicació a Hacker News («Show HN») o a dev.to explicant com està fet (Canvas + WebAudio sense dependències). És contingut tècnic que reforça el perfil professional.
6. **Publica notícies de manera regular**, per exemple una per llançament o actualització important, i difon cada notícia a LinkedIn enllaçant a `https://gohan.cat/#noticia-…`. La freqüència i els enllaços entrants són el que més farà créixer la web.
7. **Altres perfils socials**: Mastodon o Bluesky i X, amb el web personal i gohan.cat a la bio. Allà on es pugui, enllaços verificats (`rel="me"`, que el peu de pàgina ja inclou).
8. **Google Business Profile no aplica**: no hi ha negoci físic ni atenció al públic. Tampoc no cal Google News.

### Recomanacions per als subdominis

Cada projecte ja té el seu SEO propi. Per sumar a la marca:

- Afegeix al peu de cada joc o app un enllaç de tornada: «Un projecte de [gohan.cat](https://gohan.cat) · per [Ivan Picó](https://ivanpico.com)». Pot anar al menú o a la pantalla de crèdits.
- Al JSON-LD de cada subdomini, posa `author`/`creator` com a `{"@type":"Person","@id":"https://gohan.cat/#ivan-pico","name":"Ivan Picó","url":"https://ivanpico.com/"}`, perquè Google reconegui que és la mateixa persona.
- Cada subdomini necessita el seu `robots.txt` i `sitemap.xml`, que s'envien des de la mateixa propietat de domini de Search Console.
- Viajar con Camper és un domini d'un servei de lloguer: n'hi ha prou amb un enllaç discret als crèdits («Web desenvolupada per Ivan Picó»), si el client hi està d'acord.

---

## 4. Pendent o a revisar

- Les mètriques reals de Core Web Vitals (CrUX/PageSpeed Insights) només es poden mesurar un cop publicat i amb trànsit.
- La Prova de resultats enriquits de Google s'ha de passar amb la URL pública. Localment s'ha validat que el JSON és correcte i coherent, però no amb l'eina de Google.
- Si algun dia la web creix a més pàgines (una per projecte o per notícia), és el moment de passar a URLs pròpies per a cada notícia (`/noticies/slug/`). És el canvi que més trànsit de cerca de cua llarga pot aportar.
