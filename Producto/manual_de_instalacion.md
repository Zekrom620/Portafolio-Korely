# Manual de Instalación y Configuración - Korely

Este manual detalla los pasos necesarios para instalar, configurar y ejecutar localmente la plataforma de reclutamiento inteligente **Korely** (Frontend Next.js, Backend FastAPI y base de datos PostgreSQL con extensión `pgvector`).

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes en tu sistema:

* **Node.js**: Versión 18.0 o superior (Recomendado v20.x LTS).
* **Python**: Versión 3.10 o superior (con soporte para entornos virtuales `venv`).
* **Docker / Docker Desktop**: Requerido para levantar la base de datos PostgreSQL con soporte vectorial (`pgvector`).
* **Git**: Para clonar el repositorio (opcional).

---

## 2. Paso 1: Configurar la Base de Datos (PostgreSQL + pgvector)

Korely utiliza la extensión `pgvector` de PostgreSQL para realizar búsquedas semánticas y de similitud vectorial de perfiles. Para facilitar su instalación, el proyecto incluye un archivo `docker-compose.yml` que levanta la base de datos de manera automática en el puerto **5433**.

1. Abre tu terminal en la raíz del proyecto (`Producto/`).
2. Ejecuta el siguiente comando para levantar el contenedor en segundo plano:
   ```bash
   docker-compose up -d
   ```
3. Verifica que el contenedor esté corriendo con:
   ```bash
   docker ps
   ```
   *Deberías ver un contenedor con el nombre `korely_db` escuchando en el puerto local `5433`.*

---

## 3. Paso 2: Configurar y Levantar el Backend (FastAPI)

El backend de la plataforma está desarrollado en Python con FastAPI y expone los servicios de ingesta, parsing de PDFs, autenticación y evaluación de entrevistas con Gemini.

1. Ve al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual de Python (`venv`):
   * **Windows**:
     ```powershell
     python -m venv venv
     ```
   * **macOS / Linux**:
     ```bash
     python3 -m venv venv
     ```
3. Activa el entorno virtual:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```
4. Instala las dependencias necesarias:
   ```bash
   pip install -r requirements.txt
   ```
5. Descarga el modelo en español para spaCy (NLP):
   ```bash
   python -m spacy download es_core_news_md
   ```
6. Crea el archivo `.env` en la raíz de la carpeta `backend/` y configura tu clave de Gemini API:
   ```env
   GEMINI_API_KEY=TU_API_KEY_DE_GEMINI_AQUI
   ```
7. Inicia el servidor de desarrollo utilizando Uvicorn:
   ```bash
   uvicorn main:app --port 8000 --reload
   ```
   *El backend estará disponible en `http://localhost:8000`.*
8. Opcional (Probar la conexión): Puedes ingresar a `http://localhost:8000/ping-db` en el navegador para verificar la comunicación exitosa entre FastAPI y PostgreSQL.

---

## 4. Paso 3: Configurar y Levantar el Frontend (Next.js)

El frontend de Korely está construido sobre Next.js (React + TypeScript) e implementa la interfaz inmersiva de entrevistas y paneles de matching del reclutador.

1. Abre una nueva terminal en la carpeta del frontend (`Producto/Frontend/`):
   ```bash
   cd Frontend
   ```
2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz de la carpeta `Frontend/` y define las siguientes variables:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY="TU_API_KEY_DE_GEMINI_AQUI"
   NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
   ```
   *(Asegúrate de que la clave API sea la misma que configuraste en el backend para habilitar el reconocimiento y flujo conversacional por voz del cliente).*
4. Inicia el servidor de desarrollo de Next.js:
   ```bash
   npm run dev
   ```
5. Abre tu navegador e ingresa a `http://localhost:3000`.

---

## 5. Cuentas de Acceso de Prueba (Seed Data)

La base de datos incluye datos iniciales configurados automáticamente al levantar la aplicación. Puedes utilizar las siguientes credenciales para probar los distintos roles del sistema:

### Rol: Gerente (Reclutador)
* **Nombre**: Carlos Valenzuela
* **Email**: `carlos.valenzuela@cipress.cl`
* **Contraseña**: `password123`
* *Vista*: Dashboard general, listado de vacantes, panel de Matching & Base con NLP, y tablero de Pipeline Kanban de candidatos.

### Rol: Postulante (Candidato)
* **Nombre**: Esteban Díaz
* **Email**: `esteban.diaz@example.com`
* **Contraseña**: `password123`
* *Vista*: Listado de vacantes disponibles, sección "Mi Perfil" para cargar el CV, y acceso al simulador de "Entrevista IA" (voz/texto).

