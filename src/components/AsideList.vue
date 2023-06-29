<template>
  <div
    v-if="group"
    class="mb-2"
  >
    <div
      class="
        items-center
        cursor-pointer
        justify-between
        flex flex-row
        hover:bg-lightBlue-500
        dark:hover:bg-lightBlue-900
      "
      @click="toggleCollapse"
    >
      <b>{{ group.name }} ({{ group.items.length }})</b>
      <ChevronDownIcon
        class="w-4 inline-block transform transition-transform"
        :class="{ 'rotate-180': !collapse }"
      />
    </div>
    <ul
      v-if="!collapse"
      class="mb-2"
    >
      <li
        v-for="item in items"
        :key="item.map.addressString"
        class="cursor-pointer pl-4 hover:bg-green-300 dark:hover:bg-green-900 flex flex-row justify-between"
        :class="{ 'bg-green-300 dark:bg-green-900': item.opened }"
        @click="toggleMap(item)"
      >
        {{ item.map.name }}
        <ChevronDownIcon
          class="transform -rotate-90 w-4 inline opacity-0 transition-opacity"
          :class="{ 'opacity-100': item.opened }"
        />
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import { PropType, computed, ref } from "vue";
import { useMainStore } from "../store";

import { ChevronDownIcon } from "@heroicons/vue/solid";
import { AsideMap, MapGroup } from "../models/map";
import { mapGroups } from "@/utils/map-base";

const props = defineProps({
  group: { type: Object as PropType<MapGroup>, required: true },
})

const items = computed(()=>{
  console.log(props.group)
  return props.group.items
})

const store = useMainStore();
const toggleMap = (item: AsideMap) => {
  store.toggleMap(item)

};
const collapse = ref(true);
const toggleCollapse = () => (collapse.value = !collapse.value);

</script>
