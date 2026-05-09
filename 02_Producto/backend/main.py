from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Any
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


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

# --- BLOQUE DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Permite que Next.js se conecte
    allow_credentials=True,
    allow_methods=["*"], # Permite GET, POST, PUT, DELETE
    allow_headers=["*"],
)
# -------------------------------------

# --- 3. ESQUEMAS (Pydantic) ---
class VacanteCreate(BaseModel):
    titulo: str
    descripcion: str
    id_gerente_creador: Optional[int] = None 

class VacanteResponse(BaseModel):
    id_vacante: int  
    titulo: Optional[str]
    descripcion: Optional[str]
    estado: Optional[str]

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

    class Config:
        from_attributes = True

# --- ESQUEMAS DE LOGIN ---
class LoginRequest(BaseModel):
    email: str
    password: str

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

@app.get("/vacantes", response_model=List[VacanteResponse])
def obtener_vacantes(db: Session = Depends(get_db)):
    """Obtiene todas las vacantes de la base de datos."""
    vacantes = db.query(models.Vacante).all()
    return vacantes

@app.post("/vacantes", response_model=VacanteResponse)
def crear_vacante(vacante: VacanteCreate, db: Session = Depends(get_db)):
    """Crea una nueva vacante."""
    nueva_vacante = models.Vacante(
        titulo=vacante.titulo, 
        descripcion=vacante.descripcion,
        id_gerente_creador=vacante.id_gerente_creador,
        estado="Abierta"
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
def actualizar_vacante(id_vacante: int, vacante_actualizada: VacanteCreate, db: Session = Depends(get_db)):
    """Actualiza los datos de una vacante existente."""
    vacante = db.query(models.Vacante).filter(models.Vacante.id_vacante == id_vacante).first()
    if not vacante:
        raise HTTPException(status_code=404, detail="Vacante no encontrada")
    
    # Actualizamos los campos
    vacante.titulo = vacante_actualizada.titulo
    vacante.descripcion = vacante_actualizada.descripcion
    vacante.id_gerente_creador = vacante_actualizada.id_gerente_creador
    
    db.commit()
    db.refresh(vacante)
    return vacante

@app.delete("/vacantes/{id_vacante}")
def eliminar_vacante(id_vacante: int, db: Session = Depends(get_db)):
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
    id_usuario: int = Form(...), 
    nombre_completo: str = Form(...), 
    telefono: str = Form(...), 
    archivo_cv: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint final: Sube un PDF, extrae el texto, lo guarda en BD y lo analiza con IA.
    """
    # Validar que el usuario exista
    usuario_db = db.query(models.Usuario).filter(models.Usuario.id_usuario == id_usuario).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="El usuario especificado no existe")
    
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
    
    # 4. Guardar en la Base de Datos
    nuevo_candidato = models.Candidato(
        id_usuario=id_usuario,
        nombre_completo=nombre_completo,
        telefono=telefono,
        cv_texto=texto_extraido,
        cv_estructurado=analisis_ia
    )
    db.add(nuevo_candidato)
    db.commit()
    db.refresh(nuevo_candidato)
    
    
    
    return {
        "mensaje": "CV procesado exitosamente",
        "candidato": nombre_completo,
        "texto_preview": texto_extraido[:200] + "...", # Muestra los primeros 200 caracteres para comprobar
        "analisis_spacy": analisis_ia
    }


@app.get("/candidatos", response_model=List[CandidatoResponse])
def obtener_todos_los_candidatos(db: Session = Depends(get_db)):
    """
    Obtiene la lista completa de todos los candidatos registrados en la base de datos.
    Ideal para que el Frontend construya una tabla o lista visual.
    """
    candidatos = db.query(models.Candidato).all()
    return candidatos

@app.get("/candidatos/{id_candidato}", response_model=CandidatoResponse)
def obtener_candidato_por_id(id_candidato: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un candidato específico por su ID.
    Ideal para la vista de 'Perfil del Candidato'.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    return candidato

@app.put("/candidatos/{id_candidato}")
async def actualizar_candidato(
    id_candidato: int,
    nombre_completo: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    archivo_cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Actualiza los datos de un candidato. 
    Si se envía un nuevo PDF, se procesa nuevamente con Gemini y se actualiza el texto.
    """
    # 1. Buscamos al candidato
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    # 2. Actualizamos solo los datos que el usuario haya enviado
    if nombre_completo:
        candidato.nombre_completo = nombre_completo
    if telefono:
        candidato.telefono = telefono

    analisis_ia = None
    
    # 3. Si mandó un nuevo CV, extraemos el texto y despertamos a Gemini
    if archivo_cv:
        if not archivo_cv.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="El archivo debe ser formato .pdf")
        
        contenido = await archivo_cv.read()
        texto_extraido = pdf_handler.extraer_texto_pdf(contenido)
        candidato.cv_texto = texto_extraido # Actualizamos el texto en la BD
        
        # Procesamos con IA
        analisis_ia = nlp_engine.procesar_cv(texto_extraido)

        cv_estructurado=analisis_ia

    # 4. Guardamos los cambios
    db.commit()
    db.refresh(candidato)

    respuesta = {
        "mensaje": "Candidato actualizado exitosamente",
        "candidato_id": candidato.id_candidato
    }
    
    if analisis_ia:
        respuesta["nuevo_analisis_ia"] = analisis_ia
        
    return respuesta


@app.delete("/candidatos/{id_candidato}")
def eliminar_candidato(id_candidato: int, db: Session = Depends(get_db)):
    """
    Elimina un candidato de la base de datos por su ID.
    """
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
        
    db.delete(candidato)
    db.commit()
    
    return {"mensaje": f"Candidato con ID {id_candidato} eliminado exitosamente"}


# --- MÓDULO DE AUTENTICACIÓN (CU1) ---

@app.post("/login")
def iniciar_sesion(credenciales: LoginRequest, db: Session = Depends(get_db)):
    """
    Endpoint para validar credenciales de un usuario basado en los modelos reales.
    """
    # 1. Buscamos al usuario en la base de datos por su email (exactamente como está en tu BD)
    usuario = db.query(models.Usuario).filter(models.Usuario.email == credenciales.email).first()
    
    # 2. Verificamos si existe y si la contraseña coincide 
    # (Comparamos con 'password_hash' que es como lo definiste en tu modelo)
    if not usuario or usuario.password_hash != credenciales.password:
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    # 3. Si todo está correcto, enviamos los datos usando 'nombre' en vez de 'nombre_completo'
    return {
        "mensaje": "Login exitoso",
        "token_acceso": f"token-simulado-usuario-{usuario.id_usuario}",
        "usuario": {
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "id_rol": usuario.id_rol 
        }
    }