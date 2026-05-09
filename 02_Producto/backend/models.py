from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from database import Base
from sqlalchemy.dialects.postgresql import JSONB

class Rol(Base):
    __tablename__ = "roles"
    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(50), nullable=False)

class Usuario(Base):
    __tablename__ = "usuarios"
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(Text)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"))

class Vacante(Base):
    __tablename__ = "vacantes"
    id_vacante = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(100))
    descripcion = Column(Text)
    estado = Column(String(20), default="Abierta")
    fecha_creacion = Column(TIMESTAMP, server_default=func.now())
    id_gerente_creador = Column(Integer, ForeignKey("usuarios.id_usuario"))

class Candidato(Base):
    __tablename__ = "candidatos"
    
    id_candidato = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario")) # El usuario que se registró
    nombre_completo = Column(String(150))
    telefono = Column(String(20))
    cv_texto = Column(Text) # Aquí guardaremos todo el texto bruto del PDF
    cv_estructurado = Column(JSONB)
    # Nota: Comentado el vector por ahora hasta que se configure la búsqueda semántica
    # cv_vector = Column(Vector(768)) 
    
    fecha_postulacion = Column(TIMESTAMP, server_default=func.now())