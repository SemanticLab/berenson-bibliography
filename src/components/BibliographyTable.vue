<script>
const TYPE_SHORT = {
  'http://base.semlab.io/entity/Q20639': 'book',
  'http://base.semlab.io/entity/Q20638': 'article',
  'http://base.semlab.io/entity/Q20637': 'journal',
  'http://base.semlab.io/entity/Q28958': 'letter',
  'http://base.semlab.io/entity/Q28960': 'review',
}

export default {
  name: 'BibliographyTable',
  props: {
    items: { type: Array, required: true },
    search: { type: String, default: '' },
  },
  data() {
    return {
      filterBerenson: 'all',
      filterType: 'all',
      sortKey: 'date',
      sortDir: 'asc',
    }
  },
  computed: {
    typeOptions() {
      const seen = new Map()
      for (const it of this.items) {
        if (!seen.has(it.type)) seen.set(it.type, it.typeLabel)
      }
      return Array.from(seen, ([uri, label]) => ({ uri, label }))
    },
    filtered() {
      const q = this.search.trim().toLowerCase()
      return this.items.filter((it) => {
        if (this.filterType !== 'all' && it.type !== this.filterType) return false
        if (this.filterBerenson !== 'all') {
          const has = it.attributions.some((a) => a.berenson === this.filterBerenson)
          if (!has) return false
        }
        if (q) {
          const hay = [
            it.title || '',
            ...it.attributions.map((a) => `${a.berensonLabel} ${a.authorname || ''} ${a.unsigned ? 'unsigned' : ''}`),
            ...it.reviewed.map((r) => `${r.label} ${r.authors.map((a) => a.label).join(' ')}`),
          ]
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
    },
    sorted() {
      const dir = this.sortDir === 'asc' ? 1 : -1
      const key = this.sortKey
      const out = [...this.filtered]
      out.sort((a, b) => {
        let av, bv
        if (key === 'date') {
          av = a.date || ''
          bv = b.date || ''
        } else if (key === 'title') {
          av = (a.title || '').toLowerCase()
          bv = (b.title || '').toLowerCase()
        } else if (key === 'type') {
          av = a.typeLabel || ''
          bv = b.typeLabel || ''
        } else if (key === 'berenson') {
          av = a.attributions[0]?.berensonLabel || ''
          bv = b.attributions[0]?.berensonLabel || ''
        }
        if (av < bv) return -1 * dir
        if (av > bv) return 1 * dir
        return 0
      })
      return out
    },
  },
  methods: {
    typeShort(uri) {
      return TYPE_SHORT[uri] || ''
    },
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortKey = key
        this.sortDir = 'asc'
      }
    },
    sortIndicator(key) {
      if (this.sortKey !== key) return ''
      return this.sortDir === 'asc' ? ' ▲' : ' ▼'
    },
    formatDate(d) {
      if (!d) return ''
      return d.slice(0, 10)
    },
    qid(uri) {
      if (!uri) return ''
      const m = uri.match(/\/(Q\d+)$/)
      return m ? m[1] : uri
    },
    entityUrl(uri) {
      return uri || '#'
    },
    uniqueAuthors(attributions) {
      const seen = new Set()
      const out = []
      for (const a of attributions) {
        const key = `${a.berenson}|${a.unsigned ? '__unsigned__' : a.authorname || ''}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push(a)
      }
      return out
    },
  },
}
</script>

<template>
  <div class="controls">
    <label>
      Author:
      <select v-model="filterBerenson">
        <option value="all">all</option>
        <option value="http://base.semlab.io/entity/Q27450">Bernard Berenson</option>
        <option value="http://base.semlab.io/entity/Q27449">Mary Berenson</option>
        <option value="http://base.semlab.io/entity/Q27534">Logan Pearsall Smith</option>
      </select>
    </label>

    <label>
      Type:
      <select v-model="filterType">
        <option value="all">all</option>
        <option v-for="t in typeOptions" :key="t.uri" :value="t.uri">{{ t.label }}</option>
      </select>
    </label>

    <span class="count">{{ sorted.length }} of {{ items.length }}</span>
  </div>

  <table class="bib">
    <thead>
      <tr>
        <th class="col-date sortable" @click="sortBy('date')">
          Date<span>{{ sortIndicator('date') }}</span>
        </th>
        <th class="col-type sortable" @click="sortBy('type')">
          Type<span>{{ sortIndicator('type') }}</span>
        </th>
        <th class="col-title sortable" @click="sortBy('title')">
          Title<span>{{ sortIndicator('title') }}</span>
        </th>
        <th class="col-attr sortable" @click="sortBy('berenson')">
          Attributed to / pseudonym<span>{{ sortIndicator('berenson') }}</span>
        </th>
        <th class="col-reviewed">Reviews</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="it in sorted" :key="it.item">
        <td class="col-date">{{ formatDate(it.date) }}</td>
        <td class="col-type">
          <span class="type-pill" :class="`t-${typeShort(it.type)}`">{{ it.typeLabel }}</span>
        </td>
        <td class="col-title">
          <a :href="entityUrl(it.item)" target="_blank" rel="noopener">{{ it.title }}</a>
        </td>
        <td class="col-attr">
          <ul v-if="it.attributions.length">
            <li v-for="(a, i) in uniqueAuthors(it.attributions)" :key="i">
              <strong>{{ a.berensonLabel }}</strong>
              <span v-if="a.unsigned"> as <em>unsigned</em></span>
              <span v-else-if="a.authorname"> as <em>{{ a.authorname }}</em></span>
            </li>
          </ul>
        </td>
        <td class="col-reviewed">
          <ul v-if="it.reviewed.length">
            <li v-for="r in it.reviewed" :key="r.item">
              <a :href="entityUrl(r.item)" target="_blank" rel="noopener">{{ r.label }}</a>
              <span v-if="r.authors.length" class="reviewed-authors">
                — {{ r.authors.map((a) => a.label).join(', ') }}
              </span>
            </li>
          </ul>
        </td>
      </tr>
      <tr v-if="!sorted.length">
        <td colspan="5" class="empty">No matches.</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f5f1e6;
  border: 1px solid #e1dac4;
  border-radius: 4px;
}
.controls label {
  font-size: 0.9rem;
  color: #555;
}
.controls select {
  font: inherit;
  padding: 0.25rem 0.4rem;
  margin-left: 0.25rem;
  border: 1px solid #c8c0a8;
  border-radius: 3px;
  background: #fff;
}
.count {
  margin-left: auto;
  font-size: 0.85rem;
  color: #777;
}

.bib {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.bib th {
  text-align: left;
  padding: 0.6rem 0.5rem;
  border-bottom: 2px solid #c8b890;
  background: #f5f1e6;
  font-weight: 600;
  color: #3a2a14;
  white-space: nowrap;
}
.bib th.sortable {
  cursor: pointer;
  user-select: none;
}
.bib th.sortable:hover {
  background: #ece4d0;
}
.bib td {
  padding: 0.6rem 0.5rem;
  border-bottom: 1px solid #ece4d0;
  vertical-align: top;
}
.bib tr:hover td {
  background: #fbf8ee;
}

.col-date {
  width: 100px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: #555;
}
.col-type {
  width: 95px;
}
.col-title {
  min-width: 280px;
}
.col-attr {
  width: 220px;
  font-size: 0.88rem;
}
.col-reviewed {
  font-size: 0.88rem;
}

.col-attr ul,
.col-reviewed ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.col-attr li,
.col-reviewed li {
  margin-bottom: 0.25rem;
}
.reviewed-authors {
  color: #777;
}

.type-pill {
  display: inline-block;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  background: #ddd;
  color: #333;
  white-space: nowrap;
  text-transform: lowercase;
}
.type-pill.t-book {
  background: #d6c39a;
  color: #3a2a14;
}
.type-pill.t-article {
  background: #cfd9c7;
  color: #2c4022;
}
.type-pill.t-review {
  background: #d6c0d3;
  color: #4a2848;
}
.type-pill.t-letter {
  background: #c6d6dc;
  color: #1f3d4a;
}
.type-pill.t-journal {
  background: #e6d2b8;
  color: #5a3a14;
}

.empty {
  padding: 2rem;
  text-align: center;
  color: #888;
}
</style>
