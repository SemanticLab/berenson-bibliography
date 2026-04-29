const ENDPOINT = 'https://query.semlab.io/proxy/wdqs/bigdata/namespace/wdq/sparql'

const LIST_QUERY = `
SELECT DISTINCT ?item ?itemLabel ?date (YEAR(?date) AS ?year) ?type ?typeLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?type .
  VALUES ?type { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 }
  ?item wdt:P98 ?date .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
`

const AUTHORS_QUERY = `
SELECT DISTINCT ?item ?berenson ?berensonLabel ?authorname
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 }
  OPTIONAL { ?statementberenson pq:P141 ?authorname }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en" . }
}
`

const REVIEWED_QUERY = `
SELECT DISTINCT ?item ?reviewedItem ?reviewedItemLabel ?reviewedAuthor ?reviewedAuthorLabel
WHERE {
  ?item wdt:P11 wd:Q28959 .
  ?item wdt:P1 ?pubtype .
  VALUES ?pubtype { wd:Q20639 wd:Q20638 wd:Q20637 wd:Q28958 wd:Q28960 }
  ?item p:P91 ?statementberenson .
  ?statementberenson ps:P91 ?berenson .
  VALUES ?berenson { wd:Q27449 wd:Q27450 }
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
    const authorname = v(r, 'authorname')
    if (authorname === 'novalue') continue
    const dedupeKey = `${uri}|${berenson}|${authorname || ''}`
    if (seenAttr.has(dedupeKey)) continue
    seenAttr.add(dedupeKey)
    it.attributions.push({ berenson, berensonLabel, authorname })
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
