# RUIAN Address Autocomplete

Robustní implementace našeptávače adres s využitím oficiálních dat **RÚIAN (ČÚZK)**.

Tento projekt řeší běžné problémy při integraci RÚIAN API (CORS, chybějící data, složité parsování) a poskytuje uživatelské rozhraní plně vyhovující **Vyhlášce č. 359/2011 Sb.**

## Klíčové Vlastnosti

*   **Node.js Proxy Server**:
    *   Obchází CORS omezení prohlížeče.
    *   Získává data z **oficiálního XML exportního API** (nikoliv jen z ořezaného našeptávače).
    *   Automaticky konvertuje složité XML (s jmennými prostory) na čistý, plochý JSON.
    *   Řeší GZIP kompresi a kódování pro bezproblémový přenos.
*   **Frontend (HTML/JS)**:
    *   **Vyhláška č. 359/2011 Sb.**: Formátuje adresu přesně podle legislativních požadavků (3 řádky, specifické řazení částí obce vs. ulice).
    *   **Kompletní Data**: Zobrazuje dynamickou tabulku se **všemi** atributy, které RÚIAN vrací (žádné skrývání dat).
    *   **Mapy.cz Integrace**: Obsahuje tlačítko pro okamžité zobrazení oficiálně zformátované adresy na mapě.
    *   **Fallback**: Obsahuje přepínač pro přímé volání API (pro demonstraci CORS chyb).

## Instalace a Spuštění

### Požadavky
*   Node.js (verze 14+ doporučena)

### 1. Spuštění Proxy
Proxy server je nutný pro získání kompletních dat a obcházení CORS.

```bash
node proxy_server.js
```
Server poběží na `http://localhost:3000`.

### 2. Spuštění Aplikace
Otevřete soubor `index.html` ve svém prohlížeči.

*   Zadejte adresu (např. "Toušice 22" nebo "Na Petřinách").
*   Vyberte ze seznamu.
*   Prohlédněte si oficiální formát a všechna strukturovaná data.

## Struktura API

*   `GET /autocomplete?adresa={query}`: Proxy pro našeptávač (fulltext).
*   `GET /detail?kod={kod}`: Proxy pro detail adresního místa. Vrací parsovaný JSON z XML exportu.

## Licence
MIT
