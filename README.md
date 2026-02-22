# MaisuApp

Esta aplicación es una herramienta offline-first diseñada para profesores de euskera. Permite gestionar vocabulario y estructuras gramaticales, repasarlas en clase y generar materiales impresos.

## Características principales

- **Multi-profesor**: Cada profesor tiene su propio espacio de datos local.
- **Offline-first**: Los datos se guardan en el navegador usando IndexedDB (Dexie.js). No requiere internet tras la primera carga.
- **Modo Repaso**: Interfaz optimizada para proyectores con control por teclado (Espacio para revelar, Flechas para navegar).
- **Juegos**: Módulo por nivel con jugadores (1-6), turnos y clasificación final.
- **Impresión**: Dos plantillas (Lista y Fichas) optimizadas para A4.
- **Backup**: Exportación e importación de datos en formato JSON.

## Decisiones Técnicas

- **React + Vite + TypeScript**: Para un desarrollo robusto y rápido.
- **Dexie.js**: Wrapper de IndexedDB que facilita las consultas y la reactividad con `useLiveQuery`.
- **Tailwind CSS**: Para un diseño limpio, accesible y responsivo.
- **Framer Motion**: Para transiciones suaves que mejoran la experiencia de usuario.
- **Lucide React**: Set de iconos consistente.

## Cómo usar el Backup

1. Ve a **Mis Listas**.
2. Usa el icono de **Descarga** para exportar tus datos actuales a un archivo `.json`.
3. Usa el icono de **Subida** para importar datos desde un archivo `.json`. Esto fusionará los datos importados con los existentes (evitando duplicados por ID).

## Juegos (nuevo)

1. Ve a **Juegos** desde la pantalla principal.
2. Selecciona **nivel** (`A2`, `B1`, `B2`, `C1`) y, si quieres, un **gaia/tema**.
3. Elige el juego disponible para ese nivel:
   - `A2 / B1`: **Emparejar** y **Sinónimos**
   - `B2 / C1`: **Sinónimos** y **Estructuras**
4. En **Configurar jugadores**, añade de `1` a `6` jugadores.
5. Pulsa **Empezar** para generar una partida de `5` rondas.

### Reglas resumidas de juegos

- **Emparejar**: 5 hitzak con definición en castellano. Se emparejan palabra + definición.
- **Sinónimos**: 5 preguntas de opción múltiple (4 opciones) usando `synonymsEu`.
- **Estructuras**: 5 estructuras; el profesor marca `Correcta/Incorrecta`.

### Datos mínimos para que funcionen

- **Emparejar** (`A2/B1`):
  - Mínimo `5` items `type='hitza'` del nivel seleccionado
  - `es` (definición) no vacío
- **Sinónimos** (`A2/B1/B2/C1`):
  - Mínimo `5` items `type='hitza'` del nivel seleccionado
  - `synonymsEu` con al menos un valor
- **Estructuras** (`B2/C1`):
  - Mínimo `5` items `type='egitura'` del nivel seleccionado

Si activas filtro por **gaia**, los mínimos se aplican dentro de ese tema.

## Construcción como PWA

Para que la aplicación sea instalable como PWA:
1. Asegúrate de que el servidor sirve un `manifest.json` válido.
2. Registra un Service Worker (puedes usar `vite-plugin-pwa` para automatizar esto en un entorno de producción real).
3. En este entorno de desarrollo, la aplicación funciona como una web app responsiva.

## Atajos de Teclado (Modo Repaso)

- **Espacio**: Revelar siguiente pista (Significado -> Sinónimos -> Ejemplo).
- **Flecha Derecha**: Siguiente ítem.
- **Flecha Izquierda**: Ítem anterior.
- **Esc**: Salir del repaso.
