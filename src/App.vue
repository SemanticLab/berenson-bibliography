<script>
import { fetchBibliography } from './sparql.js'
import BibliographyTable from './components/BibliographyTable.vue'

const SOURCE_QUERY_URL =
  'https://query.semlab.io/#SELECT%20DISTINCT%20%3Fitem%20%3FitemLabel%20%3Fdate%20%28YEAR%28%3Fdate%29%20AS%20%3Fyear%29%20%3Ftype%20%3FtypeLabel%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP11%20wd%3AQ28959%20.%0A%20%20%3Fitem%20wdt%3AP1%20%3Ftype%20.%0A%20%20VALUES%20%3Ftype%20%7B%20wd%3AQ20639%20wd%3AQ20638%20wd%3AQ20637%20wd%3AQ28958%20wd%3AQ28960%20%7D%0A%20%20%3Fitem%20p%3AP91%20%3Fstatementberenson%20.%0A%20%20%3Fstatementberenson%20ps%3AP91%20%3Fberenson%20.%0A%20%20VALUES%20%3Fberenson%20%7B%20wd%3AQ27449%20wd%3AQ27450%20%7D%0A%20%20%3Fitem%20wdt%3AP98%20%3Fdate%20.%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22en%22%20.%20%7D%0A%7D'

export default {
  name: 'App',
  components: { BibliographyTable },
  data() {
    return {
      items: [],
      loading: true,
      error: null,
      search: '',
      sourceQueryUrl: SOURCE_QUERY_URL,
    }
  },
  async mounted() {
    try {
      this.items = await fetchBibliography()
    } catch (err) {
      this.error = err.message || String(err)
    } finally {
      this.loading = false
    }
  },
}
</script>

<template>
  <header class="hero">
    <h1>Berenson Bibliography</h1>
    <div class="intro">
      <p>
        The Berenson Bibliography <sup>[1]</sup> is a list of early publications by
        <em>Bernard Berenson</em> and <em>Mary Berenson</em>, including books, articles,
        reviews, letters to the editor, and journal contributions. Each entry records the
        Berenson it is attributed to, any pseudonym used at the time of publication
        (e.g. <em>Mary Logan</em>, <em>Bernhard Berenson</em>), and—for reviews—the
        original work being reviewed and its author. Driven by SPARQL queries against the
        <a href="https://base.semlab.io" target="_blank" rel="noopener">Semantic Lab</a>
        Wikibase, this interface merges three queries client-side so multi-author and
        multi-reviewed-work entries are preserved as structured lists rather than
        flattened strings.
      </p>
      <p class="footnote">
        [1] Source data is maintained as linked open data; entries shown here are limited
        to publication types <em>book</em>, <em>article</em>, <em>review</em>,
        <em>letter to the editor</em>, and <em>academic journal</em> attributed to
        Bernard or Mary Berenson.
      </p>
    </div>
    <p class="source-link">
      <a :href="sourceQueryUrl" target="_blank" rel="noopener">Source query for data</a>
    </p>
    <input
      v-model="search"
      type="search"
      class="filter"
      placeholder="Filter…"
    />
  </header>

  <main>
    <p v-if="loading" class="status">Loading bibliography…</p>
    <p v-else-if="error" class="status error">Error: {{ error }}</p>
    <BibliographyTable v-else :items="items" :search="search" />
  </main>
</template>

<style scoped>
.hero {
  margin-bottom: 1.5rem;
}
h1 {
  font-weight: normal;
  margin: 0 0 1rem;
  font-size: 2.4rem;
  color: #2a1c0a;
  letter-spacing: -0.5px;
}
.intro {
  background: #efece2;
  border-radius: 4px;
  padding: 1rem 1.25rem;
  font-size: 0.95rem;
  color: #3a3528;
}
.intro p {
  margin: 0;
}
.intro p + p {
  margin-top: 0.75rem;
}
.intro .footnote {
  font-size: 0.8rem;
  color: #6a6356;
}
.source-link {
  margin: 0.6rem 0 1rem;
  font-size: 0.9rem;
}
.filter {
  width: 100%;
  padding: 0.7rem 0.9rem;
  font: inherit;
  font-size: 1rem;
  border: 2px solid #6a3a14;
  border-radius: 3px;
  background: #fff;
  color: #222;
}
.filter:focus {
  outline: none;
  border-color: #a85a20;
  box-shadow: 0 0 0 2px rgba(168, 90, 32, 0.2);
}
.status {
  padding: 2rem;
  text-align: center;
  color: #888;
}
.error {
  color: #a33;
}
</style>
