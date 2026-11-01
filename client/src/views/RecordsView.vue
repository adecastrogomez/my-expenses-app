<script setup>
import { ReceiptText } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import TransactionItem from '../components/TransactionItem.vue';

defineEmits(['edit']);
const store = useFinanceStore();

const filters = [
  ['all', 'Todos'],
  ['income', 'Ingresos'],
  ['fixed', 'Fijos'],
  ['variable', 'Variables'],
  ['discretionary', 'Discrecionales'],
];
</script>

<template>
  <section class="space-y-3">
    <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        v-for="[id, label] in filters"
        :key="id"
        class="px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
        :class="store.filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'"
        @click="store.filter = id"
      >
        {{ label }}
      </button>
    </div>

    <div v-if="!store.filteredTransactions.length" class="text-center py-12 text-slate-400">
      <div class="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-2"><ReceiptText class="w-6 h-6" /></div>
      <p class="text-xs">No hay movimientos en este mes todavía.</p>
      <p class="text-[11px] mt-1">Pulsa en el botón <span class="font-bold text-emerald-600">+</span> para añadir uno.</p>
    </div>

    <div class="space-y-2">
      <TransactionItem v-for="tx in store.filteredTransactions" :key="tx.id" :tx="tx" @edit="$emit('edit', $event)" />
    </div>
  </section>
</template>
