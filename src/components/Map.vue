<template>
  <div class="p-4 shadow-md bg-white rounded-md dark:bg-gray-700 text-sm">
    <div class="w-full relative">
      <button
        class="absolute top-0 right-0"
        @click="close"
      >
        X
      </button>
      <h1 class="text-xl">
        <b>{{ map.name }}</b>
      </h1>
      <div class="text-left">
        <h4><b>Location:</b> 0x{{ map.address.toString(16) }}</h4>
        <h4><b>Data Location:</b> 0x{{ map.dataAddress.toString(16) }}</h4>
        <h4><b>Size:</b> {{ size }}</h4>
        <h4 v-if="map.xAxis.descriptor">
          <span><b>xAxis:</b>{{ map.xAxis.descriptor.name }}</span>
          <span class="ml-1">(0x{{ toHex(map.xAxis.descriptor.value) }})</span>
        </h4>
        <h4 v-if="map.yAxis.descriptor">
          <span><b>xAxis:</b>{{ map.yAxis.descriptor.name }} </span>
          <span class="ml-1">(0x{{ toHex(map.yAxis.descriptor.value) }})</span>
        </h4>
      </div>
    </div>
    <ScrollPanel class="w-full mt-8 text-sm">
      <table>
        <tr
          v-for="(row, irow) in rows"
          :key="'r' + irow"
        >
          <td
            v-if="map.yAxis"
            class="border-r border-gray-100 border-solid px-2 py-1"
          >
            <b>{{ map.yAxis.values[irow] }}{{ map.yAxis.descriptor?.unit }}</b>
          </td>
          <td
            v-for="(col, icol) in cols"
            :key="'c' + icol"
            @click="toggleRaw"
          >
            {{ getValue(irow, icol, showRaw) }}
          </td>
        </tr>
        <tr>
          <td />
          <td
            v-for="(col, icol) in cols"
            :key="'x' + icol"
            class="border-t border-gray-100 border-solid px-2"
          >
            <b>{{ map.xAxis.values[icol] }} {{ map.xAxis.descriptor?.unit }}</b>
          </td>
        </tr>
      </table>
    </ScrollPanel>
  </div>
</template>
<script lang="ts" setup>
import {  PropType, ref } from "vue";
import { AsideMap, EcuMap } from "../models/map";

import { useMainStore } from "@/store";
import ScrollPanel from "primevue/scrollpanel";

const props = defineProps({
  map: {
    type: Object as PropType<EcuMap>,
    required: true,
  },
});
const rows = props.map.yAxis?.count || 1;
const cols = props.map.xAxis?.count || 1;
const size = `${cols}x${rows}`;


const showRaw = ref(false);
const toggleRaw = () =>{
  showRaw.value = !showRaw.value;
}

const getValue = (row: number, col: number, raw=false) => {
  const pos = rows === 1 ? col : col * rows + row;
  return raw ? props.map.rawValues[pos] : props.map.values[pos];
};

const toHex = (value: number) => {
  const hex = value.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

const store = useMainStore();
const close = ()=>{
  const sideMap = store.mapGroups.map(mg=>mg.items).flat().find(am=>am.map===props.map) as AsideMap;
  if(sideMap){
    store.toggleMap(sideMap)
  }
}

</script>
<style scoped>
td:nth-child(odd) {
  background-color: rgb(var(--surface-200));
}
</style>