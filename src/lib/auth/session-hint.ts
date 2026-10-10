/**
 * Una segunda cookie, sin secreto, que el navegador sí puede leer: solo dice
 * "acá hay una sesión de admin". La usa el botón flotante del sitio
 * (`src/components/admin/admin-fab.tsx`) para decidir si aparece sin
 * preguntarle al servidor: las páginas públicas son estáticas y un visitante
 * no paga un request extra.
 *
 * No autoriza nada. Quien la escriba a mano ve un botón que lleva al login; las
 * acciones siguen pasando por `requireAdmin` y la cookie firmada.
 *
 * Vive aparte de `session.ts` porque ese módulo es de servidor (lee la clave
 * de firma) y este lo importa un componente de cliente.
 */
export const SESSION_HINT_COOKIE = "admin_hint";
