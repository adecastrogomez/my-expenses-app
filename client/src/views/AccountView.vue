<script setup>
import { ref, watch } from 'vue';
import { Users, Copy } from '@lucide/vue';
import { useAuthStore } from '../stores/auth.js';
import { useFinanceStore } from '../stores/finance.js';
import TagManager from '../components/TagManager.vue';
import TargetSettings from '../components/TargetSettings.vue';

const auth = useAuthStore();
const store = useFinanceStore();
const name = ref(store.me?.displayName ?? '');
const newGroup = ref('');
const code = ref('');

watch(() => store.me, (m) => (name.value = m?.displayName ?? ''));

async function copyCode() {
  try {
    await navigator.clipboard.writeText(store.group.inviteCode);
    store.notify('Código copiado');
  } catch {
    store.notify(store.group.inviteCode);
  }
}

async function create() {
  if (!newGroup.value.trim()) return;
  await store.createGroup(newGroup.value);
  newGroup.value = '';
}

async function join() {
  if (!code.value.trim()) return;
  await store.joinGroup(code.value);
  code.value = '';
}
</script>

<template>
  <section class="space-y-4">
    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Mi cuenta</h3>
      <p class="text-xs text-slate-500">{{ store.me?.email }}</p>
      <div class="flex gap-2">
        <input v-model="name" aria-label="Tu nombre" maxlength="30" class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800" />
        <button class="bg-slate-100 text-slate-700 font-bold text-xs px-3.5 rounded-xl active:bg-slate-200" @click="store.saveName(name)">Guardar</button>
      </div>
      <button class="text-xs font-bold text-rose-600" @click="auth.signOut()">Cerrar sesión</button>
    </div>

    <div v-if="store.group" class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Users class="w-5 h-5" /></div>
        <div>
          <h3 class="text-sm font-bold text-slate-950">{{ store.group.name }}</h3>
          <p class="text-xs text-slate-400">{{ store.members.map((m) => m.name).join(', ') }}</p>
        </div>
      </div>
      <div class="flex items-center justify-between bg-slate-50 rounded-xl p-3">
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código de invitación</div>
          <div class="text-sm font-black tracking-widest text-slate-900 select-text">{{ store.group.inviteCode }}</div>
        </div>
        <button class="p-2 rounded-lg text-slate-500 active:bg-slate-200" aria-label="Copiar código" @click="copyCode"><Copy class="w-4 h-4" /></button>
      </div>
      <button class="text-xs font-bold text-rose-600" @click="store.leaveGroup()">Salir del grupo</button>
    </div>

    <TargetSettings v-if="!store.isGroup" />

    <TagManager />

    <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
      <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">Crear un grupo</h3>
      <form class="flex gap-2" @submit.prevent="create">
        <input v-model="newGroup" aria-label="Nombre del grupo" maxlength="40" placeholder="ej. Piso, Viaje a Roma..." class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-emerald-500" />
        <button class="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition">Crear</button>
      </form>

      <h3 class="pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">Unirme con un código</h3>
      <form class="flex gap-2" @submit.prevent="join">
        <input v-model="code" aria-label="Código de invitación" maxlength="8" placeholder="Código de 8 caracteres" class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:outline-emerald-500" />
        <button class="bg-slate-900 text-white px-3.5 py-2 rounded-xl text-xs font-semibold active:scale-95 transition">Unirme</button>
      </form>
    </div>
  </section>
</template>
