<script setup>
import { computed, reactive, watch } from 'vue';
import { useFinanceStore } from '../stores/finance.js';

const store = useFinanceStore();
const target = computed(() => store.summary?.target);

const form = reactive({ needsPct: 50, wantsPct: 30, savingsPct: 20 });
const total = computed(() => Math.round(((Number(form.needsPct) || 0) + (Number(form.wantsPct) || 0) + (Number(form.savingsPct) || 0)) * 100) / 100);
const valid = computed(() => total.value === 100);

// El formulario sigue al objetivo vigente del mes elegido
watch(
  target,
  (t) => t && Object.assign(form, { needsPct: t.needsPct, wantsPct: t.wantsPct, savingsPct: t.savingsPct }),
  { immediate: true },
);

const origin = computed(() => {
  const t = target.value;
  if (!t) return '';
  if (t.explicit) return 'Fijado para este mes';
  return t.since ? `Heredado de ${t.since}` : 'Valores por defecto (50/30/20)';
});

function save() {
  if (!valid.value) return store.notify(`Los tres porcentajes deben sumar 100 (ahora suman ${total.value})`);
  store.saveTarget({ needsPct: Number(form.needsPct), wantsPct: Number(form.wantsPct), savingsPct: Number(form.savingsPct) });
}
</script>

<template>
  <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Objetivo de reparto mensual</h3>
      <p class="text-[11px] text-slate-400 mt-0.5">
        El objetivo vale para el mes elegido y los siguientes, hasta que fijes otro. No cambia los meses anteriores.
      </p>
    </div>

    <div class="flex items-center justify-between gap-2">
      <label for="target-month" class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Mes</label>
      <input
        id="target-month"
        type="month"
        :value="store.month"
        class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
        @change="store.setMonth($event.target.value)"
      />
    </div>

    <form v-if="target" class="space-y-3" @submit.prevent="save">
      <p class="text-[11px] font-semibold text-slate-500">{{ origin }}</p>
      <div class="grid grid-cols-3 gap-2">
        <label class="text-[11px] font-bold text-slate-500">Necesidades %
          <input v-model="form.needsPct" type="number" min="0" max="100" step="1" inputmode="decimal" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold text-slate-900 text-center" />
          <span class="block mt-0.5 font-normal text-slate-400">Fijos + variables</span>
        </label>
        <label class="text-[11px] font-bold text-slate-500">Deseos %
          <input v-model="form.wantsPct" type="number" min="0" max="100" step="1" inputmode="decimal" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold text-slate-900 text-center" />
          <span class="block mt-0.5 font-normal text-slate-400">Discrecionales</span>
        </label>
        <label class="text-[11px] font-bold text-slate-500">Ahorro %
          <input v-model="form.savingsPct" type="number" min="0" max="100" step="1" inputmode="decimal" class="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-sm font-bold text-slate-900 text-center" />
          <span class="block mt-0.5 font-normal text-slate-400">Lo que sobra</span>
        </label>
      </div>
      <p class="text-[11px] font-bold" :class="valid ? 'text-emerald-600' : 'text-rose-600'">
        Suma: {{ total }}%
        <span v-if="!valid" class="font-normal">· {{ total > 100 ? 'te pasas ' : 'faltan ' }}{{ Math.abs(Math.round((100 - total) * 100) / 100) }}</span>
      </p>
      <div class="flex items-center gap-2">
        <button :disabled="!valid" class="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition disabled:opacity-40">Guardar para {{ store.month }}</button>
        <button v-if="target.explicit" type="button" class="ml-auto text-xs font-bold text-rose-600 px-2 py-2" @click="store.clearTarget()">Quitar el de este mes</button>
      </div>
    </form>
    <p v-else class="text-xs text-slate-400">Cargando...</p>
  </div>
</template>
