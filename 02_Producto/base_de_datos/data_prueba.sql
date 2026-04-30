-- 1. Insertar Roles necesarios
INSERT INTO roles (nombre_rol) 
VALUES ('Admin'), ('Gerente Cipress'), ('Postulante');

-- 2. Insertar Usuarios (Necesarios para vincular vacantes y candidatos)
-- Simulamos un Gerente y dos Postulantes
INSERT INTO usuarios (nombre, email, password_hash, id_rol)
VALUES 
('Carlos Gerente', 'carlos@cipress.cl', 'hash_password_123', 2), -- ID 1 (Gerente)
('Andrés Postulante', 'andres@ejemplo.cl', 'hash_pass_andres', 3),  -- ID 2 (Postulante)
('Beatriz Postulante', 'beatriz@ejemplo.cl', 'hash_pass_beatriz', 3); -- ID 3 (Postulante)

-- 3. Insertar una Vacante de Prueba (Vinculada al Gerente ID 1)
-- El vector se inserta como un array si usas PostgreSQL con pgvector
INSERT INTO vacantes (titulo, descripcion, id_gerente_creador, perfil_ideal_vector) 
VALUES (
    'Periodista de Innovación', 
    'Buscamos experto en ecosistema startup y tecnología.', 
    1,
    NULL -- Aquí iría el vector generado por tu IA
);

-- 4. Insertar perfiles de Candidatos (Vinculados a sus respectivos Usuarios)
INSERT INTO candidatos (id_usuario, nombre_completo, telefono, cv_texto, cv_vector)
VALUES 
(2, 'Andrés Comunicaciones', '+56912345678', 'Periodista con 5 años en medios digitales y tech.', NULL),
(3, 'Beatriz Redactora', '+56987654321', 'Especialista en comunicación corporativa y RRPP.', NULL);

-- 5. Simular Entrevistas realizadas por la IA
INSERT INTO entrevistas (id_candidato, id_vacante, transcripcion, analisis_sentimiento, score_entrevista)
VALUES 
(1, 1, 'IA: Hola Andrés... Andrés: Hola, me apasiona la tecnología...', '{"sentimiento": "positivo", "entusiasmo": "alto"}', 8.5),
(2, 1, 'IA: Hola Beatriz... Beatriz: Tengo experiencia en prensa escrita...', '{"sentimiento": "neutral", "entusiasmo": "medio"}', 7.0);

-- 6. Simular resultado de Matching y Ranking final
-- Andrés queda en 1er lugar por su score de afinidad y desempeño
INSERT INTO resultados_matching (id_candidato, id_vacante, score_afinidad, ranking_posicion)
VALUES 
(1, 1, 0.8950, 1), 
(2, 1, 0.7210, 2);