<script>
import { fetchBibliography, LIST_QUERY, AUTHORS_QUERY, REVIEWED_QUERY } from './sparql.js'
import BibliographyTable from './components/BibliographyTable.vue'

const QUERY_RUNNER_BASE = 'https://query.semlab.io/#'

function runnerUrl(q) {
  return QUERY_RUNNER_BASE + encodeURIComponent(q.trim())
}

export default {
  name: 'App',
  components: { BibliographyTable },
  data() {
    return {
      items: [],
      loading: true,
      error: null,
      search: '',
      logoUrl: `${import.meta.env.BASE_URL}logo.png`,
      sourceQueries: [
        { label: 'List query', url: runnerUrl(LIST_QUERY) },
        { label: 'Authors / pseudonyms query', url: runnerUrl(AUTHORS_QUERY) },
        { label: 'Reviewed works query', url: runnerUrl(REVIEWED_QUERY) },
      ],
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
    <div class="title-row">
      <img :src="logoUrl" alt="" class="logo" />
      <h1>
        Conoshing the Connoisseurs
        <span class="subtitle">The Early Writings of Bernard and Mary Berenson</span>
      </h1>
    </div>

    <div class="intro">
      <p>
        <em>Conoshing the Connoisseurs: The Early Writings of Bernard and Mary Berenson</em>
        is a bibliography of early publications by Bernard Berenson and Mary Berenson.
        The project lists books, articles, reviews, letters to the editor, and journals
        published 1890–1903—a particularly fruitful and formative period in their
        personal and intellectual lives. During this time, both were grappling with
        questions of connoisseurship and the attribution of artworks, traveling on what
        they called &ldquo;conoshing&rdquo; trips, and poring over photographs to
        determine the authorship of Renaissance works of art. The historical lack of
        recognition of Mary as a scholar may be partly due to gender bias, but also to a
        lack of access to her works and information about them. <em>Conoshing the
        Connoisseurs</em> thus aims to surface Mary&rsquo;s scholarship, demonstrate the
        overlap and distinct contributions of the two scholars, and reveal their early
        intellectual network and interests.
      </p>
      <p>
        Each entry records the Berenson who wrote it, the way the work was signed (or
        not) at the time of publication (e.g.&nbsp;<em>Mary Logan</em>,
        <em>Bernhard Berenson</em>), and—for reviews—the original work being reviewed
        and its author. Driven by SPARQL queries against the
        <a href="https://base.semlab.io/wiki/Main_Page" target="_blank" rel="noopener">Semantic Lab Wikibase</a>,
        this interface merges three queries client-side so multi-author and
        multi-reviewed-work entries are preserved as structured lists rather than
        flattened strings. Source data is maintained as linked open data; entries shown
        here are limited to publication types <em>book</em>, <em>article</em>,
        <em>review</em>, <em>letter to the editor</em>, and <em>academic journal</em>
        written by Bernard or Mary Berenson.
      </p>
    </div>

    <p class="source-links">
      Source queries:
      <span v-for="(q, i) in sourceQueries" :key="q.label">
        <a :href="q.url" target="_blank" rel="noopener">{{ q.label }}</a><span v-if="i < sourceQueries.length - 1">, </span>
      </span>
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
.title-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
.logo {
  width: 110px;
  height: 110px;
  flex-shrink: 0;
}
h1 {
  font-weight: normal;
  margin: 0;
  font-size: 2.1rem;
  color: #2a1c0a;
  letter-spacing: -0.5px;
  line-height: 1.15;
}
.subtitle {
  display: block;
  font-size: 1.05rem;
  color: #6a3a14;
  margin-top: 0.35rem;
  font-style: italic;
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
.source-links {
  margin: 0.75rem 0 1rem;
  font-size: 0.9rem;
  color: #555;
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

@media (max-width: 600px) {
  .title-row {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  .logo {
    width: 90px;
    height: 90px;
  }
}
</style>
