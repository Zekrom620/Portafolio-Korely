-- 1. Habilitar extensión vectorial para matching semántico
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla de Roles (Admin, Gerente, Postulante)
CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL -- Ej: 'Admin', 'Gerente', 'Postulante'
);

-- 3. Tabla de Usuarios (Acceso centralizado)
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash TEXT,
    id_rol INT REFERENCES roles(id_rol)
);

-- 4. Tabla de Vacantes (Creadas por el Gerente de Periodismo)
CREATE TABLE vacantes (
    id_vacante SERIAL PRIMARY KEY,
    titulo VARCHAR(100),
    descripcion TEXT,
    perfil_ideal_vector vector(768), -- Vector del "Job Description"
    estado VARCHAR(20) DEFAULT 'Abierta',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_gerente_creador INT REFERENCES usuarios(id_usuario) -- El Gerente que busca
);

-- 5. Tabla de Candidatos (Perfil profesional del Postulante)
CREATE TABLE candidatos (
    id_candidato SERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuarios(id_usuario), -- Vinculación con su cuenta
    nombre_completo VARCHAR(150),
    telefono VARCHAR(20),
    cv_texto TEXT, -- Texto limpio extraído del PDF
    cv_vector vector(768), -- Embedding del CV generado por la IA
    fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Entrevistas (Gestionada por la IA Headhunter)
CREATE TABLE entrevistas (
    id_entrevista SERIAL PRIMARY KEY,
    id_candidato INT REFERENCES candidatos(id_candidato),
    id_vacante INT REFERENCES vacantes(id_vacante),
    transcripcion TEXT, -- Diálogo completo Candidato-IA
    analisis_sentimiento JSONB, -- Resultado detallado de la IA
    score_entrevista DECIMAL(5,2), -- Calificación cuantitativa de la IA
    fecha_entrevista TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Matching y Ranking (El reporte final para el Gerente)
CREATE TABLE resultados_matching (
    id_matching SERIAL PRIMARY KEY,
    id_candidato INT REFERENCES candidatos(id_candidato),
    id_vacante INT REFERENCES vacantes(id_vacante),
    score_afinidad DECIMAL(5,4), -- Similitud de coseno (vector vs vector)
    ranking_posicion INT -- Lugar en el que quedó tras el proceso
);