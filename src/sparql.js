const ENDPOINT = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

// Bernard Berenson (Q27450), Mary Berenson (Q27449), Logan Pearsall Smith (Q27534)
const AUTHOR_VALUES = '{ wd:Q27449 wd:Q27450 wd:Q27534 }'
const TYPE_VALUES = '{ wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }'

export const LIST_QUERY = `
SELECT DISTINCT ?item ?itemLabel ?date ?datePrecision (YEAR(?date) AS ?year) ?type ?typeLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?type .
  VALUES ?type ${TYPE_VALUES}
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson ${AUTHOR_VALUES}
  ?item p:P98 ?dateStmt .
  ?dateStmt ps:P98 ?date .
  ?dateStmt psv:P98 ?dateNode .
  ?dateNode wikibase:timePrecision ?datePrecision .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
`

export const AUTHORS_QUERY = `
PREFIX wdno: <http://base.semlab.io/prop/novalue/>
SELECT DISTINCT ?item ?berenson ?berensonLabel ?authorname ?unsigned
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype ${TYPE_VALUES}
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson ${AUTHOR_VALUES}
  OPTIONAL { ?statementberenson pq:P141 ?authorname }
  BIND(EXISTS { ?statementberenson a wdno:P141 } AS ?unsigned)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
`

export const REVIEWED_QUERY = `
SELECT DISTINCT ?item ?reviewedItem ?reviewedItemLabel ?reviewedAuthor ?reviewedAuthorLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype ${TYPE_VALUES}
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson ${AUTHOR_VALUES}
  ?item wdt:P272 ?reviewedItem .
  OPTIONAL { ?reviewedItem wdt:P91 ?reviewedAuthor . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
`

async function runQuery(query) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${await res.text()}`)
  const json = await res.json()
  return json.results.bindings
}

const v = (b, key) => (b[key] ? b[key].value : null)

export async function fetchBibliography() {
  const [listRows, authorRows, reviewedRows] = await Promise.all([
    runQuery(LIST_QUERY),
    runQuery(AUTHORS_QUERY),
    runQuery(REVIEWED_QUERY),
  ])

  const items = new Map()
  for (const r of listRows) {
    const uri = v(r, 'item')
    items.set(uri, {
      item: uri,
      title: v(r, 'itemLabel'),
      date: v(r, 'date'),
      datePrecision: v(r, 'datePrecision') ? parseInt(v(r, 'datePrecision'), 10) : 11,
      year: v(r, 'year') ? parseInt(v(r, 'year'), 10) : null,
      type: v(r, 'type'),
      typeLabel: v(r, 'typeLabel'),
      attributions: [],
      reviewed: [],
    })
  }

  const seenAttr = new Set()
  for (const r of authorRows) {
    const uri = v(r, 'item')
    const it = items.get(uri)
    if (!it) continue
    const berenson = v(r, 'berenson')
    const berensonLabel = v(r, 'berensonLabel')
    const rawAuthorname = v(r, 'authorname')
    // Wikibase "no value" qualifier shows up two ways across this dataset:
    //   - the BIND(EXISTS …) returns boolean "true" (the canonical signal)
    //   - some statements also emit the literal string "novalue" as the value
    const isUnsigned = v(r, 'unsigned') === 'true' || rawAuthorname === 'novalue'
    const authorname = isUnsigned ? null : rawAuthorname
    const dedupeKey = `${uri}|${berenson}|${isUnsigned ? '__unsigned__' : authorname || ''}`
    if (seenAttr.has(dedupeKey)) continue
    seenAttr.add(dedupeKey)
    it.attributions.push({ berenson, berensonLabel, authorname, unsigned: isUnsigned })
  }

  const seenReviewed = new Map()
  for (const r of reviewedRows) {
    const uri = v(r, 'item')
    const it = items.get(uri)
    if (!it) continue
    const reviewedItem = v(r, 'reviewedItem')
    const reviewedItemLabel = v(r, 'reviewedItemLabel')
    const reviewedAuthor = v(r, 'reviewedAuthor')
    const reviewedAuthorLabel = v(r, 'reviewedAuthorLabel')
    const key = `${uri}|${reviewedItem}`
    let entry = seenReviewed.get(key)
    if (!entry) {
      entry = { item: reviewedItem, label: reviewedItemLabel, authors: [] }
      seenReviewed.set(key, entry)
      it.reviewed.push(entry)
    }
    if (reviewedAuthor && !entry.authors.find((a) => a.uri === reviewedAuthor)) {
      entry.authors.push({ uri: reviewedAuthor, label: reviewedAuthorLabel })
    }
  }

  return Array.from(items.values()).sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date)
    if (a.year && b.year) return a.year - b.year
    return 0
  })
}
