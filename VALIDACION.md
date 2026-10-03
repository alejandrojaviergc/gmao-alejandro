# Validación de GMAO Web

Fecha: 3 de octubre de 2026. Entorno de verificación: Python del sistema, Node.js y Microsoft Edge en Windows. La aplicación final funciona sin estos programas instalados.

## Comparación con los datasets del notebook

Se compararon los resultados de JavaScript con una implementación independiente en pandas de los métodos de `GMAO_local.ipynb`. Los cuatro archivos contienen 5.090 filas; tras eliminar tres duplicados exactos se analizaron 5.087 OT por archivo.

| Dataset | OT únicas | Reparaciones válidas | MTTR [h] |
| --- | ---: | ---: | ---: |
| Grupo A | 5.087 | 1.722 | 24,213715 |
| Grupo B | 5.087 | 1.762 | 21,448080 |
| Grupo C | 5.087 | 1.392 | 28,200515 |
| Grupo D | 5.087 | 1.212 | 22,556491 |

Pasaron **5.266 comparaciones numéricas**, con tolerancia relativa de 1e-10: conteos, recursos, mezcla, mantenibilidad, Pareto y Jack-Knife. Los datasets reales y los archivos de prueba con datos reales permanecen fuera de `webapp/`.

## Pruebas de cálculo y de interfaz

Las siete pruebas reproducibles de `tests/core.test.cjs` cubren números y fechas, duplicados, conflictos de OT, población MTTR, recursos incompletos, downtime cero, acumulados de Pareto, filtros y columnas mínimas. Ejecutar: `node --test tests/core.test.cjs`.

Se verificaron en Edge: carga del CSV original del grupo B; filtros y selección vacía; cambios de métrica, top y agrupación; carga XLSX con fechas y selección entre varias hojas; descarga de plantilla de 40 columnas; generación del PDF; mantenimiento de la selección anterior ante un archivo incompatible; demostración sintética; apertura directa mediante `file://`; y rutas relativas bajo un prefijo de repositorio simulado.

La vista móvil de 390 px no presentó desbordamiento horizontal. La sesión principal no produjo errores JavaScript ni solicitudes a servicios externos.

## Revisión del informe

El PDF del grupo B contiene 10 páginas: portada, índice, resumen ejecutivo, mantenibilidad, tres Pareto, dos Jack-Knife y calidad/trazabilidad. Se renderizaron todas las páginas para revisar títulos, gráficas, tablas, márgenes y numeración. Ningún bloque de texto quedó fuera del tamaño de página. Un segundo PDF, con sólo una OT preventiva y sin columnas de recursos, mostró los resultados no disponibles y las limitaciones sin inventar indicadores.

## Alcance

La publicación real en GitHub Pages queda pendiente de subir la carpeta al repositorio del usuario. Las pruebas de navegador se realizaron en Edge; no se ejecutó una matriz de navegadores. El formato admite una fila por OT y el esquema del notebook. Los exports SAP por operaciones requieren una transformación previa, pues los códigos y las unidades aún no están confirmados. Los datos opcionales ausentes se muestran como subtotales o no disponibles.
