<script setup>
import { ref } from 'vue';
import { Trash2, Check, X } from '@lucide/vue';
import { useFinanceStore } from '../stores/finance.js';

const store = useFinanceStore();

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];

const draft = ref({ name: '', color: PALETTE[0] });
const editing = ref(null); // { id, name, color }

async function add() {
  if (!draft.value.name.trim()) return;
  if (await store.saveTag({ ...draft.value })) {
    // rotamos el color para que las etiquetas nuevas se distingan
    draft.value = { name: '', color: PALETTE[(store.tags.length) % PALETTE.length] };
  }
}

async function saveEdit() {
  if (!editing.value.name.trim()) return;
  if (await store.saveTag(editing.value)) editing.value = null;
}

function remove(tag) {
  if (confirm(`¿Eliminar la etiqueta "${tag.name}"? Sus gastos quedarán sin etiqueta.`)) store.removeTag(tag.id);
}
</script>

<template>
  <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
    <div>
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">
        {{ store.isGroup ? `Etiquetas de ${store.group?.name}` : 'Mis etiquetas' }}
      </h3>
      <p class="text-[11px] text-slate-400 mt-0.5">
        {{ store.isGroup ? 'Comunes a todos los miembros del grupo.' : 'Solo las ves tú.' }} Sirven para clasificar gastos y ver el reparto en Analítica.
      </p>
    </div>

    <ul v-if="store.tags.length" class="divide-y divide-slate-100">
      <li v-for="t in store.tags" :key="t.id" class="py-2">
        <form v-if="editing?.id === t.id" class="flex items-center gap-2" @submit.prevent="saveEdit">
          <input v-model="editing.color" type="color" aria-label="Color" class="w-8 h-8 rounded-lg border border-slate-200 p-0.5 bg-white shrink-0" />
          <input v-model="editing.name" maxlength="30" aria-label="Nombre de la etiqueta" class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800" />
          <button class="p-1.5 text-emerald-600 rounded-lg active:bg-slate-100" aria-label="Guardar"><Check class="w-4 h-4" /></button>
          <button type="button" class="p-1.5 text-slate-400 rounded-lg active:bg-slate-100" aria-label="Cancelar" @click="editing = null"><X class="w-4 h-4" /></button>
        </form>
        <div v-else class="flex items-center gap-2">
          <button class="flex-1 min-w-0 flex items-center gap-2.5 text-left" @click="editing = { ...t }">
            <span class="w-3.5 h-3.5 rounded-full shrink-0" :style="{ backgroundColor: t.color }"></span>
            <span class="text-xs font-bold text-slate-800 truncate">{{ t.name }}</span>
          </button>
          <button class="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg active:bg-slate-100" aria-label="Eliminar etiqueta" @click="remove(t)">
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-xs text-slate-400 py-1">Aún no tienes etiquetas.</p>

    <form class="flex items-center gap-2" @submit.prevent="add">
      <input v-model="draft.color" type="color" aria-label="Color de la nueva etiqueta" class="w-9 h-9 rounded-lg border border-slate-200 p-0.5 bg-white shrink-0" />
      <input v-model="draft.name" maxlength="30" aria-label="Nueva etiqueta" placeholder="ej. Supermercado, Gasolina, Ocio..." class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-500" />
      <button class="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition">Añadir</button>
    </form>
  </div>
</template>
