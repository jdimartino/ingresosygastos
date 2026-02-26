# Guía de Integración con Google Sites

Esta guía detalla los pasos para insertar la PWA (Single Page Application) dentro de tu sistema actual construido en Google Sites.

## 1. Despliegue en Firebase Hosting

Asegúrate de haber configurado tu proyecto de Firebase. 
Ejecuta los siguientes comandos desde la terminal en el directorio del proyecto (`/Users/jdimartino/Desktop/IngresosYGastos`):

```bash
# Iniciar sesión en Firebase (si no lo has hecho)
firebase login

# Inicializar Firebase Hosting
firebase init hosting
# -> Selecciona tu proyecto
# -> Directorio público: dist
# -> Configurar como SPA (Single Page App): Sí
# -> Sobrescribir index.html: No

# Compilar para producción
npm run build

# Desplegar
firebase deploy --only hosting
```

Anota la "Hosting URL" que te indicará la consola al terminar (ejemplo: `https://tu-proyecto.web.app`).

## 2. Inserción en Google Sites

Google Sites permite incrustar páginas web externas mediante un `<iframe>`.

1. Abre tu Google Site en modo edición.
2. Ve a la página donde deseas colocar la app.
3. En el panel derecho de inserción, haz clic en **Incorporar** (Embed).
4. Selecciona la pestaña **Mediante URL**.
5. Pega la URL de tu Firebase Hosting (ej. `https://tu-proyecto.web.app`).
6. Si te pregunta qué mostrar, elige "Página entera" o la opción visual que te ofrezca la previsualización.
7. Haz clic en **Insertar**.

## 3. Ajuste Responsivo (MUY IMPORTANTE)

Para que el diseño Mobile-first de los formularios y las grillas en PC del Dashboard funcionen a la perfección:
- **Redimensiona el bloque incrustado** en el editor de Google Sites para que abarque **todo el ancho** disponible y tenga suficiente **altura libre**.
- No limites el iframe a un recuadro pequeño, ya que la aplicación ajustará inteligentemente su layout dependiendo del espacio que Google Sites le otorgue. La aplicación calculará los anchos basados en el tamaño de ese iframe.
