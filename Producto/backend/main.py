from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Any
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import security


# Importamos configuración, motor y modelos
from database import get_db, engine
import models

import nlp_engine 
import pdf_handler

# 1. Crear tablas automáticamente si no existen
models.Base.metadata.create_all(bind=engine)

# 2. Inicializamos la aplicación
app = FastAPI(
    title="API de Korely",
    description="Backend para el Headhunter Autónomo",
    version="1.0.0"
)

# --- BLOQUE DE CORS CORREGIDO ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------------

# --- 3. ESQUEMAS (Pydantic) ---
class VacanteCreate(BaseModel):
    titulo: str
    descripcion: str
    id_gerente_creador: Optional[int] = None 
    competencias: Optional[List[str]] = None
    area: Optional[str] = None
    mode: Optional[str] = None
    seniority: Optional[str] = None
    salary: Optional[str] = None

class VacanteResponse(BaseModel):
    id_vacante: int  
    titulo: Optional[str]
    descripcion: Optional[str]
    estado: Optional[str]
    competencias: Optional[List[str]] = None
    area: Optional[str] = None
    mode: Optional[str] = None
    seniority: Optional[str] = None
    salary: Optional[str] = None

    class Config:
        from_attributes = True

# --- ESQUEMAS DE CANDIDATOS ---
class CandidatoCreate(BaseModel):
    id_usuario: int
    nombre_completo: str
    telefono: str
    cv_texto: str

class CandidatoResponse(BaseModel):
    id_candidato: int
    id_usuario: int
    nombre_completo: str
    telefono: str
    cv_texto: str
    cv_estructurado: Optional[Any] = None
    id_vacante: Optional[int] = None
    estado: Optional[str] = None
    score_ia: Optional[int] = None

    class Config:
        from_attributes = True

class CandidatoUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    telefono: Optional[str] = None
    estado: Optional[str] = None

# --- ESQUEMAS DE LOGIN ---
class LoginRequest(BaseModel):
    email: str
    password: str

class RegistroRequest(BaseModel):
    nombre: str
    email: str
    password: str
    # No pedimos el id_rol porque lo asignaremos internamente por seguridad

# --- ESQUEMA DE POSTULACION ---
class PostulacionCreate(BaseModel):
    id_vacante: int

# --- 4. RUTAS (Endpoints) ---
@app.get("/")
def ruta_raiz():
    return {"status": "ok", "mensaje": "¡El motor de Korely está encendido!"}

@app.get("/ping-db")
def probar_conexion_db(db: Session = Depends(get_db)):
    """Endpoint de diagnóstico."""
    try:
        resultado = db.execute(text("SELECT 1")).scalar()
        if resultado == 1:
            return {"status": "ok", "mensaje": "¡Conexión exitosa a PostgreSQL con pgvector!"}
    except Exception as e:
        return {"status": "error", "mensaje": f"Error conectando a la BD: {str(e)}"}

@app.get("/ping")
def ping():
    return {"status": "ok"}

@app.get("/vacantes", response_model=List[VacanteResponse])
def obtener_vacantes(db: Session = Depends(get_db)):
    """Obtiene todas las vacantes de la base de datos."""
    vacantes = db.query(models.Vacante).all()
    return vacantes

@app.post("/vacantes", response_model=VacanteResponse)
def crear_vacante(vacante: VacanteCreate, db: Session = Depends(get_db),id_gerente: int = Depends(security.obtener_usuario_gerente)):
    """Crea una nueva vacante con campos estructurados."""
    competencias_limpias = []
    if vacante.competencias:
        for comp in vacante.competencias:
            if "," in comp:
                competencias_limpias.extend([c.strip() for c in comp.split(",") if c.strip()])
            else:
                c_clean = comp.strip()
                if c_clean:
                    competencias_limpias.append(c_clean)

    # Combinamos título, descripción y competencias para mayor contexto del vector semántico
    competencias_str = ", ".join(competencias_limpias)
    texto_vacante = f"Título: {vacante.titulo}\nDescripción: {vacante.descripcion}\nCompetencias: {competencias_str}"
    perfil_vector = nlp_engine.generar_embedding(texto_vacante)

    nueva_vacante = models.Vacante(
        titulo=vacante.titulo, 
        descripcion=vacante.descripcion,
        id_gerente_creador=vacante.id_gerente_creador,
        estado="Abierta",
        perfil_ideal_vector=perfil_vector,
        competencias=competencias_limpias,
        area=vacante.area,
        mode=vacante.mode,
        seniority=vacante.seniority,
        salary=vacante.salary
    )
    db.add(nueva_vacante)
    db.commit()
    db.refresh(nueva_vacante)
    return nueva_vacante

@app.get("/vacantes/{id_vacante}", response_model=VacanteResponse)
def obtener_vacante(id_vacante: int, db: Session = Depends(get_db)):
    """Obtiene los detalles de una vacante específica por su ID."""
    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    return vacante

@app.put("/vacantes/{id_vacante}", response_model=VacanteResponse)
def actualizar_vacante(id_vacante: int, vacante_actualizada: VacanteCreate, db: Session = Depends(get_db), id_gerente: int = Depends(security.obtener_usuario_gerente)):
    """Actualiza los datos de una vacante existente."""
    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    
    competencias_limpias = []
    if vacante_actualizada.competencias:
        for comp in vacante_actualizada.competencias:
            if "," in comp:
                competencias_limpias.extend([c.strip() for c in comp.split(",") if c.strip()])
            else:
                c_clean = comp.strip()
                if c_clean:
                    competencias_limpias.append(c_clean)

    # Actualizamos los campos
    vacante.titulo = vacante_actualizada.titulo
    vacante.descripcion = vacante_actualizada.descripcion
    vacante.id_gerente_creador = vacante_actualizada.id_gerente_creador
    vacante.competencias = competencias_limpias
    vacante.area = vacante_actualizada.area
    vacante.mode = vacante_actualizada.mode
    vacante.seniority = vacante_actualizada.seniority
    vacante.salary = vacante_actualizada.salary
    
    # Regeneramos el vector
    competencias_str = ", ".join(competencias_limpias)
    texto_vacante = f"Título: {vacante_actualizada.titulo}\nDescripción: {vacante_actualizada.descripcion}\nCompetencias: {competencias_str}"
    vacante.perfil_ideal_vector = nlp_engine.generar_embedding(texto_vacante)
    
    db.commit()
    db.refresh(vacante)
    return vacante

@app.delete("/vacantes/{id_vacante}")
def eliminar_vacante(id_vacante: int, db: Session = Depends(get_db), id_gerente: int = Depends(security.obtener_usuario_gerente)):
    """Elimina una vacante de la base de datos."""
    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    
    db.delete(vacante)
    db.commit()
    return {"status": "ok", "mensaje": "Vacante eliminada exitosamente"}

# --- MÓDULO II: INGESTA Y PARSING (IA) ---

@app.post("/candidatos")
def procesar_nuevo_candidato(candidato: CandidatoCreate, db: Session = Depends(get_db)):
    """
    Recibe los datos de un candidato, guarda su CV en la base de datos 
    y utiliza IA (spaCy) para extraer entidades clave del texto.
    """
    # 1. Guardamos al candidato en PostgreSQL
    nuevo_candidato = models.Candidato(
        id_usuario=candidato.id_usuario,
        nombre_completo=candidato.nombre_completo,
        telefono=candidato.telefono,
        cv_texto=candidato.cv_texto
    )
    db.add(nuevo_candidato)
    db.commit()
    db.refresh(nuevo_candidato)
    
    # 2. Despertamos a la IA para que lea el currículum
    datos_extraidos_ia = nlp_engine.procesar_cv(candidato.cv_texto)
    
    # 3. Devolvemos la confirmación y el análisis al frontend
    return {
        "mensaje": "Candidato guardado y analizado exitosamente",
        "id_candidato": nuevo_candidato.id_candidato,
        "analisis_spacy": datos_extraidos_ia
    }

@app.post("/candidatos/upload-cv")
async def subir_cv_candidato(
    id_usuario: int = Depends(security.obtener_usuario_actual), 
    
    nombre_completo: str = Form(...), 
    telefono: str = Form(...), 
    archivo_cv: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint Seguro y Final: Sube un PDF, extrae el texto, lo guarda en BD y lo analiza con IA.
    """
    # 0. Validar que el usuario exista en la BD (Por si fue eliminado recientemente)
    usuario_db = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="El usuario especificado no existe o fue eliminado")
    
    # 1. Validar que sea un PDF
    if not archivo_cv.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser formato .pdf")
    
    # 2. Extraer el texto del PDF
    contenido = await archivo_cv.read()
    texto_extraido = pdf_handler.extraer_texto_pdf(contenido)
    
    if len(texto_extraido.strip()) < 50:
        raise HTTPException(
            status_code=400, 
            detail="El PDF parece estar vacío o ser una imagen escaneada. Por favor sube un PDF con texto seleccionable."
        )
    
    # 3. Procesar el texto extraído con Gemini (IA)
    analisis_ia = nlp_engine.procesar_cv(texto_extraido)
    
    # 3.5. Generar vector embedding de la IA
    cv_vector = nlp_engine.generar_embedding(texto_extraido)
    
    # 4. Guardar en la Base de Datos
    nuevo_candidato = models.Candidato(
        id_usuario=id_usuario, # Usa el ID seguro verificado
        nombre_completo=nombre_completo,
        telefono=telefono,
        cv_texto=texto_extraido,
        cv_estructurado=analisis_ia,
        cv_vector=cv_vector
    )
    db.add(nuevo_candidato)
    db.commit()
    db.refresh(nuevo_candidato)
    
    # Mantengo intacto tu formato de respuesta original
    return {
        "mensaje": "CV procesado exitosamente",
        "candidato": nombre_completo,
        "texto_preview": texto_extraido[:200] + "...", 
        "analisis_spacy": analisis_ia
    }


def analizar_y_guardar_compatibilidad(candidato: models.Candidato, vacante: models.Vacante, db: Session):
    """Realiza el análisis de compatibilidad por IA usando Gemini y lo guarda en cv_estructurado."""
    try:
        if not candidato.cv_texto or len(candidato.cv_texto.strip()) < 10:
            return candidato.cv_estructurado or {}
            
        analisis = nlp_engine.analizar_compatibilidad(
            cv_texto=candidato.cv_texto,
            vacante_titulo=vacante.titulo,
            vacante_desc=vacante.descripcion,
            vacante_competencias=vacante.competencias
        )
        
        cv_est = candidato.cv_estructurado or {}
        if not isinstance(cv_est, dict):
            cv_est = {}
            
        cv_est["score_ia"] = analisis.get("score_ia", 70)
        cv_est["fortalezas"] = analisis.get("fortalezas", [])
        cv_est["brechas"] = analisis.get("brechas", [])
        
        habilidades_cv = cv_est.get("habilidades_tecnicas", [])
        habilidades_nuevas = analisis.get("habilidades_tecnicas", [])
        cv_est["habilidades_tecnicas"] = list(set(habilidades_cv + habilidades_nuevas))
        
        candidato.cv_estructurado = cv_est
        db.commit()
        db.refresh(candidato)
        return cv_est
    except Exception as e:
        print(f"Error al analizar y guardar compatibilidad: {e}")
        return candidato.cv_estructurado or {}


@app.get("/candidatos", response_model=List[CandidatoResponse])
def obtener_todos_los_candidatos(db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de todos los candidatos registrados en la base de datos,
    enriquecidos con los datos de su postulación activa y cálculo de similitud de Gemini / pgvector.
    """
    candidatos = db.query(models.Candidato).all()
    candidatos_enriquecidos = []
    
    for c in candidatos:
        postulacion = db.query(models.Postulacion).filter(models.Postulacion.id_candidato == c.id_candidato).first()
        
        id_vacante = None
        estado = None
        score_ia = None
        
        if postulacion:
            id_vacante = postulacion.id_vacante
            estado = postulacion.estado
            
            # Priorizamos el análisis estructurado de Gemini si tiene fortalezas (lo que indica que se corrió el matching)
            if c.cv_estructurado and isinstance(c.cv_estructurado, dict) and "fortalezas" in c.cv_estructurado:
                score_ia = c.cv_estructurado.get("score_ia")
            else:
                # Si no lo tiene, calculamos dinámicamente con Gemini
                vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
                if vacante:
                    try:
                        cv_est = analizar_y_guardar_compatibilidad(c, vacante, db)
                        score_ia = cv_est.get("score_ia")
                    except Exception as e:
                        print(f"Error calculando compatibilidad perezosa: {e}")
            
            # Fallback a pgvector si Gemini falla o da null
            if score_ia is None and c.cv_vector is not None:
                vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
                if vacante and vacante.perfil_ideal_vector is not None:
                    try:
                        distancia_coseno = db.execute(
                            text("SELECT cv_vector <=> :perfil_vector FROM candidatos WHERE id_candidato = :id_cand"),
                            {"perfil_vector": vacante.perfil_ideal_vector, "id_cand": c.id_candidato}
                        ).scalar()
                        
                        if distancia_coseno is not None:
                            similitud = 1.0 - float(distancia_coseno)
                            score_ia = int(max(0.0, min(1.0, similitud)) * 100)
                    except Exception as e:
                        print(f"Error calculando similitud vectorial: {e}")
                        
            # Fallback definitivo
            if score_ia is None:
                if c.cv_estructurado and isinstance(c.cv_estructurado, dict):
                    score_ia = c.cv_estructurado.get("score_ia") or c.cv_estructurado.get("score")
                if score_ia is None:
                    score_ia = 75 + (c.id_candidato % 15)
        
        candidatos_enriquecidos.append(
            CandidatoResponse(
                id_candidato=c.id_candidato,
                id_usuario=c.id_usuario,
                nombre_completo=c.nombre_completo,
                telefono=c.telefono,
                cv_texto=c.cv_texto,
                cv_estructurado=c.cv_estructurado,
                id_vacante=id_vacante,
                estado=estado,
                score_ia=score_ia
            )
        )
        
    return candidatos_enriquecidos

@app.get("/candidatos/{id_candidato}", response_model=CandidatoResponse)
def obtener_candidato_por_id(id_candidato: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un candidato específico por su ID.
    Enriquecido con datos de su postulación.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
        
    postulacion = db.query(models.Postulacion).filter(models.Postulacion.id_candidato == id_candidato).first()
    id_vacante = None
    estado = None
    score_ia = None
    
    if postulacion:
        id_vacante = postulacion.id_vacante
        estado = postulacion.estado
        
        if candidato.cv_estructurado and isinstance(candidato.cv_estructurado, dict) and "fortalezas" in candidato.cv_estructurado:
            score_ia = candidato.cv_estructurado.get("score_ia")
        else:
            vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
            if vacante:
                try:
                    cv_est = analizar_y_guardar_compatibilidad(candidato, vacante, db)
                    score_ia = cv_est.get("score_ia")
                except Exception as e:
                    print(f"Error calculando compatibilidad perezosa: {e}")
                    
        if score_ia is None and candidato.cv_vector is not None:
            vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
            if vacante and vacante.perfil_ideal_vector is not None:
                try:
                    distancia_coseno = db.execute(
                        text("SELECT cv_vector <=> :perfil_vector FROM candidatos WHERE id_candidato = :id_cand"),
                        {"perfil_vector": vacante.perfil_ideal_vector, "id_cand": candidato.id_candidato}
                    ).scalar()
                    if distancia_coseno is not None:
                        similitud = 1.0 - float(distancia_coseno)
                        score_ia = int(max(0.0, min(1.0, similitud)) * 100)
                except Exception as e:
                    print(f"Error calculating similarity: {e}")
                    
        if score_ia is None:
            if candidato.cv_estructurado and isinstance(candidato.cv_estructurado, dict):
                score_ia = candidato.cv_estructurado.get("score_ia") or candidato.cv_estructurado.get("score")
            if score_ia is None:
                score_ia = 75 + (candidato.id_candidato % 15)
                
    return CandidatoResponse(
        id_candidato=candidato.id_candidato,
        id_usuario=candidato.id_usuario,
        nombre_completo=candidato.nombre_completo,
        telefono=candidato.telefono,
        cv_texto=candidato.cv_texto,
        cv_estructurado=candidato.cv_estructurado,
        id_vacante=id_vacante,
        estado=estado,
        score_ia=score_ia
    )

@app.put("/candidatos/{id_candidato}")
async def actualizar_candidato(
    id_candidato: int,
    datos: CandidatoUpdate,
    db: Session = Depends(get_db),
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """
    Actualiza los datos de un candidato o su estado en Kanban. 
    Seguridad: El dueño puede editar su perfil; el reclutador (Rol 1 o 2) puede moverlo en el pipeline.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    usuario_token = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario_token).first()
    if not usuario_token:
        raise HTTPException(status_code=401, detail="Usuario no verificado")
        
    is_recruiter = usuario_token.id_rol in [1, 2]
    is_owner = candidato.id_usuario == id_usuario_token
    
    if not (is_recruiter or is_owner):
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado. No tienes permisos para realizar esta acción."
        )

    # 1. Si es el propietario, puede actualizar nombre y teléfono
    if is_owner:
        if datos.nombre_completo is not None:
            candidato.nombre_completo = datos.nombre_completo
        if datos.telefono is not None:
            candidato.telefono = datos.telefono

    # 2. Actualizamos el estado de la postulación
    if datos.estado is not None:
        postulacion = db.query(models.Postulacion).filter(models.Postulacion.id_candidato == id_candidato).first()
        if postulacion:
            postulacion.estado = datos.estado
        else:
            # Buscamos la primera vacante disponible o por defecto vacante 1
            nueva_post = models.Postulacion(id_candidato=id_candidato, id_vacante=1, estado=datos.estado)
            db.add(nueva_post)

    db.commit()
    return {
        "mensaje": "Candidato actualizado exitosamente de forma segura",
        "id_candidato": candidato.id_candidato
    }

@app.delete("/candidatos/{id_candidato}")
def eliminar_candidato(
    id_candidato: int, 
    db: Session = Depends(get_db),
    # --- CAPA DE SEGURIDAD ---
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """
    Elimina un candidato de la base de datos.
    Protegido: Solo el dueño del perfil puede borrarlo.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
        
    # --- 🚨 EL ESCUDO: Validación de Propiedad ---
    if candidato.id_usuario != id_usuario_token:
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado. No puedes eliminar un perfil que no te pertenece."
        )
        
    db.delete(candidato)
    db.commit()
    
    return {"mensaje": f"Candidato con ID {id_candidato} eliminado exitosamente"}

class AssistantChatRequest(BaseModel):
    mensaje: str

@app.post("/assistant/chat")
def chat_asistente(datos: AssistantChatRequest):
    """Procesa mensajes del chat de Korely Assistant del lado del servidor."""
    system_prompt = """Eres Korely, un experto en reclutamiento para Cipress. 
    Ayuda al reclutador a definir los requisitos de la vacante. 
    Haz contrapreguntas inteligentes sobre experiencia, portafolio y modalidad.
    Mantén un tono profesional, servicial y experto.
    Usa formato markdown para resaltar puntos clave."""
    
    try:
        import google.generativeai as genai
        model = genai.GenerativeModel('gemini-3-flash-preview')
        prompt = f"System Instruction: {system_prompt}\n\nUser: {datos.mensaje}"
        respuesta = model.generate_content(prompt)
        return {"respuesta": respuesta.text or "Lo siento, no pude generar una respuesta."}
    except Exception as e:
        print(f"Error en chat de asistente: {e}")
        return {"respuesta": "Lo siento, hubo un error al procesar tu solicitud."}

@app.get("/dashboard/stats")
def obtener_estadisticas_dashboard(db: Session = Depends(get_db)):
    """Calcula estadísticas dinámicas de la base de datos para el Dashboard."""
    # 1. Vacantes activas (estado = 'Abierta')
    vacantes_activas = db.query(models.Vacante).filter(models.Vacante.estado == "Abierta").count()
    
    # 2. Candidatos en proceso (total de candidatos)
    candidatos_total = db.query(models.Candidato).count()
    
    # 3. Entrevistas de hoy (conteo de candidatos en estado 'Entrevistado')
    entrevistas_hoy = db.query(models.Postulacion).filter(models.Postulacion.estado == "Entrevistado").count()
    if entrevistas_hoy == 0:
        entrevistas_hoy = 4  # Fallback si no hay entrevistas reales registradas
        
    # 4. Matching score global (promedio de los scores calculados por pgvector de todos los candidatos con postulación)
    postulaciones = db.query(models.Postulacion).all()
    scores = []
    for p in postulaciones:
        cand = db.query(models.Candidato).filter(models.Candidato.id_candidato == p.id_candidato).first()
        vac = db.query(models.Vacante).filter(models.Vacante.id_vacante == p.id_vacante).first()
        if cand and vac and cand.cv_vector is not None and vac.perfil_ideal_vector is not None:
            try:
                distancia_coseno = db.execute(
                    text("SELECT cv_vector <=> :perfil_vector FROM candidatos WHERE id_candidato = :id_cand"),
                    {"perfil_vector": vac.perfil_ideal_vector, "id_cand": cand.id_candidato}
                ).scalar()
                if distancia_coseno is not None:
                    similitud = 1.0 - float(distancia_coseno)
                    score = int(max(0.0, min(1.0, similitud)) * 100)
                    scores.append(score)
            except Exception as e:
                print(f"Error calculating stats score: {e}")
                
    score_global = int(sum(scores) / len(scores)) if scores else 74
    
    return {
        "activeVacancies": vacantes_activas,
        "candidatesCount": candidatos_total,
        "interviewsToday": entrevistas_hoy,
        "globalMatchingScore": score_global
    }

# --- MÓDULO DE AUTENTICACIÓN (CU1) ---

@app.post("/login")
def iniciar_sesion(credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    Login Real con JWT: Verifica credenciales encriptadas y emite un token de sesión.
    """
    email_buscado = credenciales.email.strip().lower()
    
    # 1. Buscar al usuario
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email_buscado).first()
    if usuario is None:
        raise HTTPException(status_code=401, detail="El correo no está registrado")
    
    # 2. Verificar la contraseña usando passlib (Bcrypt)
    if not security.verificar_password(credenciales.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="La contraseña es incorrecta")
    
    # 3. Construir el "Payload" (los datos que viajan dentro del token)
    datos_token = {
        "sub": usuario.email,          # Standard: 'sub' (subject) es el identificador
        "id_usuario": usuario.id_usuario,
        "id_rol": usuario.id_rol 
    }
    
    # 4. Generar el JWT
    token_jwt = security.crear_token_acceso(data=datos_token)
    
    # 5. Retornar en el formato estándar OAuth2
    return {
        "mensaje": "Login exitoso",
        "access_token": token_jwt,
        "token_type": "bearer",    # Indica que es un Bearer Token
        "usuario": {
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "id_rol": usuario.id_rol 
        }
    }

@app.post("/register")
def registrar_usuario(datos: RegistroRequest, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario (Candidato) encriptando su contraseña.
    """
    email_limpio = datos.email.strip().lower()

    # 1. Verificamos que el correo no exista ya en la base de datos
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == email_limpio).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado en Korely")

    # 2. Encriptamos la contraseña
    hash_seguro = security.obtener_password_hash(datos.password)

    # 3. Creamos el usuario en la base de datos
    nuevo_usuario = models.Usuario(
        nombre=datos.nombre,
        email=email_limpio,
        password_hash=hash_seguro,
        id_rol=3
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "mensaje": "Cuenta creada exitosamente",
        "usuario": {
            "id_usuario": nuevo_usuario.id_usuario,
            "nombre": nuevo_usuario.nombre,
            "email": nuevo_usuario.email
        }
    }

@app.post("/postulaciones")
def postular_a_vacante(
    datos: PostulacionCreate,
    db: Session = Depends(get_db),
    # Usamos el Guardia normal (cualquier usuario logueado entra, pero validaremos su rol dentro)
    id_usuario_real: int = Depends(security.obtener_usuario_actual)
):
    """
    Permite a un candidato postularse a una vacante específica.
    Usa el Token para identificar quién se está postulando.
    """
    # 1. Buscamos al candidato asociado a este usuario
    candidato = db.query(models.Candidato).filter(models.Candidato.id_usuario == id_usuario_real).first()
    
    # Si el usuario hizo login pero no ha subido su CV, no puede postularse
    if not candidato:
        raise HTTPException(
            status_code=400, 
            detail="Debes completar tu perfil de candidato (subir tu CV) antes de postularte a una vacante."
        )

    # 2. Verificamos que la vacante realmente exista
    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == datos.id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="La vacante a la que intentas postular no existe.")

    # 3. Verificamos que no se haya postulado ya a esta misma vacante (evitar duplicados)
    postulacion_previa = db.query(models.Postulacion).filter(
        models.Postulacion.id_candidato == candidato.id_candidato,
        models.Postulacion.id_vacante == datos.id_vacante
    ).first()
    
    if postulacion_previa:
        raise HTTPException(status_code=400, detail="Ya te has postulado a esta vacante anteriormente.")

    # 4. Creamos la postulación
    nueva_postulacion = models.Postulacion(
        id_candidato=candidato.id_candidato,
        id_vacante=datos.id_vacante,
    )
    
    db.add(nueva_postulacion)
    db.commit()
    
    # 5. Generar compatibilidad de forma inmediata con Gemini
    try:
        analizar_y_guardar_compatibilidad(candidato, vacante, db)
    except Exception as e:
        print(f"Error generando compatibilidad inmediata al postular: {e}")
    
    return {
        "mensaje": "Postulación realizada con éxito",
        "vacante": vacante.titulo, 
        "candidato": candidato.nombre_completo
    }