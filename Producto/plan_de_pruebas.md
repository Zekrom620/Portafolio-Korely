# Plan de Pruebas - Korely

Este documento establece el plan de pruebas para la plataforma de reclutamiento inteligente **Korely**. Su objetivo es guiar la verificación funcional, de integración y manual de la aplicación, garantizando que el flujo de reclutamiento asistido por IA funcione de manera correcta y robusta.

---

## 1. Objetivos del Plan de Pruebas

1. **Garantizar la Integridad de los Datos**: Asegurar que los datos del perfil del candidato, sus respuestas de entrevista y los archivos CV subidos se persistan y procesen correctamente.
2. **Validar la Similitud Semántica**: Comprobar que el algoritmo de matching ponderado (60% CV + 40% Entrevista IA) calcule puntuaciones de afinidad lógicas.
3. **Verificar el Flujo de Voz de la IA**: Validar que la interfaz del simulador de entrevista por voz interactúe de forma segura ante fallos de conexión a internet o de permisos de hardware (micrófono/cámara).
4. **Evitar Regresiones**: Asegurar que las actualizaciones de código no rompan funcionalidades del tablero Kanban ni del asistente de reclutamiento.

---

## 2. Alcance y Estrategia de Pruebas

Las pruebas del sistema se dividen en tres niveles de ejecución:

### A. Pruebas Unitarias (Automáticas)
* **Objetivo**: Probar componentes aislados, validando lógica pura de negocio del cliente (ej. renderizado de Kanban, lógica interna de mapeo de apiService).
* **Herramientas**: Vitest + React Testing Library.

### B. Pruebas de Integración y Simulación de API
* **Objetivo**: Asegurar que el ciclo de vida del candidato (Registro -> Login -> Carga de CV -> Aplicación a Vacante -> Entrevista -> Matching en BD) funcione de extremo a extremo sin errores de base de datos o CORS.
* **Herramientas**: Scripts automatizados de Python (`requests`) y subagentes de navegador web (Playwright).

### C. Pruebas Manuales (Exploratorias y Hardware)
* **Objetivo**: Validar la experiencia de usuario inmersiva, los flujos de voz reales (WebRTC + Web Speech API) y los fallos por denegación de permisos de hardware en Chrome/Edge/Firefox.

---

## 3. Matriz de Casos de Prueba Functional

| ID | Módulo | Caso de Prueba | Pasos de Ejecución | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Autenticación | Registro de Candidato | 1. Ir a la pantalla de login.<br>2. Clic en "Crea una ahora".<br>3. Rellenar datos (Nombre, Email, Clave).<br>4. Submit. | Cuenta creada con éxito en la BD. Rol asignado por defecto: `Postulante`. Redirección al Dashboard. |
| **TC-02** | Perfil / CV | Carga y Extracción de Datos de CV | 1. Ir a "Mi Perfil".<br>2. Seleccionar archivo PDF válido.<br>3. Clic en "Digitalizar CV". | El spinner de IA se activa. Se extrae el texto del PDF y el análisis de spaCy/Gemini muestra las competencias del candidato en pantalla. |
| **TC-03** | Vacantes | Postulación a Oferta Abierta | 1. Navegar a la pestaña "Vacantes".<br>2. Seleccionar una oferta.<br>3. Clic en "Postular". | Postulación registrada. El botón cambia a color verde con etiqueta "Postulado" y se deshabilita para evitar duplicidad. |
| **TC-04** | Entrevista | Restricción de Acceso a Simulador | 1. Iniciar sesión como Gerente (carlos.valenzuela@cipress.cl).<br>2. Verificar menú lateral. | La pestaña "Entrevista IA" **no debe ser visible** para gerentes/reclutadores. |
| **TC-05** | Entrevista | Flujo Conversacional de la IA | 1. Iniciar sesión como Candidato.<br>2. Ir a "Entrevista IA".<br>3. Clic en "Iniciar Mi Entrevista con la IA".<br>4. Escribir/hablar respuestas.<br>5. Clic en "Finalizar Entrevista". | La IA formula preguntas acorde a la vacante aplicada. Al finalizar, calcula el score de ajuste y extrae soft skills del diálogo, guardándolo en la base de datos. |
| **TC-06** | Matching | Ponderación de Score Consolidado | 1. Iniciar sesión como Gerente.<br>2. Ir a "Matching & Base".<br>3. Buscar al candidato evaluado. | El puntaje que se muestra combina el **60% CV + 40% Entrevista IA** (Score consolidado). Al hacer clic en "Ver Análisis", se abre un modal con el reporte NLP completo. |
| **TC-07** | Kanban | Gestión del Pipeline y Promoción | 1. Ir a "Pipeline Kanban".<br>2. Buscar tarjeta del candidato.<br>3. Clic en "AVANZAR". | El candidato cambia de columna (ej. de 'Entrevistado' a 'Seleccionado') reflejándose inmediatamente en su registro de la base de datos. |

---

## 4. Guía de Ejecución de Pruebas

### Ejecución de Pruebas Unitarias (Frontend)
1. Abre tu terminal en `Producto/Frontend/`.
2. Corre las pruebas utilizando Vitest:
   ```bash
   npm run test
   ```
   *O alternativamente, corre en modo continuo:*
   ```bash
   npx vitest
   ```

### Ejecución de Pruebas de Integración (Simulación API)
1. Con los servidores de Backend (puerto 8000) y Frontend (puerto 3000) activos.
2. Abre la terminal en `Producto/` y ejecuta el script de simulación de datos en tu entorno virtual activo:
   ```bash
   python Frontend/tests/simulate_juan_perez.py
   ```
3. El script creará un candidato simulado de nombre "Juan Pérez", cargará su archivo PDF de prueba y lo postulará automáticamente para verificar el flujo de la API.
