<template>
  <div class="p-4 shadow-md bg-white rounded-md dark:bg-gray-700">
    <div class="w-full">
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
    <div class="w-full overflow-auto mt-8">
    <table class="w-full">
      <tr v-for="(row, irow) in rows" :key="'r' + irow">
        <td v-if="map.yAxis" class="border-r border-gray-400 border-solid">
          <b>{{ map.yAxis.values[irow] }}{{ map.yAxis.descriptor?.unit }}</b>
        </td>
        <td v-for="(col, icol) in cols" :key="'c' + icol">
          {{ getValue(irow, icol) }}
        </td>
      </tr>
      <tr>
        <td></td>
        <td
          v-for="(col, icol) in cols"
          :key="'x' + icol"
          class="border-t border-gray-400 border-solid"
        >
          <b>{{ map.xAxis.values[icol] }} {{ map.xAxis.descriptor?.unit }}</b>
        </td>
      </tr>
    </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, PropType } from "vue";
import { Map } from "../models/map";

export default defineComponent({
  props: {
    map: {
      type: Object as PropType<Map>,
      required: true,
    },
  },
  setup(props) {
    const map = props.map;
    const rows = map.yAxis?.count || 1;
    const cols = map.xAxis?.count || 1;
    const size = `${cols}x${rows}`;

    const getValue = (row: number, col: number) => {
      const pos = rows === 1 ? col : col * rows + row;
      return map.values[pos];
    };

    const toHex = (value: number) => {
      const hex = value.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    };

    return {
      size,
      rows,
      cols,
      toHex,
      getValue,
    };
  },
});
</script>
