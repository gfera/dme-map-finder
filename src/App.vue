<template>
  <Header />
  <Main />
</template>
<script lang="ts" setup>
import Header from "./components/Header.vue";
import Main from "./components/Main.vue";
</script>

<style>
#app {
  /* font-family: monospace; */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  display: flex;
  flex-direction: column;
}
body,
html,
#app {
  width: 100%;
  height: 100%;
}
</style>
