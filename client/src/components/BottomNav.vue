<script setup>
import { computed } from 'vue';
import { LayoutDashboard, Receipt, TrendingUp, Scale, UserRound } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';

defineProps({ modelValue: String });
defineEmits(['update:modelValue']);
const store = useFinanceStore();

const tabs = computed(() =>
  [
    { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { id: 'records', label: 'Movimientos', icon: Receipt },
    { id: 'analytics', label: 'Evolución', icon: TrendingUp },
    store.isGroup && { id: 'balances', label: 'Saldos', icon: Scale },
    { id: 'account', label: 'Cuenta', icon: UserRound },
  ].filter(Boolean),
);
</script>

<template>
  <nav class="bg-white/90 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 safe-bottom fixed bottom-0 left-0 right-0 z-10 flex justify-around items-center">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="flex flex-col items-center py-1.5 px-3"
      :class="modelValue === t.id ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'"
      @click="$emit('update:modelValue', t.id)"
    >
      <component :is="t.icon" class="w-5 h-5 mb-0.5" />
      <span class="text-[10px] font-semibold">{{ t.label }}</span>
    </button>
  </nav>
</template>
