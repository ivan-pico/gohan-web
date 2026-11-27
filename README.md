# gohan.cat

Portal d'entrada als projectes de gohan.cat: un gat blanc amb el seu bol d'arròs (ご飯).

Pàgina estàtica publicada amb GitHub Pages (branca `main`, arrel), en català i castellà:

- `index.html` — versió catalana (https://gohan.cat/) i **font única** del contingut. El text català s'edita directament a l'HTML; el castellà, al diccionari `I18N.es` del `<script>` del mateix fitxer (claus `data-i18n` / `data-i18n-attr`).
- `es/index.html` — versió castellana (https://gohan.cat/es/). **Fitxer generat: no l'editis a mà.**
- `tools/build-es.mjs` — genera `es/index.html`, refresca les dades estructurades JSON-LD de les dues pàgines i el `sitemap.xml`.

## Regenerar després de canviar `index.html`

Cal Node 18 o superior, sense dependències:

```sh
node tools/build-es.mjs            # genera es/index.html, JSON-LD i sitemap (lastmod = avui)
node tools/build-es.mjs --check    # només comprova; surt amb codi 1 si cal regenerar
node tools/build-es.mjs --lastmod=2026-12-01
```

Si el contingut no ha canviat, no toca res (no hi ha diffs buits). Commiteja `index.html`, `es/index.html` i `sitemap.xml` junts.

Més detalls de SEO i manteniment a [SEO.md](SEO.md).
