# Mapeo de Proyectos y Reglas de Seguridad de Despliegue

Este documento define la relación oficial entre las carpetas locales y los proyectos de Firebase para evitar despliegues cruzados.

## 📁 Mapeo de Proyectos

| Directorio Local | Proyecto Firebase (ID) | URL Hosting |
| :--- | :--- | :--- |
| `IngresosYGastos` | `ingresos-gastos-pwa-2026` | `https://ingresos-gastos-pwa-2026.web.app` |
| `USDT` | `ingresos-gastos-pwa-2026` (site `saldo-app-jdm`) | `https://saldo-app-jdm.web.app` |
| `paypal` | `ingresos-gastos-pwa-2026` (site `conciliador-jdm`) | `https://conciliador-jdm.web.app` |

> **⚠️ Comparten UN SOLO proyecto Firebase:** desde 2026-09-24, `USDT` y `paypal` migraron sus datos a
> `ingresos-gastos-pwa-2026` y comparten el mismo proyecto que `IngresosYGastos`, con sitios de Hosting
> separados. **Las reglas y los índices de Firestore se centralizan y despliegan SOLO desde esta carpeta**
> (`firestore.rules` + `firestore.indexes.json`) — mismo patrón que las 4 apps de tenis.
> NO agregues la sección `firestore` al `firebase.json` de `USDT` ni de `paypal`.
> Los proyectos viejos `saldo-app-452d6` y `conciliador-pro-cloud` quedan solo como **backup**: no desplegarles.

---

## 🛡️ Reglas de Despliegue Seguro (Obligatorio)

Para evitar despliegues cruzados, **SIEMPRE** se deben cumplir estas reglas antes de ejecutar `firebase deploy`:

1.  **Validación de Carpeta**: Verificar que el nombre de la carpeta coincide con el proyecto.
2.  **Uso del Script**: Utilizar preferiblemente el script `scripts/safe-deploy.sh` incluido en cada proyecto.
3.  **Comando Explícito**: Si se usa el CLI directamente, incluir siempre la bandera `--project`.

### Comando de Verificación Rápida
Antes de cualquier deploy, el agente debe ejecutar:
```bash
# Validar que estamos en la carpeta correcta para el proyecto correcto
[[ "$(basename "$PWD")" == "IngresosYGastos" && "$(npx firebase-tools projects:list | grep -o 'ingresos-gastos-pwa-2026')" ]] || echo "❌ ERROR DE CONTEXTO"
```

---

## 🛠️ Script de Despliegue de Emergencia
En cada proyecto se ha incluido `scripts/safe-deploy.sh`. Este script:
- Autodetecta la carpeta actual.
- Cambia al proyecto de Firebase correcto automáticamente.
- Ejecuta el despliegue con `--project` forzado.
