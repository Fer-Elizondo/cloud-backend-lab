# Revisión del workflow de GitHub Actions

## Resumen

`.github/workflows/deploy.yml` implementa CI y empaquetado para `hello-function`. Se activa con `push` y `pull_request` a `main`, define un único job `ci` y limita el permiso del workflow a `contents: read`. Aunque el archivo se llama `deploy.yml`, no autentica contra Google Cloud ni despliega. No se confirmó una ejecución alojada en GitHub.

## Flujo configurado

El job utiliza un servicio PostgreSQL 16 para la base de integración y realiza estos pasos:

1. Checkout del repositorio y configuración de Node.js 24.
2. Instalación con `npm ci` desde la raíz del monorepo.
3. Suite unitaria con `npm run test:unit --workspace hello-function`.
4. Aplicación de `database/schema.sql` a la base de CI.
5. Carga de usuarios de prueba mediante `database/seed-test-users.mjs`.
6. Suite de integración con `npm run test:integration --workspace hello-function`.
7. Compilación de la función con `npm run build:function`.
8. Empaquetado con `npm run package:function`.
9. Validación de integridad del ZIP y presencia de `dist/index.js` y `package.json`.

El workflow no construye la imagen Docker, no publica artefactos en GCP, no solicita un token OIDC y no ejecuta despliegue.

## Cambio respecto al workflow previamente registrado

La versión que permanece en el último commit base anterior a estos cambios sí configuraba CD para `hello-function`: autenticación OIDC/WIF, carga del ZIP a Cloud Storage y despliegue/consulta de Cloud Functions. La versión de trabajo reemplaza ese contenido en la misma ruta por el workflow de CI descrito arriba. Al conservar el historial Git, la configuración anterior seguirá visible como historial, pero no será la definición activa una vez que la sustitución se incluya en el commit publicado. Hasta que ese cambio llegue a la rama remota, `origin/main` aún conserva la definición previa; por ello, la primera publicación debe incluir la sustitución del workflow antes de cualquier otro push que pudiera ejecutarla.

## Seguridad de pruebas y fixtures

El job define una base dedicada de CI. La configuración de integración y el seeder esperan el destino permitido para CI; el guard comprueba nombre, host y puerto antes de crear el pool. El esquema y los fixtures se aplican a esa base. Los datos estáticos son fixtures de prueba y no deben reutilizarse fuera de una base aislada.

En una validación local registrada pasaron 62 pruebas unitarias y 24 de integración. La integración se ejecutó contra un contenedor temporal PostgreSQL 16, con esquema y fixtures inicializados. Estos resultados no garantizan ejecuciones futuras. La ejecución del workflow en GitHub aún debe verificarse.

## Empaquetado

El workflow compila JavaScript desde `apps/hello-function/src`, crea un ZIP y valida su integridad y entradas básicas. No prueba la instalación ni el arranque del ZIP en un entorno de Cloud Functions, y no demuestra un despliegue activo.

El Dockerfile usa un build de producción separado y ejecuta un servidor Express independiente en el puerto interno 8080. Su build y pruebas HTTP se validaron localmente; estas comprobaciones no forman parte del workflow actual ni demuestran acceso desde Windows por un puerto publicado.

## Relación con WIF y CD

La configuración Terraform declara un pool/proveedor WIF y una cuenta de servicio, pero el workflow no los usa. No existe CD funcional en este workflow. La futura `cloud-backend-api` para Cloud Run deberá tener un workflow de CD independiente, con WIF, confianza restringida, permisos mínimos y configuración de runtime revisada.

## Pendientes

- Confirmar una ejecución real del workflow en GitHub.
- Mantener documentación de CI alineada con los pasos actuales.
- Probar el ZIP en un entorno limpio antes de tratarlo como artefacto de runtime desplegable.
- Diseñar por separado CD de `cloud-backend-api` y validar WIF, permisos y secretos antes de cualquier despliegue.
