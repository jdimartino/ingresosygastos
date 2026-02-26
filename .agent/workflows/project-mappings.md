# Mapeo de Proyectos y Reglas de Seguridad de Despliegue

Este documento define la relación oficial entre las carpetas locales y los proyectos de Firebase para evitar despliegues cruzados.

## 📁 Mapeo de Proyectos

| Directorio Local | Proyecto Firebase (ID) | URL Hosting |
| :--- | :--- | :--- |
| `IngresosYGastos` | `ingresos-gastos-pwa-2026` | `https://ingresos-gastos-pwa-2026.web.app` |
| `USDT` | `saldo-app-452d6` | `https://saldo-app-452d6.web.app` |

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
