<script setup>
import { ref } from 'vue';
import { Wallet } from '@lucide/vue';
import { useAuthStore } from '../stores/auth.js';
import { supabaseConfigured } from '../supabase.js';

const auth = useAuthStore();
const mode = ref('signin'); // signin | signup
const email = ref('');
const password = ref('');
const name = ref('');
const error = ref('');
const info = ref('');
const busy = ref(false);

async function submit() {
  error.value = info.value = '';
  busy.value = true;
  try {
    if (mode.value === 'signin') {
      await auth.signIn(email.value, password.value);
    } else if (await auth.signUp(email.value, password.value, name.value.trim())) {
      info.value = 'Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.';
      mode.value = 'signin';
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto flex items-center justify-center px-6 safe-top">
    <div class="w-full max-w-sm space-y-5">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-200">
          <Wallet class="w-7 h-7" />
        </div>
        <h1 class="text-lg font-bold text-slate-900">Mis Gastos</h1>
        <p class="text-xs text-slate-500">Tus gastos personales y los compartidos con tu grupo.</p>
      </div>

      <p v-if="!supabaseConfigured" class="text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
        Falta configurar Supabase: rellena <strong>client/.env</strong> (ver <code>.env.example</code>) y reinicia <code>npm run dev</code>.
      </p>

      <form class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3" @submit.prevent="submit">
        <input v-if="mode === 'signup'" v-model="name" type="text" required maxlength="30" placeholder="Tu nombre" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-emerald-500" />
        <input v-model="email" type="email" required autocomplete="email" placeholder="Email" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-emerald-500" />
        <input v-model="password" type="password" required minlength="6" :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'" placeholder="Contraseña (mín. 6)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-semibold focus:outline-emerald-500" />

        <p v-if="error" class="text-xs text-rose-600 font-medium">{{ error }}</p>
        <p v-if="info" class="text-xs text-emerald-700 font-medium">{{ info }}</p>

        <button type="submit" :disabled="busy" class="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold active:scale-[0.98] transition disabled:opacity-50">
          {{ mode === 'signin' ? 'Entrar' : 'Crear cuenta' }}
        </button>
      </form>

      <p class="text-center text-xs text-slate-500">
        {{ mode === 'signin' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?' }}
        <button class="text-emerald-600 font-bold" @click="mode = mode === 'signin' ? 'signup' : 'signin'; error = info = ''">
          {{ mode === 'signin' ? 'Regístrate' : 'Inicia sesión' }}
        </button>
      </p>
    </div>
  </div>
</template>
