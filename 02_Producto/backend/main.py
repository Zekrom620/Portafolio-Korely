from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# Importamos configuración, motor y modelos
from database import get_db, engine
import models

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