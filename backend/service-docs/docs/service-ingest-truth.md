---
outline: deep
---

# service-ingest-truth

At startup, the service backfills historical 1-minute candles from the external data provider and persists them to PostgreSQL.
In real time, a single Pulsar consumer receives ticks and forwards them to a dispatcher, which routes each tick to a symbol-specific task via MPSC channels.

Each task processes ticks sequentially, maintains the in-memory live 1-minute candle, and on minute rollover closes and persists the candle.
Live candles are never persisted.


![Ingest](./assets/service-ingest-truth.svg)









The main `useData()` API can be used to access site, theme, and page data for the current page. It works in both `.md` and `.vue` files:

```md
<script setup>
import { useData } from 'vitepress'

const { theme, page, frontmatter } = useData()
</script>

## Results

### Theme Data
<pre>{{ theme }}</pre>

### Page Data
<pre>{{ page }}</pre>

### Page Frontmatter
<pre>{{ frontmatter }}</pre>
```

<script setup>
import { useData } from 'vitepress'

const { site, theme, page, frontmatter } = useData()
</script>

## Results

### Theme Data
<pre>{{ theme }}</pre>

### Page Data
<pre>{{ page }}</pre>

### Page Frontmatter
<pre>{{ frontmatter }}</pre>

## More

Check out the documentation for the [full list of runtime APIs](https://vitepress.dev/reference/runtime-api#usedata).
