<script setup>
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <main class="app-shell">
    <h1>Vue + Vite + Oobee DNA Injector</h1>
    <p class="intro">
      Open DevTools and inspect these elements for data-oobee attributes.
    </p>

    <section class="card">
      <button type="button" @click="count += 1">
        Clicked {{ count }} times
      </button>
      <a href="https://vuejs.org/" target="_blank" rel="noreferrer">Vue docs</a>
    </section>
  </main>
</template>
