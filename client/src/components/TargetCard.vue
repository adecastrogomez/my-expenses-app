<script setup>
import { computed } from 'vue';
import { Target } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';

const emit = defineEmits(['configure']);
const store = useFinanceStore();
const s = computed(() => store.summary);
const target = computed(() => s.value.target);

// Necesidades = fijos + variables; deseos = discrecionales; ahorro = lo que sobra de los ingresos.
const rows = computed(() => {
  const c = s.value.categories;
  return [
    { key: 'needs', label: 'Necesidades', hint: 'Fijos + variables', actual: c.fixed.pct + c.variable.pct, goal: target.value.needsPct, bar: 'bg-blue-500', over: true },
    { key: 'wants', label: 'Deseos', hint: 'Discrecionales', actual: c.discretionary.pct, goal: target.value.wantsPct, bar: 'bg-rose-500', over: true },
    { key: 'savings', label: 'Ahorro', hint: 'Lo que sobra', actual: Math.max(0, s.value.savingsRate), goal: target.value.savingsPct, bar: 'bg-emerald-500', over: false },
  ];
});

// En necesidades/deseos pasarse del objetivo es malo; en ahorro, quedarse corto.
const ok = (r) => (!s.value.income ? true : r.over ? r.actual <= r.goal : r.actual >= r.goal);

const origin = computed(() => {
  const t = target.value;
  if (t.explicit) return 'Fijado para este mes';
  return t.since ? `Heredado de ${t.since}` : 'Valores por defecto';
});
</script>

<template>
  <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><Target class="w-4 h-4" /></div>
        <div>
          <h3 class="text-xs font-bold text-slate-800">Objetivo {{ target.needsPct }}/{{ target.wantsPct }}/{{ target.savingsPct }}</h3>
          <p class="text-[11px] text-slate-400">{{ origin }} · {{ store.month }}</p>
        </div>
      </div>
      <button class="text-[11px] font-bold text-emerald-700 px-2 py-1 rounded-lg active:bg-slate-100" @click="emit('configure')">Cambiar</button>
    </div>

    <div class="space-y-2.5">
      <div v-for="r in rows" :key="r.key">
        <div class="flex justify-between text-[11px]">
          <span class="font-bold text-slate-700">{{ r.label }} <span class="font-normal text-slate-400">· {{ r.hint }}</span></span>
          <span class="font-semibold" :class="ok(r) ? 'text-slate-500' : 'text-rose-600'">{{ r.actual.toFixed(0) }}% <span class="text-slate-400 font-normal">/ objetivo {{ r.goal }}%</span></span>
        </div>
        <div class="relative w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
          <div class="h-full transition-all" :class="ok(r) ? r.bar : 'bg-rose-500'" :style="{ width: Math.min(r.actual, 100) + '%' }"></div>
        </div>
        <div class="relative h-0">
          <span class="absolute -top-2.5 w-0.5 h-3.5 bg-slate-700/70 rounded" :style="{ left: Math.min(r.goal, 100) + '%' }"></span>
        </div>
      </div>
    </div>
  </div>
</template>
