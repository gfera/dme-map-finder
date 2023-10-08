<template>
  <aside
    class="
      w-full
      max-w-xl
      flex-shrink-0
      h-full
      shadow-2xl
      text-left
      flex flex-col
      bg-white
      dark:bg-gray-700
      resize-x
      overflow-hidden
    "
  >
    <div class="p-4 flex-shrink">
      <h3><b>Potential maps found:</b> {{ maps.length }}</h3>
      <h3><b>ECU:</b>{{ ecuNumber }}</h3>
      <h3><b>Checksum:</b>{{ checksumNew }}</h3>
      <h3><b>Current Checksum:</b>{{ checksumCurrent }}</h3>
      <XDF />
    </div>
    <h3 class="px-4 mb-0">
      <b>Maps</b>
    </h3>
    <div
      class="
        bg-gray-100
        border-8 border-white
        p-2
        shadow-inner
        flex-grow
        overflow-auto
        dark:bg-gray-800 dark:border-gray-700
      "
    >
      <AsideList
        v-for="group in groups"
        :key="group.name"
        :group="(group as any)"
      />
    </div>
  </aside>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { useMainStore } from "../store";
import AsideList from "./AsideList.vue";
import XDF from "@/components/xdf/Main.vue";

const store = useMainStore();

const maps = computed(() => store.maps);
const groups = computed(() => store.mapGroups);
const ecuNumber = computed(() => store.ecuNumber);
const checksumCurrent = computed(() => store.checksumCurrent);
const checksumNew = computed(() => store.checksumNew);

</script>
