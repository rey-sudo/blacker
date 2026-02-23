---
outline: deep
---

# service-ingest

A microservice that retrieves market data from the data provider, normalizes it, and publishes it as ordered events to Apache Pulsar for consumption by other microservices. It uses deterministic sharding to balance symbols across each shard pod. It is designed to maintain one WebSocket connection per shard. 
It supports clients such as Binance, Databento.

![Ingest](./assets/service-ingest.svg)










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
