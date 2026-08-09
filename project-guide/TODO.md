# TODO

## Hecho

- [x] Crear proyecto y conectar dominio.
- [x] Configurar estructura de carpetas `src/`.
- [x] Setup de `globals.css` con el sistema de diseño de Shadcn (tokens y
      variantes dark en `@theme inline`).
- [x] Landing con hero, stack, experiencia y testimonios.
- [x] i18n es/en con next-intl.
- [x] Testimonios: formulario público, persistencia en Supabase y panel de
      moderación en `/admin`.
- [x] Dashboard admin mobile-first con acceso oculto por long-press.
- [x] Documentar variables de entorno en `.env.example`.

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
- [ ] Endurecer la auth admin: la cookie guarda el valor de `ADMIN_PASSWORD` en
      texto plano; conviene un token derivado o firmado.
- [ ] Rate limiting en `POST /api/testimonials` — hoy es un endpoint público sin
      límite.
- [ ] Tests. No hay ninguno todavía.
