from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
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

    class Config:
        from_attributes = True

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
    # 1. Validar que sea un PDF
    if not archivo_cv.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser formato .pdf")
    
    # 2. Extraer el texto del PDF
    contenido = await archivo_cv.read()
    texto_extraido = pdf_handler.extraer_texto_pdf(contenido)
    
    # 3. Guardar en la Base de Datos
    nuevo_candidato = models.Candidato(
        id_usuario=id_usuario,
        nombre_completo=nombre_completo,
        telefono=telefono,
        cv_texto=texto_extraido
    )
    db.add(nuevo_candidato)
    db.commit()
    db.refresh(nuevo_candidato)
    
    # 4. Procesar el texto extraído con spaCy (IA)
    analisis_ia = nlp_engine.procesar_cv(texto_extraido)
    
    return {
        "mensaje": "CV procesado exitosamente",
        "candidato": nombre_completo,
        "texto_preview": texto_extraido[:200] + "...", # Muestra los primeros 200 caracteres para comprobar
        "analisis_spacy": analisis_ia
    }