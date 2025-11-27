import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, User, Lock, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { AuthResponse } from '@/types';
import { useMutation } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/errors';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setAuth, user } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Error al iniciar sesión'));
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-slate-50 px-4">
      {/* Professional Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full bg-violet-500/20 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700">
        {/* Floating Brand Icon - Fixed z-index and ring color */}
        <div className="absolute -top-12 left-1/2 z-20 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-[2rem] bg-white shadow-2xl shadow-indigo-500/40 ring-8 ring-slate-50 overflow-hidden">
          <img src="/favicon.svg" alt="Logo" className="h-full w-full object-cover" />
        </div>

        <div className="relative z-10 overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl">
          <div className="px-8 pb-8 pt-16 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIST-ALICI ERP</h1>
            <p className="mt-2 text-sm text-slate-500">
              Gestión inteligente para tu panadería
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5 text-left">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Usuario
                </Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
                    <User className="h-5 w-5" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-10 transition-all hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Contraseña
                </Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loginMutation.isPending}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 pl-10 transition-all hover:bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="remember" className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" />
                  <label
                    htmlFor="remember"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-500"
                  >
                    Recordarme
                  </label>
                </div>
                <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-500 hover:underline">
                  ¿Olvidaste tu clave?
                </a>
              </div>

              <Button
                type="submit"
                className="group mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Iniciar sesión
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </Button>
            </form>
          </div>
          
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Acceso seguro con encriptación SSL</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-6 text-slate-400">
          <a href="#" className="text-xs hover:text-slate-600 transition-colors">Términos</a>
          <a href="#" className="text-xs hover:text-slate-600 transition-colors">Privacidad</a>
          <a href="#" className="text-xs hover:text-slate-600 transition-colors">Ayuda</a>
        </div>
      </div>
    </div>
  );
}