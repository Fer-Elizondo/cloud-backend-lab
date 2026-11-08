# Auditoría de dependencias

## Resumen

La auditoría más reciente mediante `npm audit` reportó **6 hallazgos moderados** en el árbol completo y **3 moderados** al omitir dependencias de desarrollo. No se reportaron vulnerabilidades altas o críticas. Los conteos de npm reflejan instancias afectadas en las rutas del árbol y no el número de nombres de paquetes distintos.

No se ejecutó `npm audit fix` ni se aplicaron downgrades para resolver los hallazgos descritos aquí.

## Hallazgos

| Paquete vulnerable | Versión instalada | Severidad e identificador | Ruta de dependencia | Alcance |
| --- | --- | --- | --- | --- |
| `uuid` | 8.3.2 | Moderada — [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | `hello-function → @google-cloud/functions-framework@5.0.5 → cloudevents@10.0.0 → uuid@8.3.2` | Producción; permanece en `npm audit --omit=dev`. |
| `minimatch` | 10.2.6 | Moderada — [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | `archiver@8.0.0 → readdir-glob@3.0.0 → minimatch@10.2.6` | Desarrollo; corresponde al empaquetado y se omite con `npm audit --omit=dev`. |

La ruta de producción de `uuid` proviene de Functions Framework, dependencia declarada por `hello-function`. Esto debe revisarse antes de un despliegue productivo. La ruta de `minimatch` se incorpora por `archiver`, que está declarado como dependencia de desarrollo en el paquete raíz.

## Remediación a evaluar

La salida de npm indicó que su solución automática requeriría cambios mayores: degradar `@google-cloud/functions-framework` a 2.0.0 para la ruta de `uuid`, y `archiver` a 7.0.1 para `minimatch`. Esas sugerencias no se aplicaron. Antes de remediar, hay que evaluar una ruta compatible de actualización o un override cuidadosamente validado y probar las funciones dependientes. No degradar paquetes de forma automática sin revisar compatibilidad.

## Versiones revisadas sin hallazgo en esa ejecución

Las versiones instaladas consultadas incluyeron `body-parser@2.4.0`, `zod@4.6.6`, `fast-uri@3.1.9` y `qs@6.16.1`; no aparecieron en el informe de vulnerabilidades de esa ejecución.

Esta nota registra resultados observados; no garantiza que futuras auditorías reporten el mismo estado.
