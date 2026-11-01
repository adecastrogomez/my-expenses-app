<script setup>
import { computed } from 'vue';
import { Wallet, ChevronDown } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';

const store = useFinanceStore();

const sync = computed(
  () =>
    ({
      loading: { label: 'Conectando...', dot: 'bg-amber-400 animate-pulse' },
      online: { label: 'Sincronizado', dot: 'bg-emerald-500' },
      error: { label: 'Sin conexión', dot: 'bg-rose-500' },
    })[store.status],
);
</script>

<template>
  <header class="bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 safe-top shrink-0 flex items-center justify-between gap-2 z-10">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-sm shadow-emerald-200 shrink-0">
        <Wallet class="w-5 h-5" />
      </div>
      <div class="min-w-0">
        <label class="relative flex items-center">
          <select
            aria-label="Contexto: personal o grupo"
            :value="store.context"
            class="appearance-none bg-transparent pr-4 text-sm font-bold tracking-tight text-slate-900 leading-none focus:outline-none cursor-pointer max-w-40 truncate"
            @change="store.setContext($event.target.value)"
          >
            <option value="personal">Personal</option>
            <option v-for="g in store.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
        </label>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="w-2 h-2 rounded-full inline-block" :class="sync.dot"></span>
          <span class="text-[11px] text-slate-500 font-medium">{{ sync.label }}</span>
        </div>
      </div>
    </div>

    <div class="flex items-center bg-slate-100 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-700 shrink-0">
      <input
        type="month"
        aria-label="Mes"
        :value="store.month"
        class="bg-transparent border-none text-xs font-semibold focus:outline-none text-slate-700 cursor-pointer"
        @change="store.setMonth($event.target.value)"
      />
    </div>
  </header>
</template>
