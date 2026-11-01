<script setup>
import { computed } from 'vue';
import { Sparkles, Home, ShoppingCart, Coffee } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';
import { formatCurrency } from '../utils/format.js';
import CategoryCard from '../components/CategoryCard.vue';
import TargetCard from '../components/TargetCard.vue';

defineEmits(['configure']);
const store = useFinanceStore();
const s = computed(() => store.summary);

const LEVELS = {
  empty: { card: 'bg-slate-100 border-slate-200 text-slate-800', title: 'text-slate-600', badge: 'bg-slate-200 text-slate-700', icon: 'text-slate-500' },
  excellent: { card: 'bg-emerald-50 border-emerald-200 text-emerald-950', title: 'text-emerald-800', badge: 'bg-emerald-200/80 text-emerald-900', icon: 'text-emerald-600' },
  positive: { card: 'bg-blue-50 border-blue-200 text-blue-950', title: 'text-blue-800', badge: 'bg-blue-200/80 text-blue-900', icon: 'text-blue-600' },
  adjust: { card: 'bg-rose-50 border-rose-200 text-rose-950', title: 'text-rose-800', badge: 'bg-rose-200 text-rose-900', icon: 'text-rose-600' },
};
const level = computed(() => LEVELS[s.value?.diagnostic.level ?? 'empty']);
const pSave = computed(() => Math.max(0, s.value?.savingsRate ?? 0));
</script>

<template>
  <section v-if="s" class="space-y-4">
    <!-- Diagnóstico -->
    <div class="rounded-2xl p-4 shadow-sm flex items-start gap-3 border" :class="level.card">
      <div class="p-2 rounded-xl bg-white shadow-xs mt-0.5" :class="level.icon"><Sparkles class="w-5 h-5" /></div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wider" :class="level.title">{{ s.diagnostic.title }}</h2>
          <span class="text-xs font-extrabold px-2 py-0.5 rounded-full" :class="level.badge">
            {{ s.diagnostic.level === 'empty' ? '0 €' : s.savingsRate.toFixed(1) + '% ahorro' }}
          </span>
        </div>
        <p class="text-xs mt-1 leading-snug font-normal opacity-90">{{ s.diagnostic.message }}</p>
      </div>
    </div>

    <!-- KPIs -->
    <div class="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      <div class="flex justify-between items-end">
        <div>
          <span class="text-xs font-medium text-slate-500 uppercase tracking-wide">Ahorro conseguido</span>
          <div class="mt-0.5 text-3xl font-extrabold tracking-tight" :class="s.savings < 0 ? 'text-rose-600' : 'text-slate-900'">{{ formatCurrency(s.savings) }}</div>
        </div>
        <div class="text-right">
          <span class="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Margen restante</span>
          <div class="text-base font-bold" :class="s.savings < 0 ? 'text-rose-600' : 'text-emerald-600'">{{ s.savingsRate.toFixed(1) }}% tasa ahorro</div>
        </div>
      </div>

      <div class="space-y-1.5">
        <div class="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div class="bg-blue-500 h-full transition-all duration-500" :style="{ width: Math.min(s.categories.fixed.pct, 100) + '%' }"></div>
          <div class="bg-amber-500 h-full transition-all duration-500" :style="{ width: Math.min(s.categories.variable.pct, 100) + '%' }"></div>
          <div class="bg-rose-500 h-full transition-all duration-500" :style="{ width: Math.min(s.categories.discretionary.pct, 100) + '%' }"></div>
          <div class="bg-emerald-500 h-full transition-all duration-500" :style="{ width: Math.min(pSave, 100) + '%' }"></div>
        </div>
        <div class="flex justify-between text-[11px] font-medium text-slate-400 px-0.5">
          <span>0%</span><span>Regla dinámica ({{ s.target.needsPct }}/{{ s.target.wantsPct }}/{{ s.target.savingsPct }})</span><span>100%</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
        <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
          <div class="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>Ingresos Totales
          </div>
          <span class="text-base font-bold text-slate-900">{{ formatCurrency(s.income) }}</span>
        </div>
        <div class="bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
          <div class="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
            <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>Gastos Totales
          </div>
          <span class="text-base font-bold text-slate-900">{{ formatCurrency(s.expense) }}</span>
        </div>
      </div>
    </div>

    <TargetCard @configure="$emit('configure')" />

    <!-- Desglose -->
    <div class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Desglose de Gastos</h3>
        <span class="text-xs text-slate-500 font-medium">Tu objetivo</span>
      </div>
      <CategoryCard
        title="Gastos Fijos" subtitle="Hipoteca, luz base, internet, seguros" :icon="Home"
        :total="s.categories.fixed.total" :pct="s.categories.fixed.pct"
        icon-class="bg-blue-100 text-blue-600" pct-class="text-blue-600" bar-class="bg-blue-500"
      />
      <CategoryCard
        title="Gastos Variables" subtitle="Supermercado, gasolina, farmacia" :icon="ShoppingCart"
        :total="s.categories.variable.total" :pct="s.categories.variable.pct"
        icon-class="bg-amber-100 text-amber-600" pct-class="text-amber-600" bar-class="bg-amber-500"
      />
      <CategoryCard
        title="Gastos Discrecionales" subtitle="Ocio, cenas, compras, caprichos" :icon="Coffee"
        :total="s.categories.discretionary.total" :pct="s.categories.discretionary.pct" :reference="s.target.wantsPct"
        icon-class="bg-rose-100 text-rose-600" pct-class="text-rose-600" bar-class="bg-rose-500"
        :warning="s.income > 0 && s.categories.discretionary.pct > s.target.wantsPct ? `¡Atención! Has superado el ${s.target.wantsPct}% discrecional` : ''"
      />
    </div>
  </section>
</template>
