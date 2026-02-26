---
description: Mobile-first development and PWA caching rules
---

# Mobile-First y PWA Caching Rules

Esta workflow debe seguirse SIEMPRE que se haga un cambio en el frontend (UI) o se modifiquen vistas, para asegurar que los usuarios móviles vean los cambios.

1. **Layout y Responsive Design**:
   - Todo nuevo componente debe escribirse pensando primero en móviles (clases de Tailwind: `w-full`, `p-4`, etc.) y luego ajustando para pantallas grandes (`sm:w-auto`, `md:p-8`).
   - El espacio útil en móvil es reducido. Si se agrega un nuevo botón, banner o modal, asegúrate de que no cause overflow horizontal y pueda tocarse fácil con el dedo (mínimo `h-10`, `w-10`).
   - Verifica el sticky headers o fixed footer nav y asegúrate de añadir padding-bottom para zonas seguras (ej. `pb-safe` o pb-24).

2. **Actualización de PWA (Caché móvil)**:
   - Los dispositivos móviles suelen guardar la caché de la aplicación PWA agresivamente.
   - Si trabajas en un proyecto con `vite-plugin-pwa` o similar, **asegúrate** de que exista un mecanismo de **ReloadPrompt** (un toast que diga "Nueva versión disponible, actualizar").
   - NUNCA uses `registerType: 'autoUpdate'` sin un prompt o señalización, porque el Service Worker se actualizará en background pero el DOM móvil seguirá renderizando la caché vieja hasta que el usuario cierre agresivamente la app. Usa `registerType: 'prompt'`.

3. **Verificación**:
   - Al terminar de implementar los cambios, asegúrate de correr el script de deploy o generar la build.
   - Pide al usuario que *"Si no ves los cambios en tu teléfono, revisa si aparece el botón de 'Actualizar versión' del PWA. Si no lo hace, reinicia la app PWA o refresca pulsando f5/deslizando hacia abajo"*.
