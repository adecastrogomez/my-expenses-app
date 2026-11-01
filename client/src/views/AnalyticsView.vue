<script setup>
import { computed } from 'vue';
import { Bar, Doughnut } from 'vue-chartjs';
import { Chart, BarElement, ArcElement, CategoryScale, LinearScale, Legend, Tooltip } from 'chart.js';
import { useFinanceStore } from '../stores/finance.js';
import { formatCurrency } from '../utils/format.js';

Chart.register(BarElement, ArcElement, CategoryScale, LinearScale, Legend, Tooltip);

const store = useFinanceStore();

const chartData = computed(() => ({
  labels: store.history.map((h) => h.month),
  datasets: [
    { label: 'Ingresos', data: store.history.map((h) => h.income), backgroundColor: '#10b981', borderRadius: 6 },
    { label: 'Gastos', data: store.history.map((h) => h.expense), backgroundColor: '#f43f5e', borderRadius: 6 },
    { label: 'Ahorro', data: store.history.map((h) => Math.max(0, h.savings)), backgroundColor: '#3b82f6', borderRadius: 6 },
  ],
}));

const options = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
  },
};

const tagItems = computed(() => store.tagSummary?.items ?? []);

const tagChart = computed(() => ({
  labels: tagItems.value.map((i) => i.name),
  datasets: [{ data: tagItems.value.map((i) => i.total), backgroundColor: tagItems.value.map((i) => i.color), borderWidth: 2, borderColor: '#fff' }],
}));

const tagOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '62%',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          return ` ${formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`;
        },
      },
    },
  },
};

const rows = computed(() => [...store.history].reverse());
</script>

<template>
  <section class="space-y-4">
    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Gastos por etiqueta</h3>
      <p class="text-xs text-slate-500 mb-3">Reparto del gasto de {{ store.month }}</p>
      <div v-if="!tagItems.length" class="py-6 text-center text-xs text-slate-400">No hay gastos este mes</div>
      <template v-else>
        <div class="h-52 relative w-full">
          <Doughnut :data="tagChart" :options="tagOptions" />
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Total</span>
            <span class="text-base font-extrabold text-slate-900">{{ formatCurrency(store.tagSummary.total) }}</span>
          </div>
        </div>
        <ul class="mt-3 divide-y divide-slate-100">
          <li v-for="i in tagItems" :key="i.id ?? 'none'" class="py-2 flex items-center gap-2.5 text-xs">
            <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: i.color }"></span>
            <span class="flex-1 min-w-0 truncate font-semibold text-slate-800">{{ i.name }}</span>
            <span class="font-bold text-slate-900">{{ formatCurrency(i.total) }}</span>
            <span class="w-12 text-right font-semibold text-slate-500">{{ i.pct.toFixed(1) }}%</span>
          </li>
        </ul>
      </template>
    </div>

    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Evolución de Ahorro y Gastos</h3>
      <p class="text-xs text-slate-500 mb-3">Comportamiento dinámico de los últimos meses</p>
      <div class="h-60 relative w-full"><Bar :data="chartData" :options="options" /></div>
    </div>

    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Historial Mensual</h3>
      <div v-if="!rows.length" class="py-4 text-center text-xs text-slate-400">No hay datos suficientes</div>
      <div v-else class="divide-y divide-slate-100">
        <div v-for="r in rows" :key="r.month" class="py-3 flex justify-between items-center text-xs">
          <div>
            <span class="font-bold text-slate-800">{{ r.month }}</span>
            <div class="text-[10px] text-slate-400">Ing: {{ formatCurrency(r.income) }} | Gastos: {{ formatCurrency(r.expense) }}</div>
          </div>
          <div class="text-right">
            <span class="font-bold" :class="r.savings >= 0 ? 'text-emerald-600' : 'text-rose-600'">{{ formatCurrency(r.savings) }}</span>
            <div class="text-[10px] font-semibold text-slate-500">{{ r.savingsRate.toFixed(0) }}% ahorro</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
