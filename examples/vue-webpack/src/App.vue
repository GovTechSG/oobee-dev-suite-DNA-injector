<script setup>
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <main class="app-shell">
    <h1>Vue + Webpack + Oobee DNA Injector</h1>
    <p class="intro">
      Inspect these nodes to confirm DNA attributes are injected.
    </p>

    <section class="card">
      <button type="button" @click="count += 1">
        Clicked {{ count }} times
      </button>
      <a href="https://vuejs.org/" target="_blank" rel="noreferrer">Vue docs</a>
    </section>
  </main>
</template>
