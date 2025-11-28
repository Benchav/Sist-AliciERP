import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/errors';
import { PageHeading } from '@/components/PageHeading';
import { 
  Plus, 
  Trash2, 
  Users as UsersIcon, 
  Shield, 
  ChefHat, 
  Store, 
  Search,
  UserCircle
} from 'lucide-react';
import type { User, UserRole } from '@/types';

interface CreateUserRequest {
  username: string;
  password: string;
  rol: UserRole;
  nombre: string;
}

export default function Users() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    username: '',
    password: '',
    rol: 'CAJERO',
    nombre: '',
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<{ data: any[] }>('/auth/users');
      // Normalizar datos por si viene 'rol' en lugar de 'role'
      return data.data.map(u => ({
        ...u,
        role: u.role || u.rol
      })) as User[];
    },
  });

  const filteredUsers = users?.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: async (user: CreateUserRequest) => {
      await api.post('/auth/register', user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario creado exitosamente');
      setIsDialogOpen(false);
      setNewUser({ username: '', password: '', rol: 'CAJERO', nombre: '' });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al crear usuario'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado exitosamente');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Error al eliminar usuario'));
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.nombre) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }
    createMutation.mutate(newUser);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
      deleteMutation.mutate(id);
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { 
          label: 'Administrador', 
          icon: Shield, 
          className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200' 
        };
      case 'PANADERO':
        return { 
          label: 'Panadero', 
          icon: ChefHat, 
          className: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' 
        };
      case 'CAJERO':
        return { 
          label: 'Cajero', 
          icon: Store, 
          className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200' 
        };
      default:
        return { 
          label: role, 
          icon: UserCircle, 
          className: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200' 
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading 
          title="Gestión de Usuarios" 
          description="Administra el acceso y roles del personal." 
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Complete los datos para registrar un nuevo miembro del equipo.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nombre"
                    className="pl-9"
                    value={newUser.nombre}
                    onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="jperez"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={newUser.rol}
                    onValueChange={(value: UserRole) => setNewUser({ ...newUser, rol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="PANADERO">Panadero</SelectItem>
                      <SelectItem value="CAJERO">Cajero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Guardando...' : 'Guardar Usuario'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Usuarios Registrados
              </CardTitle>
              <CardDescription>
                Lista del personal con acceso al sistema
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-6">Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right pr-6">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p>Cargando usuarios...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <UsersIcon className="h-12 w-12 text-slate-200" />
                      <p>No se encontraron usuarios</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => {
                  const roleConfig = getRoleConfig(user.role);
                  const RoleIcon = roleConfig.icon;
                  
                  return (
                    <TableRow key={user.id} className="group hover:bg-slate-50/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500 font-medium text-lg">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{user.username}</span>
                            {user.nombre && (
                              <span className="text-xs text-slate-500">{user.nombre}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`px-2.5 py-0.5 gap-1.5 border ${roleConfig.className}`}
                        >
                          <RoleIcon className="h-3.5 w-3.5" />
                          {roleConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => handleDelete(user.id)}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}