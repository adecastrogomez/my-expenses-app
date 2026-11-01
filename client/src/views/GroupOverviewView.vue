<script setup>
import { Home, ShoppingCart, Coffee } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import { formatCurrency } from '../utils/format.js';
import CategoryCard from '../components/CategoryCard.vue';

const store = useFinanceStore();
</script>

<template>
  <section v-if="store.summary" class="space-y-4">
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm">
      <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Gasto del grupo este mes</span>
      <div class="mt-0.5 text-3xl font-extrabold tracking-tight text-slate-900">{{ formatCurrency(store.summary.expense) }}</div>
    </div>

    <div class="space-y-3">
      <h3 class="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Por tipo de gasto</h3>
      <CategoryCard
        title="Fijos" subtitle="Alquiler, suministros, seguros" :icon="Home"
        :total="store.summary.categories.fixed.total" :pct="store.summary.categories.fixed.pct"
        icon-class="bg-blue-100 text-blue-600" pct-class="text-blue-600" bar-class="bg-blue-500"
      />
      <CategoryCard
        title="Variables" subtitle="Supermercado, transporte" :icon="ShoppingCart"
        :total="store.summary.categories.variable.total" :pct="store.summary.categories.variable.pct"
        icon-class="bg-amber-100 text-amber-600" pct-class="text-amber-600" bar-class="bg-amber-500"
      />
      <CategoryCard
        title="Discrecionales" subtitle="Ocio, cenas, caprichos" :icon="Coffee"
        :total="store.summary.categories.discretionary.total" :pct="store.summary.categories.discretionary.pct"
        icon-class="bg-rose-100 text-rose-600" pct-class="text-rose-600" bar-class="bg-rose-500"
      />
    </div>

    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quién ha pagado y qué le corresponde</h3>
      <div class="divide-y divide-slate-100">
        <div v-for="m in store.summary.members" :key="m.userId" class="py-2.5 flex items-center justify-between text-xs">
          <span class="font-bold text-slate-800 truncate">{{ m.name }}</span>
          <div class="text-right shrink-0">
            <div><span class="text-[10px] text-slate-400">Pagó</span> <span class="font-bold text-slate-900">{{ formatCurrency(m.paid) }}</span></div>
            <div><span class="text-[10px] text-slate-400">Le corresponde</span> <span class="font-bold text-slate-900">{{ formatCurrency(m.share) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
