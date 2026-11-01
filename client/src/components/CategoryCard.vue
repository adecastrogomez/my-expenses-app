<script setup>
import { formatCurrency } from '../utils/format.js';

defineProps({
  title: String,
  subtitle: String,
  icon: Object,
  total: Number,
  pct: Number,
  reference: Number, // % de referencia 50/30/20
  iconClass: String, // p.ej. "bg-blue-100 text-blue-600"
  pctClass: String,
  barClass: String,
  warning: String,
});
</script>

<template>
  <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
    <div v-if="warning" class="absolute top-0 left-0 right-0 bg-rose-500 text-white text-[10px] font-bold text-center py-0.5">{{ warning }}</div>
    <div class="flex items-center justify-between" :class="{ 'pt-1': warning }">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl flex items-center justify-center" :class="iconClass">
          <component :is="icon" class="w-4 h-4" />
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-800">{{ title }}</h4>
          <p class="text-[11px] text-slate-400">{{ subtitle }}</p>
        </div>
      </div>
      <div class="text-right">
        <span class="text-sm font-bold text-slate-900">{{ formatCurrency(total) }}</span>
        <div class="text-[11px] font-semibold" :class="pctClass">
          {{ pct.toFixed(0) }}%
          <span v-if="reference !== undefined" class="text-slate-400 font-normal">/ ref {{ reference }}%</span>
        </div>
      </div>
    </div>
    <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
      <div class="h-full transition-all" :class="barClass" :style="{ width: Math.min(pct, 100) + '%' }"></div>
    </div>
  </div>
</template>
