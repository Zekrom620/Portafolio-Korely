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

@app.get("/vacantes", response_model=List[VacanteResponse])
def obtener_vacantes(db: Session = Depends(get_db)):
    """Obtiene todas las vacantes de la base de datos."""
    vacantes = db.query(models.Vacante).all()
    return vacantes

@app.post("/vacantes", response_model=VacanteResponse)
def crear_vacante(vacante: VacanteCreate, db: Session = Depends(get_db),id_gerente: int = Depends(security.obtener_usuario_gerente)):
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
def actualizar_vacante(id_vacante: int, vacante_actualizada: VacanteCreate, db: Session = Depends(get_db), id_gerente: int = Depends(security.obtener_usuario_gerente)):
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
    
    # 4. Guardar en la Base de Datos
    nuevo_candidato = models.Candidato(
        id_usuario=id_usuario, # Usa el ID seguro verificado
        nombre_completo=nombre_completo,
        telefono=telefono,
        cv_texto=texto_extraido,
        cv_estructurado=analisis_ia
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
    db: Session = Depends(get_db),
    # --- CAPA DE SEGURIDAD ---
    id_usuario_token: int = Depends(security.obtener_usuario_actual)
):
    """
    Actualiza los datos de un candidato. 
    Protegido: Solo el dueño del perfil puede modificarlo.
    """
    # 1. Buscamos al candidato en la BD
    candidato = db.query(models.Candidato).filter(models.Candidato.id_candidato == id_candidato).first()
    if not candidato:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")

    # --- 🚨 EL ESCUDO: Validación de Propiedad ---
    if candidato.id_usuario != id_usuario_token:
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado. No tienes permiso para editar este perfil."
        )

    # 2. Actualizamos solo los datos que el usuario haya enviado
    if nombre_completo:
        candidato.nombre_completo = nombre_completo
    if telefono:
        candidato.telefono = telefono

    analisis_ia = None
    
    # 3. Si mandó un nuevo CV, procesamos con Gemini
    if archivo_cv:
        if not archivo_cv.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="El archivo debe ser formato .pdf")
        
        contenido = await archivo_cv.read()
        texto_extraido = pdf_handler.extraer_texto_pdf(contenido)
        candidato.cv_texto = texto_extraido 
        
        # Obtenemos el nuevo análisis de la IA
        analisis_ia = nlp_engine.procesar_cv(texto_extraido)
        # IMPORTANTE: Guardamos el análisis en la columna estructurada
        candidato.cv_estructurado = analisis_ia

    # 4. Guardamos los cambios
    db.commit()
    db.refresh(candidato)

    respuesta = {
        "mensaje": "Candidato actualizado exitosamente de forma segura",
        "candidato_id": candidato.id_candidato
    }
    
    if analisis_ia:
        respuesta["nuevo_analisis_ia"] = analisis_ia
        
    return respuesta

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
        # Aquí puedes agregar un estado por defecto si tienes esa columna, ej: estado="En Revisión"
    )
    
    db.add(nueva_postulacion)
    db.commit()
    
    return {
        "mensaje": "Postulación realizada con éxito",
        "vacante": vacante.titulo, # Asumiendo que tu modelo Vacante tiene un campo 'titulo'
        "candidato": candidato.nombre_completo
    }