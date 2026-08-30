# TODO

## Hecho

- [x] Crear proyecto y conectar dominio.
- [x] Configurar estructura de carpetas `src/`.
- [x] Setup de `globals.css` con el sistema de diseño de Shadcn (tokens y
      variantes dark en `@theme inline`).
- [x] Landing con hero, stack, experiencia y testimonios.
- [x] Quitar next-intl y dejar el sitio solo en español. Estuvo con i18n es/en
      hasta el 2026-08-30; mantener dos idiomas al día costaba más de lo que
      aportaba con la audiencia real del sitio.
- [x] Testimonios: formulario público, persistencia en Supabase y panel de
      moderación en `/admin`.
- [x] Dashboard admin mobile-first con acceso oculto por long-press.
- [x] Documentar variables de entorno en `.env.example`.
- [x] Endurecer la auth admin. La cookie llevaba el valor de `ADMIN_PASSWORD` en
      texto plano y no expiraba; ahora lleva un token firmado con HMAC-SHA256
      con vigencia de una semana.

## Pendiente

- [ ] **Rotar credenciales de Supabase y `ADMIN_PASSWORD`.** Hasta el 2026-08-05
      el repo exportaba telemetría con `OTEL_LOG_TOOL_CONTENT`/`TOOL_DETAILS`
      activos, y los valores reales aparecen en `tool_result`/`tool_use` de la
      sesión del 2026-07-28: la `service_role`, la anon key y la password del
      panel salieron hacia un endpoint externo. Rotar las tres.
- [ ] Decidir shadcn: o generar `src/components/ui/` con el CLI, o quitar
      `components.json` y `tailwind.config.ts` y asumir componentes propios.
      Hoy la config existe pero no se usa.
- [ ] Podar dependencias `@radix-ui/*` sin uso heredadas del scaffold de v0.
- [ ] Definir `ADMIN_SESSION_SECRET` en Vercel. No bloquea nada: sin ella la
      clave de firma se deriva de `ADMIN_PASSWORD`. Con un secreto propio,
      rotar la password no cierra las sesiones abiertas.
- [ ] Rate limiting en `POST /api/testimonials` — hoy es un endpoint público sin
      límite.
- [ ] Tests. No hay ninguno todavía.
