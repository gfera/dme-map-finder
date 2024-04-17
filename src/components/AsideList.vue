<template>
  <ul>
    <li
      v-for="item in items"
      :key="item.map.addressString"
      class="cursor-pointer text-sm pl-4 hover:bg-green-300 dark:hover:bg-green-900 flex flex-row justify-between"
      :class="{ 'bg-green-300 dark:bg-green-900': item.opened, 'text-xs opacity-70':item.map.name.startsWith('[AXIS]') }"
      @click="toggleMap(item)"
    >
      <span class="truncate">{{ item.map.name }}
        <small>({{ item.map.dataAddressString }})</small></span>
      <ChevronDownIcon
        class="transform -rotate-90 w-4 inline opacity-0 transition-opacity"
        :class="{ 'opacity-100': item.opened }"
      />
    </li>
  </ul>
</template>
<script lang="ts" setup>
import { PropType, computed } from "vue";
import { useMainStore } from "../store";
import { AsideMap, MapGroup } from "../models/map";

const props = defineProps({
  group: { type: Object as PropType<MapGroup>, required: true },
});

const items = computed(() => props.group.items);

const store = useMainStore();
const toggleMap = (item: AsideMap) => {
  store.toggleMap(item);
};
</script>
