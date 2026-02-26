#!/bin/bash

# Script para validar que el despliegue se hace al proyecto correcto desde la carpeta correcta.

CURRENT_DIR=$(basename "$PWD")
EXPECTED_PROJECT=""

if [ "$CURRENT_DIR" == "IngresosYGastos" ]; then
    EXPECTED_PROJECT="ingresos-gastos-pwa-2026"
elif [ "$CURRENT_DIR" == "USDT" ]; then
    EXPECTED_PROJECT="saldo-app-452d6"
fi

if [ -z "$EXPECTED_PROJECT" ]; then
    echo "❌ Error: No se reconoce la carpeta '$CURRENT_DIR' para el despliegue."
    exit 1
fi

ACTIVE_PROJECT=$(npx firebase-tools target:list hosting 2>/dev/null | grep -o "$EXPECTED_PROJECT" | head -1)
if [ -z "$ACTIVE_PROJECT" ]; then
    # Intento obtener el proyecto actual de .firebaserc o listado
    ACTIVE_PROJECT=$(npx firebase-tools projects:list | grep "(current)" | awk '{print $4}')
fi

echo "🔍 Validando despliegue para el proyecto: $EXPECTED_PROJECT..."

if [ "$ACTIVE_PROJECT" != "$EXPECTED_PROJECT" ]; then
    echo "⚠️ ADVERTENCIA: El proyecto activo en Firebase ($ACTIVE_PROJECT) no coincide con el esperado ($EXPECTED_PROJECT)."
    echo "Intentando forzar el proyecto correcto..."
    npx firebase-tools use $EXPECTED_PROJECT
fi

echo "🚀 Todo listo. Ejecutando: firebase deploy --only hosting --project $EXPECTED_PROJECT"
npx firebase-tools deploy --only hosting --project $EXPECTED_PROJECT
