export const ROLES = ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA'] as const
export type Role = typeof ROLES[number]

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VENTAS: 'Ventas',
  PRODUCCION: 'Producción',
  SOLO_LECTURA: 'Solo Lectura',
}

export const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-amber-950 text-amber-300 border-amber-700',
  ADMIN: 'bg-red-950 text-red-300 border-red-800',
  VENTAS: 'bg-green-950 text-green-300 border-green-800',
  PRODUCCION: 'bg-blue-950 text-blue-300 border-blue-800',
  SOLO_LECTURA: 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

// Solo SUPER_ADMIN puede gestionar usuarios
export function canManageUsers(role: string) {
  return role === 'SUPER_ADMIN'
}

// Escritura en clientes: SUPER_ADMIN, ADMIN, VENTAS
export function canWriteClients(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'VENTAS'].includes(role)
}

// Escritura en planes mensuales: SUPER_ADMIN, ADMIN
export function canWriteMonthlyPlans(role: string) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role)
}

// Escritura en contenidos: SUPER_ADMIN, ADMIN, PRODUCCION
export function canWriteContents(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'PRODUCCION'].includes(role)
}

// Asignar planes de servicio a clientes: SUPER_ADMIN, ADMIN, VENTAS
export function canAssignServicePlans(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'VENTAS'].includes(role)
}

// Gestionar catálogo de servicios: SUPER_ADMIN, ADMIN
export function canManageServices(role: string) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role)
}

// Eliminar datos importantes: solo SUPER_ADMIN
export function canDeleteData(role: string) {
  return role === 'SUPER_ADMIN'
}

// Puede ver una sección (todos los roles autenticados pueden leer)
export function canRead(_role: string) {
  return true
}

// Ingresos: solo SUPER_ADMIN y ADMIN
export function canViewIngresos(role: string) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role)
}

export function canWriteIngresos(role: string) {
  return ['SUPER_ADMIN', 'ADMIN'].includes(role)
}

export function canDeleteIngresos(role: string) {
  return role === 'SUPER_ADMIN'
}

// Ítems del menú lateral por rol
export const NAV_ROLES: Record<string, string[]> = {
  '/dashboard':  ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA'],
  '/clientes':   ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA'],
  '/servicios':  ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'SOLO_LECTURA'],
  '/planes':     ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA'],
  '/proyectos':  ['SUPER_ADMIN', 'ADMIN', 'PRODUCCION', 'SOLO_LECTURA'],
  '/contenidos': ['SUPER_ADMIN', 'ADMIN', 'PRODUCCION', 'SOLO_LECTURA'],
  '/reportes':   ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'SOLO_LECTURA'],
  '/ingresos':   ['SUPER_ADMIN', 'ADMIN'],
  '/usuarios':   ['SUPER_ADMIN'],
  '/calendario': ['SUPER_ADMIN', 'ADMIN', 'VENTAS', 'PRODUCCION', 'SOLO_LECTURA'],
}
