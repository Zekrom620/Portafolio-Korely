# KORELY - Sistema de Gestión de Reclutamiento Inteligente 🤖💼

> Ecosistema tecnológico diseñado para transformar el reclutamiento tradicional técnico en un proceso automatizado, inteligente y libre de sesgos. Proyecto desarrollado en conjunto por **Cipress** y **Triskeledu**.


<br />

<div align="center">

![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python)-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=for-the-badge&logo=postgresql)
![Gemini](https://img.shields.io/badge/AI%20Core-Gemini%20Pro%20%26%20Flash-4285F4?style=for-the-badge&logo=googlegemini)

</div>

---

## 📌 Contexto y Problemática

En el mercado actual, la velocidad para contratar talento técnico es crítica. Las organizaciones suelen perder candidatos de alto potencial debido a que el volumen masivo de currículums recibidos supera la capacidad humana de procesamiento en tiempos reducidos, obligando a realizar filtros superficiales o tardíos.

**KORELY** soluciona esto mediante una **Arquitectura Desacoplada** de última generación que integra:
1. **Avatar Conversacional de IA (Gemini Pro/Flash):** Lidera entrevistas virtuales por voz automatizadas, interactivas y estructuradas, recopilando respuestas e infiriendo competencias técnicas y blandas en tiempo real.
2. **Matching Predictivo Vectorial (pgvector + LLM):** Un algoritmo vectorial de similitud semántica de cosenos que complementa una evaluación exhaustiva generada por IA para clasificar al talento según su afinidad real con la vacante, eliminando el sesgo manual.

---

## ⚙️ Módulos del Sistema y Estado de Avance

El desarrollo del proyecto se rige bajo la metodología de **Prototipado Evolutivo**. A continuación se detalla el estado actual de los casos de uso:

| Módulo / Caso de Uso | Descripción Técnica | Estado | % Avance |
| :--- | :--- | :---: | :---: |
| **CU1: Autenticación** | Control de acceso seguro por roles (Admin, Gerente Cipress, Postulante) y manejo de sesión asíncrona mediante tokens JWT encriptados con Bcrypt. | **Operativo** | `100%` |
| **CU2: Gestión de Vacantes** | Panel de administración premium para la creación, listado, edición y eliminación de ofertas laborales, parametrizando competencias, área, salario y modalidad. | **Operativo** | `100%` |
| **CU3: Ingesta y Parsing (IA)** | Carga asíncrona de CVs en PDF, extracción de texto en RAM (`PyPDF2`), estructuración automática de metadatos del candidato usando Gemini y generación de embeddings. | **Operativo** | `100%` |
| **CU4: Entrevista Virtual (IA)** | Interfaz interactiva multimedia con previsualización WebRTC de cámara, control de volumen y reconocimiento/síntesis de voz por navegador (`Web Speech API`) que dialoga de forma inteligente con streaming de Gemini. Al terminar, la IA analiza y califica la conversación. | **Operativo** | `100%` |
| **CU5: Matching Predictivo** | Cálculo de similitud de cosenos semántica (`cv_vector <=> perfil_ideal_vector`) usando la extensión `pgvector` en la BD, consolidado con una ponderación del 60% ajuste de CV y 40% desempeño en entrevista. | **Operativo** | `100%` |
| **CU6: Pipeline Kanban** | Tablero visual dinámico e interactivo (Drag & Drop con Tailwind CSS y Framer Motion) para que los reclutadores gestionen y actualicen los estados de las postulaciones en tiempo real. | **Operativo** | `100%` |
| **CU7: Reportabilidad** | Generación de la Ficha Técnica Profesional del candidato en PDF desde el cliente (`jsPDF`) y simulación premium de envío de reportes comparados por correo (`mock_emails` en HTML/PDF). | **Operativo** | `100%` |

---

## 🛠️ Stack Tecnológico

### Frontend
* **Framework:** Next.js 15 (React 19)
* **Estilado:** Tailwind CSS, Framer Motion (`motion`)
* **Iconografía:** Lucide React
* **Generación de Archivos:** jsPDF
* **Librerías AI:** SDK de Google GenAI (`@google/genai`)

### Backend
* **Framework:** FastAPI (Python 3.11+)
* **Servidor ASGI:** Uvicorn
* **Base de Datos ORM:** SQLAlchemy
* **Seguridad:** PyJWT, Bcrypt (Passlib)
* **IA & NLP:** Google Generative AI (`gemini-3-flash-preview` & `models/gemini-embedding-001`), spaCy.

### Base de Datos
* **Motor:** PostgreSQL 16+ con extensión **`pgvector`** (Embeddings de 768 dimensiones).

---

## 🚀 Instalación y Configuración (Entorno Local)

### Prerrequisitos
* **Python** 3.11+
* **Node.js** 18+
* **Docker & Docker Compose** (para instanciar PostgreSQL con soporte `pgvector`).

---

### 1. Clonar el repositorio y Preparación
```bash
git clone https://github.com/Zekrom620/Portafolio-Korely.git
cd Portafolio-Korely/Producto
```

---

### 2. Base de Datos (Docker & PostgreSQL pgvector)
El proyecto incluye un archivo `docker-compose.yml` preconfigurado para levantar la base de datos Postgres con `pgvector` mapeando el puerto **`5433`** del host:

1. Levantar el contenedor de Docker en segundo plano:
   ```bash
   docker-compose up -d
   ```
2. Inicializar el esquema de tablas. Puedes ejecutar los scripts SQL ubicados en `base_de_datos/tablas.sql` o dejar que SQLAlchemy cree automáticamente el esquema al levantar el backend por primera vez.

---

### 3. Configuración del Backend (FastAPI)
1. Navega a la carpeta de backend y crea tu entorno virtual:
   ```bash
   cd backend
   python -m venv venv
   ```
2. Activa el entorno virtual:
   * **En Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **En macOS/Linux:**
     ```bash
     source venv/bin/activate
     ```
3. Instala todas las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura el archivo **`.env`** en la carpeta `backend/` con las siguientes credenciales:
   ```env
   DATABASE_URL=postgresql://korely_user:korely_password@localhost:5433/korely_db
   GEMINI_API_KEY=tu_api_key_de_google_ai_studio
   JWT_SECRET=tu_clave_secreta_jwt_para_firmar_tokens
   ```
5. **(Opcional) Sanear e Inicializar Base de Datos:**
   Para cargar perfiles de prueba formales (Gerente Cipress y postulantes), puedes ejecutar:
   ```bash
   python setup_formal_db.py
   ```
6. Inicia el servidor de desarrollo del backend:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   El backend estará disponible en: [http://localhost:8000](http://localhost:8000)

---

### 4. Configuración del Frontend (Next.js)
1. Navega a la carpeta de Frontend e instala las dependencias de Node:
   ```bash
   cd ../Frontend
   npm install
   ```
2. Configura el archivo **`.env`** en la carpeta `Frontend/` con las siguientes variables:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY="tu_api_key_de_google_ai_studio"
   NEXT_PUBLIC_BACKEND_URL="http://localhost:8000"
   ```
3. Levanta el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```
   El portal web de Korely estará disponible en: [http://localhost:3000](http://localhost:3000)

---

## 👥 Equipo Evaluador y Desarrolladores

* **Sergio Aranguiz** - Líder de Desarrollo Frontend y Gestión (Responsable de los módulos del simulador de entrevista, Kanban y portal del postulante/gerente).
* **Vicente Farias** - Líder de Desarrollo Backend e IA (Responsable del motor de matching vectorial con pgvector, ingesta de datos, API de seguridad y pipelines de evaluación con Gemini).

*Proyecto desarrollado bajo el marco de Portafolio de Título para DUOC UC, supervisado por el Profesor Arturo Vargas.*
