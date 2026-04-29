# Conoshing the Connoisseurs

A browseable bibliography of early publications (1890–1903) by Bernard Berenson, Mary Berenson, and Logan Pearsall Smith, sourced from the [Semantic Lab](https://base.semlab.io) Wikibase via SPARQL.

Live: <https://semanticlab.github.io/berenson-bibliography/>

## Data

The Wikibase instance at `base.semlab.io` models each bibliography entry as an item linked to the Berenson Bibliography Project (`wd:Q28959`). Three SPARQL queries against the proxy endpoint power the interface:

```
https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql
```

The interface fetches all three queries in parallel and merges them client-side by item URI. This keeps multi-author and multi-reviewed-work entries as structured lists rather than flattening them with `GROUP_CONCAT`.

### Properties used

| Property | Meaning |
| --- | --- |
| `P1` | instance of (publication type) |
| `P11` | part of project (`Q28959` = Berenson Bibliography Project) |
| `P82` | title |
| `P91` | author |
| `P98` | publication date |
| `P141` | qualifier on `P91`: pseudonym / author-name-as-published |
| `P272` | reviews (links a review to the work being reviewed) |

### Publication types in scope

| QID | Type |
| --- | --- |
| `Q20639` | book |
| `Q20638` | article |
| `Q20637` | academic journal |
| `Q28958` | letter to the editor |
| `Q28960` | review |

### Author scope

Entries are filtered to those attributed (via `P91`) to one of:

- `Q27450` — Bernard Berenson
- `Q27449` — Mary Berenson
- `Q27534` — Logan Pearsall Smith (Mary's brother; co-contributor on the *Golden Urn* journals)

The `P91` statement may carry a `P141` qualifier ("object named as") giving the name as it appeared in print (e.g. *Mary Logan*, *Bernhard Berenson*, *M. L.*). When `P141` is set to the special **"no value"** (which the SPARQL endpoint returns as the literal string `"novalue"`), the work was published unsigned and the UI displays it as `Mary Berenson as unsigned`.

### Query 1 — list

The canonical 102-row list of bibliography items.

```sparql
SELECT DISTINCT ?item ?itemLabel ?date ?datePrecision (YEAR(?date) AS ?year) ?type ?typeLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?type .
  VALUES ?type { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 wd:Q27534 }
  ?item p:P98 ?dateStmt .
  ?dateStmt ps:P98 ?date .
  ?dateStmt psv:P98 ?dateNode .
  ?dateNode wikibase:timePrecision ?datePrecision .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
```

`?datePrecision` is Wikibase's integer time precision: `9` = year, `10` = month, `11` = day. The UI uses this to suppress the `-01` day or `-01-01` month-day when the source data isn't that specific (e.g. a date entered only as "September 1897" returns `1897-09-01T00:00:00Z` with precision `10` and renders as `1897-09`).

### Query 2 — attributions / pseudonyms

Multi-row: one row per `(item, berenson, pseudonym)` triple. An item can yield multiple rows when both Berensons are credited, or when the same Berenson appears under multiple pseudonyms.

```sparql
PREFIX wdno: <http://base.semlab.io/prop/novalue/>
SELECT DISTINCT ?item ?berenson ?berensonLabel ?authorname ?unsigned
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 wd:Q27534 }
  OPTIONAL { ?statementberenson pq:P141 ?authorname }
  BIND(EXISTS { ?statementberenson a wdno:P141 } AS ?unsigned)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
```

The `BIND(EXISTS …)` clause flags statements where the `P141` qualifier is explicitly set to **"no value"** (Wikibase's "unsigned" marker). The OPTIONAL still binds `?authorname` for statements with a string pseudonym; statements with neither produce a row with neither variable bound.

### Query 3 — reviewed works + their authors

For review-type entries: links to the work being reviewed (`P272`) and that work's author(s) (`P91`).

```sparql
SELECT DISTINCT ?item ?reviewedItem ?reviewedItemLabel ?reviewedAuthor ?reviewedAuthorLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 wd:Q27534 }
  ?item wdt:P272 ?reviewedItem .
  OPTIONAL { ?reviewedItem wdt:P91 ?reviewedAuthor . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
```

This query is split out from the main list because adding `OPTIONAL { ?reviewedItem wdt:P91 ?reviewedAuthor }` to a query that already carries an `OPTIONAL` for the pseudonym produces a cartesian-style explosion of result rows. Keeping the optionals in separate queries and merging client-side avoids that.

## Client-side merge

After all three queries return, the JS in [`src/sparql.js`](src/sparql.js) merges them into one shape per item:

```js
{
  item: 'http://base.semlab.io/entity/Q29204',
  title: 'Review of Vittore Carpaccio et la Confrérie de Sainte Ursule à Venise',
  date: '1903-12-01T00:00:00Z',
  year: 1903,
  type: 'http://base.semlab.io/entity/Q28960',
  typeLabel: 'review',
  attributions: [
    { berenson: '…/Q27449', berensonLabel: 'Mary Berenson', authorname: 'M. L.' },
  ],
  reviewed: [
    {
      item: '…/Q29202',
      label: 'Vittore Carpaccio et la Confrérie de Sainte Ursule à Venise',
      authors: [
        { uri: '…/Q29200', label: 'Pompeo Molmenti' },
        { uri: '…/Q29201', label: 'Gustave Ludwig' },
      ],
    },
  ],
}
```

Rows where `?unsigned` is `true` (or, for legacy compatibility, where `?authorname` resolves to the literal string `"novalue"`) are merged as `{ unsigned: true }` and rendered as e.g. *Mary Berenson as unsigned* rather than carrying a pseudonym string.

## Develop

```bash
npm install
npm run dev
```

## Deploy

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds with `npm run build` and publishes `dist/` to GitHub Pages. The repo's **Settings → Pages → Source** must be set to **GitHub Actions**.

The Vite `base` is set to `/berenson-bibliography/` in production and `/` in dev — see [`vite.config.js`](vite.config.js).
