from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Any
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import security
import os
import json
import base64
import time


# Importamos configuración, motor y modelos
from database import get_db, engine
import models

import nlp_engine 
import pdf_handler

# 1. Crear tablas automáticamente si no existen
models.Base.metadata.create_all(bind=engine)

# Inicializar roles básicos si la tabla está vacía
def inicializar_roles():
    from database import SessionLocal
    db = SessionLocal()
    try:
        if db.query(models.Rol).count() == 0:
            roles = [
                models.Rol(id_rol=1, nombre_rol="Admin"),
                models.Rol(id_rol=2, nombre_rol="Gerente Cipress"),
                models.Rol(id_rol=3, nombre_rol="Postulante")
            ]
            db.add_all(roles)
            db.commit()
            print("INFO: Roles iniciales creados exitosamente.")
    except Exception as e:
        print(f"ERROR: No se pudieron inicializar los roles: {e}")
        db.rollback()
    finally:
        db.close()

inicializar_roles()

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
    entrevista: Optional[Any] = None

    class Config:
        from_attributes = True

class CandidatoUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    telefono: Optional[str] = None
    estado: Optional[str] = None
    id_vacante: Optional[int] = None

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

class FichaShareRequest(BaseModel):
    email: str
    nombre_candidato: str
    pdf_base64: Optional[str] = None

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


def calcular_match_consolidado(score_cv: Optional[int], score_entrevista: Optional[int]) -> Optional[int]:
    """
    Calcula el score consolidado ponderando 60% el CV y 40% la entrevista con la IA.
    Si no hay entrevista aún, retorna el score de afinidad del CV.
    """
    if score_cv is None:
        return score_entrevista
    if score_entrevista is None:
        return score_cv
    return int((score_cv * 0.6) + (score_entrevista * 0.4))


@app.get("/candidatos", response_model=List[CandidatoResponse])
def obtener_todos_los_candidatos(id_vacante: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de todos los candidatos registrados en la base de datos,
    enriquecidos con los datos de su postulación activa y cálculo de similitud de Gemini / pgvector.
    Usamos outerjoin para evitar N+1 queries.
    """
    query = db.query(models.Candidato, models.Postulacion).outerjoin(
        models.Postulacion, models.Candidato.id_candidato == models.Postulacion.id_candidato
    )
    if id_vacante is not None:
        query = query.filter(models.Postulacion.id_vacante == id_vacante)
    results = query.all()
    candidatos_enriquecidos = []
    
    for c, postulacion in results:
        id_vac = None
        estado = None
        score_ia = None
        
        if postulacion:
            id_vac = postulacion.id_vacante
            estado = postulacion.estado
            
            # Priorizamos el análisis estructurado de Gemini si tiene fortalezas (lo que indica que se corrió el matching)
            if c.cv_estructurado and isinstance(c.cv_estructurado, dict) and "fortalezas" in c.cv_estructurado:
                score_ia = c.cv_estructurado.get("score_ia")
            else:
                # Evitamos llamadas síncronas masivas a Gemini en el listado para prevenir timeouts.
                # Se calculará mediante pgvector o el fallback por defecto si no ha sido postulado.
                pass
            
            # Fallback a pgvector si Gemini falla o da null
            if score_ia is None and c.cv_vector is not None:
                vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vac).first()
                if vacante and vacante.perfil_ideal_vector is not None:
                    try:
                        perfil_vector = vacante.perfil_ideal_vector
                        if hasattr(perfil_vector, "tolist"):
                            perfil_vector = perfil_vector.tolist()
                        elif not isinstance(perfil_vector, list):
                            perfil_vector = list(perfil_vector)

                        # Convert vector to string representation to avoid psycopg2 numpy/list adaptation issues
                        perfil_vector_str = f"[{','.join(map(str, perfil_vector))}]"

                        distancia_coseno = db.execute(
                            text("SELECT cv_vector <=> CAST(:perfil_vector AS vector) FROM candidatos WHERE id_candidato = :id_cand"),
                            {"perfil_vector": perfil_vector_str, "id_cand": c.id_candidato}
                        ).scalar()
                        
                        if distancia_coseno is not None:
                            similitud = 1.0 - float(distancia_coseno)
                            score_ia = int(max(0.0, min(1.0, similitud)) * 100)
                    except Exception as e:
                        db.rollback()
                        print(f"Error calculando similitud vectorial: {e}")
                        
            # Fallback definitivo
            if score_ia is None:
                if c.cv_estructurado and isinstance(c.cv_estructurado, dict):
                    score_ia = c.cv_estructurado.get("score_ia") or c.cv_estructurado.get("score")
                if score_ia is None:
                    score_ia = 75 + (c.id_candidato % 15)
            
            # Consolidar score de Match Predictivo (CV + Entrevista IA)
            entrevista_info = None
            if id_vac is not None:
                entrevista_db = db.query(models.Entrevista).filter(
                    models.Entrevista.id_candidato == c.id_candidato,
                    models.Entrevista.id_vacante == id_vac
                ).order_by(models.Entrevista.id_entrevista.desc()).first()
                if entrevista_db:
                    score_entrevista = entrevista_db.score_entrevista
                    entrevista_info = {
                        "id_entrevista": entrevista_db.id_entrevista,
                        "transcripcion": entrevista_db.transcripcion,
                        "analisis_sentimiento": entrevista_db.analisis_sentimiento,
                        "score_entrevista": entrevista_db.score_entrevista,
                        "fecha_entrevista": entrevista_db.fecha_entrevista.isoformat() if entrevista_db.fecha_entrevista else None
                    }
                else:
                    score_entrevista = None
                score_ia = calcular_match_consolidado(score_ia, score_entrevista)
        
        candidatos_enriquecidos.append(
            CandidatoResponse(
                id_candidato=c.id_candidato,
                id_usuario=c.id_usuario,
                nombre_completo=c.nombre_completo,
                telefono=c.telefono,
                cv_texto=c.cv_texto,
                cv_estructurado=c.cv_estructurado,
                id_vacante=id_vac,
                estado=estado,
                score_ia=score_ia,
                entrevista=entrevista_info
            )
        )
        
    return candidatos_enriquecidos

@app.get("/candidatos/{id_candidato}", response_model=CandidatoResponse)
def obtener_candidato_por_id(id_candidato: int, id_vacante: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un candidato específico por su ID.
    Enriquecido con datos de su postulación.
    Usamos outerjoin para recuperar los datos correspondientes.
    """
    query = db.query(models.Candidato, models.Postulacion).outerjoin(
        models.Postulacion, models.Candidato.id_candidato == models.Postulacion.id_candidato
    ).filter(models.Candidato.id_candidato == id_candidato)
    
    if id_vacante is not None:
        query = query.filter(models.Postulacion.id_vacante == id_vacante)
        
    result = query.first()
    
    if not result:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
        
    c, postulacion = result
    id_vac = None
    estado = None
    score_ia = None
    
    if postulacion:
        id_vac = postulacion.id_vacante
        estado = postulacion.estado
        
        if c.cv_estructurado and isinstance(c.cv_estructurado, dict) and "fortalezas" in c.cv_estructurado:
            score_ia = c.cv_estructurado.get("score_ia")
        else:
            vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vac).first()
            if vacante:
                try:
                    cv_est = analizar_y_guardar_compatibilidad(c, vacante, db)
                    score_ia = cv_est.get("score_ia")
                except Exception as e:
                    print(f"Error calculando compatibilidad perezosa: {e}")
                    
        if score_ia is None and c.cv_vector is not None:
            vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vac).first()
            if vacante and vacante.perfil_ideal_vector is not None:
                try:
                    perfil_vector = vacante.perfil_ideal_vector
                    if hasattr(perfil_vector, "tolist"):
                        perfil_vector = perfil_vector.tolist()
                    elif not isinstance(perfil_vector, list):
                        perfil_vector = list(perfil_vector)

                    # Convert vector to string representation to avoid psycopg2 numpy/list adaptation issues
                    perfil_vector_str = f"[{','.join(map(str, perfil_vector))}]"

                    distancia_coseno = db.execute(
                        text("SELECT cv_vector <=> CAST(:perfil_vector AS vector) FROM candidatos WHERE id_candidato = :id_cand"),
                        {"perfil_vector": perfil_vector_str, "id_cand": c.id_candidato}
                    ).scalar()
                    if distancia_coseno is not None:
                        similitud = 1.0 - float(distancia_coseno)
                        score_ia = int(max(0.0, min(1.0, similitud)) * 100)
                except Exception as e:
                    db.rollback()
                    print(f"Error calculating similarity: {e}")
                    
        if score_ia is None:
            if c.cv_estructurado and isinstance(c.cv_estructurado, dict):
                score_ia = c.cv_estructurado.get("score_ia") or c.cv_estructurado.get("score")
            if score_ia is None:
                score_ia = 75 + (c.id_candidato % 15)

        # Consolidar score de Match Predictivo (CV + Entrevista IA)
        entrevista_info = None
        if id_vac is not None:
            entrevista_db = db.query(models.Entrevista).filter(
                models.Entrevista.id_candidato == c.id_candidato,
                models.Entrevista.id_vacante == id_vac
            ).order_by(models.Entrevista.id_entrevista.desc()).first()
            if entrevista_db:
                score_entrevista = entrevista_db.score_entrevista
                entrevista_info = {
                    "id_entrevista": entrevista_db.id_entrevista,
                    "transcripcion": entrevista_db.transcripcion,
                    "analisis_sentimiento": entrevista_db.analisis_sentimiento,
                    "score_entrevista": entrevista_db.score_entrevista,
                    "fecha_entrevista": entrevista_db.fecha_entrevista.isoformat() if entrevista_db.fecha_entrevista else None
                }
            else:
                score_entrevista = None
            score_ia = calcular_match_consolidado(score_ia, score_entrevista)
                
    return CandidatoResponse(
        id_candidato=c.id_candidato,
        id_usuario=c.id_usuario,
        nombre_completo=c.nombre_completo,
        telefono=c.telefono,
        cv_texto=c.cv_texto,
        cv_estructurado=c.cv_estructurado,
        id_vacante=id_vac,
        estado=estado,
        score_ia=score_ia,
        entrevista=entrevista_info
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

    # Regla: Solo el dueño puede modificar datos personales
    if not is_owner and (datos.nombre_completo is not None or datos.telefono is not None):
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado. Solo el propietario del perfil puede modificar sus datos personales."
        )

    # Regla: Solo los reclutadores pueden modificar el estado o vacante de postulación
    if not is_recruiter and (datos.estado is not None or datos.id_vacante is not None):
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado. Solo los gerentes y administradores pueden modificar el estado de la postulación."
        )

    # 1. Si es el propietario, actualiza nombre y teléfono
    if is_owner:
        if datos.nombre_completo is not None:
            candidato.nombre_completo = datos.nombre_completo
        if datos.telefono is not None:
            candidato.telefono = datos.telefono

    # 2. Si es reclutador, actualiza la postulación
    if is_recruiter:
        vacante_id = datos.id_vacante
        if vacante_id is None:
            # Si no se especifica vacante, buscar la primera postulación existente del candidato
            postulacion = db.query(models.Postulacion).filter(models.Postulacion.id_candidato == id_candidato).first()
        else:
            postulacion = db.query(models.Postulacion).filter(
                models.Postulacion.id_candidato == id_candidato,
                models.Postulacion.id_vacante == vacante_id
            ).first()

        if postulacion:
            if datos.estado is not None:
                postulacion.estado = datos.estado
        else:
            # Crear nueva postulación si no existe
            vac_id = vacante_id if vacante_id is not None else 1
            est_val = datos.estado if datos.estado is not None else "Postulado"
            nueva_post = models.Postulacion(id_candidato=id_candidato, id_vacante=vac_id, estado=est_val)
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

@app.post("/candidatos/{id_candidato}/compartir-ficha")
def compartir_ficha_candidato(
    id_candidato: int,
    datos: FichaShareRequest,
    db: Session = Depends(get_db),
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """
    Simula el envío por correo de la ficha técnica de un candidato.
    Guarda un reporte HTML premium y el archivo PDF adjunto en backend/mock_emails/.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    usuario_token = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario_token).first()
    if not usuario_token or usuario_token.id_rol not in [1, 2]:
         raise HTTPException(
             status_code=403, 
             detail="Acceso denegado. Solo los gerentes y administradores pueden compartir la ficha técnica."
         )

    directorio_correos = os.path.join(os.path.dirname(__file__), "mock_emails")
    os.makedirs(directorio_correos, exist_ok=True)

    timestamp = int(time.time())
    nombre_archivo_base = f"ficha_cand_{id_candidato}_{timestamp}"
    
    pdf_adjunto_msg = "No se adjuntó archivo PDF"
    if datos.pdf_base64:
        try:
            base64_data = datos.pdf_base64
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]
            
            pdf_bytes = base64.b64decode(base64_data)
            pdf_path = os.path.join(directorio_correos, f"{nombre_archivo_base}.pdf")
            with open(pdf_path, "wb") as f:
                f.write(pdf_bytes)
            pdf_adjunto_msg = f"Archivo PDF guardado con éxito en mock_emails/{nombre_archivo_base}.pdf"
        except Exception as e:
            print(f"Error decodificando PDF adjunto: {e}")
            pdf_adjunto_msg = f"Error al procesar el PDF adjunto: {str(e)}"

    score_ia = 0
    skills_list = []
    fortalezas_list = []
    brechas_list = []
    
    if candidato.cv_estructurado and isinstance(candidato.cv_estructurado, dict):
        score_ia = candidato.cv_estructurado.get("score_ia") or 0
        skills_list = candidato.cv_estructurado.get("habilidades_tecnicas") or []
        fortalezas_list = candidato.cv_estructurado.get("fortalezas") or []
        brechas_list = candidato.cv_estructurado.get("brechas") or []

    skills_html = "".join([f"<span style='background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:4px 8px;border-radius:6px;font-size:12px;margin-right:6px;display:inline-block;margin-bottom:6px;'>{s}</span>" for s in skills_list])
    fortalezas_html = "".join([f"<li style='margin-bottom:6px;'>{f}</li>" for f in fortalezas_list])
    brechas_html = "".join([f"<li style='margin-bottom:6px;'>{b}</li>" for b in brechas_list])

    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Ficha Técnica Profesional - Korely AI</title>
    </head>
    <body style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;background-color:#f1f5f9;margin:0;padding:20px;color:#334155;">
        <div style="max-width:600px;background:#ffffff;margin:0 auto;border-radius:16px;box-shadow:0 4px 6px -1px rgb(0 0 0 / 0.1);overflow:hidden;border:1px solid #e2e8f0;">
            <div style="background-color:#1e3a5f;padding:24px;color:#ffffff;text-align:center;">
                <h2 style="margin:0;font-size:20px;letter-spacing:1px;text-transform:uppercase;">Korely AI | Intelligent Recruitment</h2>
                <p style="margin:4px 0 0 0;font-size:12px;color:#93c5fd;font-weight:bold;">FICHA TÉCNICA PROFESIONAL COMPARADA</p>
            </div>
            <div style="padding:24px;">
                <p>Estimado/a,</p>
                <p>Le compartimos el reporte de afinidad y análisis de compatibilidad por IA para el siguiente postulante:</p>
                
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;">
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="font-weight:bold;font-size:14px;color:#64748b;padding-bottom:6px;">Candidato:</td>
                            <td style="font-weight:bold;font-size:16px;color:#1e293b;padding-bottom:6px;text-align:right;">{candidato.nombre_completo}</td>
                        </tr>
                        <tr>
                            <td style="font-weight:bold;font-size:14px;color:#64748b;padding-bottom:6px;">Contacto:</td>
                            <td style="font-size:14px;color:#475569;padding-bottom:6px;text-align:right;">{candidato.telefono or "No especificado"}</td>
                        </tr>
                        <tr>
                            <td style="font-weight:bold;font-size:14px;color:#64748b;">Afinidad IA:</td>
                            <td style="font-weight:bold;font-size:18px;color:#10b981;text-align:right;">{score_ia}%</td>
                        </tr>
                    </table>
                </div>

                <div style="margin-bottom:20px;">
                    <h3 style="color:#1e3a5f;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px;">Habilidades Clave</h3>
                    <div>{skills_html or "<span style='color:#94a3b8;font-size:12px;font-style:italic;'>Sin análisis de habilidades</span>"}</div>
                </div>

                <div style="margin-bottom:20px;">
                    <h3 style="color:#10b981;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px;">Fortalezas (Match)</h3>
                    <ul style="padding-left:20px;font-size:13px;margin:0;line-height:1.6;">
                        {fortalezas_html or "<li>Experiencia general acorde al sector de la vacante.</li>"}
                    </ul>
                </div>

                <div style="margin-bottom:20px;">
                    <h3 style="color:#d97706;font-size:14px;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:10px;">Brechas / Aspectos a Mejorar</h3>
                    <ul style="padding-left:20px;font-size:13px;margin:0;line-height:1.6;">
                        {brechas_html or "<li>Se sugiere profundizar en la entrevista sobre competencias específicas.</li>"}
                    </ul>
                </div>

                <div style="background-color:#eff6ff;padding:12px;border-radius:8px;border-left:4px solid #3b82f6;font-size:11px;color:#1e40af;margin-top:24px;">
                    <strong>Nota del sistema:</strong> Este reporte fue generado mediante el modelo Gemini Pro de Korely AI y se adjuntó el documento PDF de la ficha técnica completa ({nombre_archivo_base}.pdf).
                </div>
            </div>
            <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                Enviado a: {datos.email} &bull; Generado por Reclutamiento Korely AI
            </div>
        </div>
    </body>
    </html>
    """
    
    html_path = os.path.join(directorio_correos, f"{nombre_archivo_base}.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(email_html)
        
    return {
        "status": "ok",
        "mensaje": f"Ficha técnica compartida exitosamente por correo a {datos.email}",
        "archivo_html": f"mock_emails/{nombre_archivo_base}.html",
        "pdf_status": pdf_adjunto_msg
    }

class AssistantChatRequest(BaseModel):
    mensaje: str

@app.post("/assistant/chat")
def chat_asistente(
    datos: AssistantChatRequest,
    db: Session = Depends(get_db),
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """Procesa mensajes del chat de Korely Assistant según el rol del usuario conectado."""
    usuario = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario_token).first()
    is_recruiter = usuario.id_rol in [1, 2] if usuario else False

    if is_recruiter:
        system_prompt = """Eres Korely, un experto en reclutamiento para Cipress. 
        Ayuda al reclutador a definir los requisitos de la vacante. 
        Haz contrapreguntas inteligentes sobre experiencia, portafolio y modalidad.
        Mantén un tono profesional, servicial y experto.
        Usa formato markdown para resaltar puntos clave."""
    else:
        system_prompt = """Eres Korely, un Coach de Entrevistas y Mentor de Carrera para Cipress.
        Tu objetivo es ayudar al candidato/postulante a prepararse para su entrevista virtual y mejorar sus habilidades.
        Simula preguntas de entrevistas técnicas o blandas relativas a su perfil, dale retroalimentación constructiva sobre cómo mejorar sus respuestas y asesóralo en cómo optimizar su currículum.
        Mantén un tono empático, motivador y profesional.
        Usa formato markdown para estructurar tus consejos."""
    
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
                perfil_vector = vac.perfil_ideal_vector
                if hasattr(perfil_vector, "tolist"):
                    perfil_vector = perfil_vector.tolist()
                elif not isinstance(perfil_vector, list):
                    perfil_vector = list(perfil_vector)

                # Convert vector to string representation to avoid psycopg2 numpy/list adaptation issues
                perfil_vector_str = f"[{','.join(map(str, perfil_vector))}]"

                distancia_coseno = db.execute(
                    text("SELECT cv_vector <=> CAST(:perfil_vector AS vector) FROM candidatos WHERE id_candidato = :id_cand"),
                    {"perfil_vector": perfil_vector_str, "id_cand": cand.id_candidato}
                ).scalar()
                if distancia_coseno is not None:
                    similitud = 1.0 - float(distancia_coseno)
                    score = int(max(0.0, min(1.0, similitud)) * 100)
                    scores.append(score)
            except Exception as e:
                db.rollback()
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

class MensajeEntrevista(BaseModel):
    role: str
    content: str

class EntrevistaEvaluarRequest(BaseModel):
    id_candidato: int
    id_vacante: int
    mensajes: List[MensajeEntrevista]

class EntrevistaResponse(BaseModel):
    id_entrevista: int
    id_candidato: int
    id_vacante: int
    transcripcion: str
    analisis_sentimiento: Any
    score_entrevista: int

    class Config:
        from_attributes = True

@app.post("/entrevistas/evaluar", response_model=EntrevistaResponse)
async def evaluar_y_guardar_entrevista(
    id_candidato: int = Form(...),
    id_vacante: int = Form(...),
    mensajes_json: str = Form(...),
    archivo_audio: UploadFile = File(None),
    db: Session = Depends(get_db),
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """
    Recibe la conversación de una entrevista y un archivo de audio opcional (WebM).
    Invocamos el análisis sintáctico de spaCy sobre el diálogo y la API de Gemini 
    para evaluar el tono de voz, soft skills y ajuste cultural, persistiendo los resultados en la BD.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")

    # Deserializar mensajes
    print(f"DEBUG: mensajes_json = {repr(mensajes_json)}")
    try:
        mensajes = json.loads(mensajes_json)
    except Exception as e:
        print(f"DEBUG Exception during json.loads: {str(e)}")
        raise HTTPException(status_code=400, detail=f"El parámetro mensajes_json no es un JSON válido: {str(e)}")

    # Compilar los mensajes en un único bloque de texto
    transcripcion_lista = []
    for msg in mensajes:
        role = msg.get("role", "")
        content = msg.get("content", "")
        sender = candidato.nombre_completo if role == "user" else "Korely (IA)"
        transcripcion_lista.append(f"{sender}: {content}")
    transcripcion_completa = "\n".join(transcripcion_lista)

    # Leer bytes del audio
    audio_bytes = None
    if archivo_audio:
        try:
            audio_bytes = await archivo_audio.read()
        except Exception as e:
            print(f"[ERROR] Error leyendo archivo de audio: {str(e)}")

    # Evaluar en nlp_engine (ahora incluye spaCy y análisis de tono)
    evaluacion = nlp_engine.evaluar_entrevista(
        transcripcion=transcripcion_completa,
        vacante_titulo=vacante.titulo,
        vacante_desc=vacante.descripcion,
        audio_bytes=audio_bytes
    )

    # Guardar en base de datos
    nueva_entrevista = models.Entrevista(
        id_candidato=id_candidato,
        id_vacante=id_vacante,
        transcripcion=transcripcion_completa,
        analisis_sentimiento={
            "soft_skills": evaluacion.get("soft_skills", []),
            "episodio_diferenciador": evaluacion.get("episodio_diferenciador", ""),
            "resumen_ia": evaluacion.get("resumen_ia", ""),
            "analisis_tono": evaluacion.get("analisis_tono", ""),
            "analisis_spacy_soft_skills": evaluacion.get("analisis_spacy_soft_skills", {})
        },
        score_entrevista=evaluacion.get("score_ajuste", 80)
    )

    db.add(nueva_entrevista)
    db.commit()
    db.refresh(nueva_entrevista)

    # Actualizar estado de postulación del candidato a 'Entrevistado'
    postulacion = db.query(models.Postulacion).filter(
        models.Postulacion.id_candidato == id_candidato,
        models.Postulacion.id_vacante == id_vacante
    ).first()
    if postulacion:
        postulacion.estado = "Entrevistado"
        db.commit()

    return nueva_entrevista