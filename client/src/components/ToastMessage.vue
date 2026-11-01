<script setup>
import { useFinanceStore } from '../stores/finance.js';

const store = useFinanceStore();
</script>

<template>
  <div
    class="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-full shadow-lg z-50 pointer-events-none transition-all duration-300"
    :class="store.toast ? 'opacity-100' : 'opacity-0'"
  >
    {{ store.toast }}
  </div>
</template>
