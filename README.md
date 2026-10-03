# GMAO Web

Aplicación estática para analizar datasets con la estructura de `GMAO_local.ipynb`. Todo el procesamiento y la generación del PDF ocurren en el navegador. No requiere servidor de aplicaciones, cuentas, Python, API ni instalación de paquetes. Las bibliotecas están incluidas localmente; no se cargan desde CDN durante el uso.

## Uso

1. Abre `index.html` en Chrome, Edge o Firefox, o sirve esta carpeta con `python -m http.server 8000` y visita `http://localhost:8000`.
2. Carga un CSV o XLSX. La primera fila debe contener los encabezados; selecciona la hoja si el Excel tiene varias.
3. Filtra por creación, tipo, estado, área, unidad, criticidad u OT/equipo. El análisis y el PDF utilizan la misma selección.
4. Revisa las coberturas y los controles. Exporta el PDF ejecutivo o los datos tratados CSV.

La demostración usa 1.200 OT sintéticas, dos duplicados exactos y ningún registro real del usuario. No se conservan los archivos después de cerrar o recargar la página. Límites: 25 MB y 100.000 filas por carga. Utiliza un navegador moderno.

## Publicar en GitHub Pages

### Repositorio dedicado (recomendado)

Sube **el contenido** de `webapp/` a la raíz del repositorio, incluyendo `vendor/`, `js/`, `assets/` y `.nojekyll`. Ve a **Settings → Pages → Build and deployment → Deploy from a branch**, selecciona la rama `main` y la carpeta `/ (root)`, y guarda. La aplicación queda en `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

También se incluye `.github/workflows/pages.yml`: si deseas usarlo, selecciona **GitHub Actions** como fuente de Pages. El workflow publica el directorio que contiene `index.html`, tanto si está en la raíz como si está en `webapp/`.

### Dentro de un repositorio existente

Sube la carpeta `webapp/` completa. Si Pages publica la raíz de la rama, abre `https://TU_USUARIO.github.io/TU_REPOSITORIO/webapp/`. Si usas el workflow, copia `.github/workflows/pages.yml` a `.github/workflows/` en la **raíz del repositorio**; el workflow detecta `webapp/index.html` y publica sólo `webapp/`.

Todas las rutas son relativas: funciona con el prefijo del repositorio. No se requiere compilar. El sitio no está publicado automáticamente como parte de esta entrega.

Documentación oficial: [configuración de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [workflows personalizados](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Esquema

`OT` y `Tipo_mantenimiento` son obligatorios. Se aceptan los 40 campos del notebook. El botón **Descargar plantilla** genera sus encabezados. Los siguientes campos habilitan cada análisis:

| Análisis | Campos |
| --- | --- |
| Actividad | OT, Tipo_mantenimiento |
| Recursos | Horas_mano_obra, Downtime_h, Costo_total_CLP |
| MTTR | Tipo_mantenimiento, Estado, Fecha_inicio, Fecha_fin |
| MTTR por familia | Tipo_equipo y campos de MTTR |
| Pareto | Modo_falla, Tipo_mantenimiento y métrica de impacto |
| Jack-Knife | Equipo o Modo_falla, campos MTTR, Downtime_h |
| Filtros | Fecha_creación, Área, Unidad, Criticidad, Estado |

Se aceptan encabezados equivalentes sin tildes; CSV UTF-8 o Windows-1252, delimitador automático, valores con apóstrofo inicial, coma decimal y fechas `DD-MM-AAAA HH:mm`, `DD/MM/AAAA HH:mm` o ISO. Los archivos XLSX se leen con ExcelJS; los resultados de fórmulas deben estar guardados en Excel. No se recalculan fórmulas.

**Una fila por OT.** Se eliminan duplicados exactos tras normalizar. Una OT repetida con datos distintos bloquea la carga para evitar duplicar recursos; una exportación por operaciones, como Puerto W27, necesita consolidación y equivalencias explícitas antes de usar este esquema. No se infiere mantenimiento correctivo desde PM01, ni downtime desde duración planificada.

## Método y diferencias controladas

- MTTR = media de `(Fecha_fin − Fecha_inicio)` en horas, sólo correctivos cerrados con duración positiva. Se muestra también mediana y población válida. Las fechas sin zona horaria se interpretan como tiempo civil sin cambios por horario de verano.
- Pareto: correctivos con modo de falla. Acumulados respecto a todos los modos del filtro, aunque se muestre top 10/15/20.
- Jack-Knife: población válida para MTTR. N_límite = fallas / grupos; T_límite = downtime / fallas; duración del grupo = downtime / N. R* = N* × T*. Esta duración no es el MTTR por fechas. R* expresa concentración de downtime y no un riesgo de seguridad.
- Las sumas omiten valores ausentes, no numéricos o negativos y se identifican como **subtotales** con cobertura. Los grupos Jack-Knife con downtime incompleto se excluyen. Los grupos con tiempo cero permanecen en tabla, pero no se dibujan en escala logarítmica.
- MTBF y disponibilidad requieren tiempos operacionales y no se estiman.
- Se admiten columnas opcionales ausentes y datasets sin correctivos; el resultado correspondiente aparece como no disponible.

El PDF utiliza portada, índice con páginas efectivas, tarjetas KPI, secciones de mantenibilidad, Pareto y Jack-Knife, tablas seleccionadas y controles. Las figuras del informe se generan de nuevo sobre el filtro completo, sin heredar el zoom de pantalla.

## Estructura y pruebas

`js/core.js`: normalización, filtros y cálculo sin dependencias del DOM. `js/charts.js`: opciones interactivas ECharts. `js/report.js`: PDF jsPDF/AutoTable. `js/app.js`: lectura y controles. `js/demo.js`: datos sintéticos. `vendor/manifest.json`: versiones, orígenes y SHA-256 de las bibliotecas; licencias adyacentes.

Ejecuta `node --test tests/core.test.cjs` para las pruebas de cálculo. Las comprobaciones frente a A/B/C/D y la prueba de navegador se documentan en `VALIDACION.md`.

Fuentes técnicas: [Papa Parse](https://www.papaparse.com/docs), [ExcelJS](https://github.com/exceljs/exceljs), [Apache ECharts](https://echarts.apache.org/en/api.html), [jsPDF](https://github.com/parallax/jsPDF), [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable). No se redistribuyen los datasets originales ni sus notebooks.
