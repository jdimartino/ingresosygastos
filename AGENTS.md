⚠️ Este proyecto Firebase (`ingresos-gastos-pwa-2026`) es COMPARTIDO con las
carpetas `USDT/` y `paypal/` (migradas el 2026-09-24). Los tres comparten un
mismo proyecto, cada uno con su sitio de Hosting:

| Carpeta | Sitio de Hosting | URL |
|---|---|---|
| IngresosYGastos | `ingresos-gastos-pwa-2026` | https://ingresos-gastos-pwa-2026.web.app |
| USDT | `saldo-app-jdm` | https://saldo-app-jdm.web.app |
| paypal | `conciliador-jdm` | https://conciliador-jdm.web.app |

Las reglas e índices de Firestore se centralizan y se despliegan SOLO desde
esta carpeta (`firestore.rules` + `firestore.indexes.json`, referenciados en
`firebase.json`). NO cambies este `firebase.json` para apuntar a otro proyecto
y no corras deploys de Firestore desde `USDT/` ni desde `paypal/` — mismo
patrón que las 4 apps de tenis (torneo-colores manda).

Los proyectos viejos `saldo-app-452d6` y `conciliador-pro-cloud` fueron
eliminados el 2026-09-24, recuperables hasta ~2026-10-24 vía
`gcloud projects undelete <id>` si hiciera falta; después de esa fecha,
borrado permanente. Los datos ya están migrados y verificados en
`ingresos-gastos-pwa-2026`.
