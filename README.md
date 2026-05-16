# KORELY - Sistema de Gestión de Reclutamiento Inteligente 🤖💼

> Ecosistema tecnológico diseñado para transformar el reclutamiento tradicional técnico en un proceso automatizado, inteligente y libre de sesgos. Proyecto desarrollado en conjunto por **Cipress** y **Triskeledu**.

![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=for-the-badge&logo=next.js)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python)-009688?style=for-the-badge&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20pgvector-336791?style=for-the-badge&logo=postgresql)
![Gemini](https://img.shields.io/badge/AI%20Core-Gemini%20Pro%20API-4285F4?style=for-the-badge&logo=googlegemini)

---

## 📌 Contexto y Problemática

En el mercado actual, la velocidad para contratar talento técnico es crítica. Las organizaciones suelen perder candidatos de alto potencial debido a que el volumen masivo de currículums recibidos supera la capacidad humana de procesamiento en tiempos reducidos, obligando a realizar filtros superficiales o tardíos.

**KORELY** soluciona esto mediante una **Arquitectura Desacoplada** que integra:
1. **Avatar LLM (Gemini Pro):** Lidera entrevistas virtuales automatizadas y estructuradas de 10 a 12 minutos.
2. **Matching Predictivo (pgvector):** Un algoritmo vectorial que clasifica el talento según su afinidad semántica con la vacante, eliminando el sesgo manual.

---

## ⚙️ Módulos del Sistema y Estado de Avance

El desarrollo del proyecto se rige bajo la metodología de **Prototipado Evolutivo**. A continuación se detalla el estado real del prototipo actual:

| Módulo / Caso de Uso | Descripción Técnica | Estado | % Avance |
| :--- | :--- | :---: | :---: |
| **CU1: Autenticación** | Control de acceso seguro por roles y manejo de sesión asíncrona mediante tokens JWT. | **Operativo** | `100%` |
| **CU2: Gestión de Vacantes** | Panel de administración para la creación y publicación de ofertas laborales. *Brecha:* Refinando la vista para listar los postulantes asignados a cada vacante. | **En Refinamiento** | `85%` |
| **CU3: Ingesta y Parsing** | Carga de CVs (PDF/Word) y extracción automatizada mediante NLP (`spaCy`). *Brecha:* Acoplamiento del pipeline de extracción con el perfil final del postulante. | **En Desarrollo** | `50%` |
| **CU4: Entrevista Virtual** | Interfaz multimedia síncrona donde el Avatar animado interactúa con el candidato. | **No Iniciado** | `0%` |
| **CU5: Matching Predictivo** | Cálculo de similitud de cosenos para el ranking jerárquico de aptitud técnica. | **No Iniciado** | `0%` |
| **CU6: Pipeline Kanban** | Interfaz gráfica e interactiva (Drag & Drop) con Tailwind CSS para mover candidatos entre estados. *Brecha:* Corrección de persistencia asíncrona en los endpoints del backend. | **En Pruebas** | `50%` |
| **CU7: Reportabilidad** | Generación automatizada de la Ficha Técnica Profesional del candidato evaluado. | **No Iniciado** | `0%` |

---

## 🛠️ Stack Tecnológico

* **Frontend:** Next.js 14, Tailwind CSS, Axios.
* **Backend:** FastAPI (Python 3.11), Uvicorn.
* **Inteligencia Artificial:** Gemini Pro API (Google AI Studio) & spaCy (NLP).
* **Base de Datos:** PostgreSQL con la extensión `pgvector` para embeddings.
* **Infraestructura:** Google Cloud Platform (GCP).

---

## 🚀 Instalación y Configuración (Entorno Local)

### Prerrequisitos
* Python 3.11+
* Node.js 18+
* Instancia de PostgreSQL con soporte `pgvector`.

### 1. Clonar el repositorio
```bash
git clone [https://github.com/Zekrom620/Portafolio-Korely.git](https://github.com/Zekrom620/Portafolio-Korely.git)
cd Portafolio-Korely

2. Configuración del Backend (FastAPI)
Bash

cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt

Configura un archivo .env en la carpeta backend con las siguientes credenciales simuladas:
Fragmento de código

DATABASE_URL=postgresql://user:password@localhost:5432/korely_db
GEMINI_API_KEY=tu_api_key_de_google_ai_studio
JWT_SECRET=tu_clave_secreta_jwt

Levantar el servidor de desarrollo del backend:
Bash

uvicorn main:app --reload

3. Configuración del Frontend (Next.js)
Bash

cd ../frontend
npm install

Configura un archivo .env.local en la carpeta frontend:
Fragmento de código

NEXT_PUBLIC_API_URL=http://localhost:8000

Levantar el servidor de desarrollo del frontend:
Bash

npm run dev

👥 Equipo Evaluador / Desarrolladores

    Sergio Aranguiz - Líder de Desarrollo Frontend y Gestión (Responsable de los módulos de Avatar y Kanban).

    Vicente Farias - Líder de Desarrollo Backend e IA (Responsable del motor de matching e ingesta de datos).

Proyecto desarrollado bajo el marco de Portafolio de Título para DUOC UC, supervisado por el Profesor Arturo Vargas.