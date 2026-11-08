# Empaquetado de `hello-function`

## Qué genera el empaquetador

`npm run build:function` limpia `apps/hello-function/dist` y compila el TypeScript con la configuración normal. Después, `npm run package:function` crea `build/hello-function.zip` usando `scripts/package-function.mjs`.

El ZIP contiene el JavaScript compilado bajo `dist/` y un `package.json` de runtime en la raíz. El empaquetador conserva las dependencias de producción y el script de inicio de Functions Framework; elimina `devDependencies` y reemplaza los scripts por el comando de inicio. No incluye `node_modules` ni un lockfile. El script solo agrega archivos JavaScript y omite directorios de pruebas, archivos con sufijos de prueba y utilidades/servidores locales.

El manifiesto generado define `main: dist/index.js`, módulos ES, Node.js 24 y el target `hello`. El código exporta esa función como la aplicación Express para Functions Framework. El workflow de CI comprueba la integridad del ZIP y la presencia de `dist/index.js` y `package.json`. Esa verificación estructural no equivale a probar una instalación limpia del ZIP en Google Cloud.

## Dependencias del artefacto

El ZIP no contiene lockfile. Si el artefacto se despliega con un buildpack de Google, el buildpack resuelve las dependencias de producción desde el manifiesto incluido; los rangos transitivos no quedan fijados por el lockfile del monorepo. Una inspección anterior confirmó que existe una función `hello-function` activa en Google Cloud. No se confirmó que el código de esa función corresponda al árbol actual del repositorio ni a este ZIP; por eso, el proyecto local no se presenta como desplegado actualmente.

Referencias: [dependencias Node.js de Cloud Run functions](https://docs.cloud.google.com/run/docs/runtimes/nodejs-dependencies) y [escritura de funciones HTTP](https://docs.cloud.google.com/run/docs/write-functions).

## Estado

El empaquetado de `hello-function` está implementado y el ZIP se valida en CI configurado. Una ejecución alojada de ese workflow no se ha confirmado. Una inspección previa de solo lectura confirmó que existe una función `hello-function` activa en Google Cloud, pero no vinculó el código desplegado con este ZIP ni con el estado actual del repositorio. El workflow no realiza ese despliegue. El Dockerfile es otro flujo de ejecución: construye un servidor Express independiente; no despliega el ZIP.

El workflow actual no realiza CD. Un workflow de CD separado para la futura `cloud-backend-api` se mantiene como plan; deberá usar Workload Identity Federation (WIF) con restricciones de confianza y permisos revisados para esa API.
