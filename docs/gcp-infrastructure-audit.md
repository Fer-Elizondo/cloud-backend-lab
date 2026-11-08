# Auditoría estática de infraestructura de Google Cloud

## Alcance y estado

Este documento separa las declaraciones encontradas en `infrastructure/terraform/` y el workflow versionado de las observaciones de solo lectura disponibles en Google Cloud. No se ejecutó Terraform ni se modificó ningún recurso. Una inspección previa de solo lectura confirmó que existe una función `hello-function` activa; no confirmó que el Terraform actual se haya aplicado ni que la función activa corresponda al código de este árbol de trabajo.

El repositorio implementa `hello-function`, una aplicación Express con empaquetado orientado a Functions Framework. `cloud-backend-api` es una aplicación diferente planeada para Cloud Run; todavía no está implementada. Cloud Run, Cloud SQL y el despliegue automatizado de esa API siguen pendientes.

## Declaraciones Terraform

La configuración revisada usa variables para proyecto, región y nombre del bucket. Declara:

- Una cuenta de servicio para GitHub Actions y concesiones IAM relacionadas con Cloud Functions, Cloud Storage y Cloud Build.
- Un pool/proveedor de Workload Identity Federation (WIF) para OIDC de GitHub, con mapeo de atributos y una condición para el repositorio configurado.
- APIs de Cloud Functions, Cloud Build, Cloud Resource Manager, Artifact Registry, Cloud Run y Secret Manager.
- Un secreto de ejemplo sin versión ni valor declarado.
- Un bucket con acceso uniforme y permisos para la cuenta de servicio Compute predeterminada.
- Outputs de metadatos de la cuenta de servicio, el proveedor WIF y el bucket.

La condición del proveedor limita el repositorio configurado, pero no restringe explícitamente el ref a una rama. La configuración también otorga permisos IAM a la cuenta de servicio de GitHub Actions. Deben revisarse confianza, permisos y separación de identidades antes de cualquier uso de CD.

## Recursos que no están declarados en los archivos revisados

| Recurso | Estado en la configuración |
| --- | --- |
| Cloud Functions Gen 2 | No se declara un recurso de función en Terraform; una función `hello-function` activa se observó en una consulta de solo lectura. |
| Cloud Run | No se declara un servicio. |
| Cloud SQL | No se declaran instancia, base, usuario, red ni conexión. |
| Artifact Registry | No se declara un repositorio. |
| Cloud Build | No se declara un trigger o build. |
| Identidad de runtime dedicada para la API | No se declara. |

Las APIs habilitadas y los roles relacionados no prueban que exista un despliegue.

## Aplicación y base de datos

`hello-function` obtiene la configuración de PostgreSQL y JWT del entorno. Usa `pg.Pool` con host y puerto; no se encontró integración con Cloud SQL Connector, socket Unix, Cloud SQL Auth Proxy, IP privada o configuración TLS en el código revisado. La aplicación no lee Secret Manager directamente. La entrega de secretos a un runtime y la conectividad con Cloud SQL no están implementadas ni verificadas.

La futura `cloud-backend-api` requiere decisiones y validación propias para conectividad, identidad de runtime y secretos.

## GitHub Actions

`.github/workflows/deploy.yml` ejecuta CI y empaquetado: pruebas unitarias y de integración, preparación de PostgreSQL, inicialización del esquema, fixtures, compilación, ZIP y comprobaciones del artefacto. No solicita permiso OIDC, no utiliza WIF, no sube un artefacto a Google Cloud ni despliega. El nombre del archivo no implica CD. La ejecución en GitHub no está confirmada.

Un workflow de CD independiente para `cloud-backend-api` está planeado. Antes de habilitarlo, debe revisarse la condición de confianza de WIF (incluida la restricción de ref), el mínimo privilegio, las identidades de despliegue y runtime, y la entrega de secretos.

## Estado de recursos

La existencia de `hello-function` activa fue confirmada mediante una consulta de solo lectura. La correspondencia entre su código desplegado y el contenido actual del repositorio no quedó confirmada. No se verificó el estado remoto de Terraform ni se confirmó que las declaraciones revisadas estén aplicadas. Cloud Run y Cloud SQL para la nueva `cloud-backend-api` siguen pendientes. No se leyeron archivos locales de variables, estados ni credenciales, y no se ejecutó Terraform.
