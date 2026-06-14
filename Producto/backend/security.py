import os
import jwt
from datetime import datetime, timedelta, timezone
import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

load_dotenv()

# 1. Configuración de JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "secreto_de_respaldo")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # El token caducará en 1 hora

# 2. Configuración de Encriptación de Contraseñas (Bcrypt Nativo)
def verificar_password(plain_password: str, hashed_password: str) -> bool:
    """Compara la contraseña en texto plano con el hash de la BD utilizando bcrypt nativo"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def obtener_password_hash(password: str) -> str:
    """Transforma una contraseña plana en un hash indescifrable utilizando bcrypt nativo"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def crear_token_acceso(data: dict) -> str:
    """Toma los datos del usuario y genera un JWT firmado"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire}) # Agregamos la fecha de expiración
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Le decimos a FastAPI que los tokens vendrán en formato "Bearer" y que 
# la ruta para conseguirlos es "/login" (esto hará que Swagger ponga el botón de candado)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def obtener_usuario_actual(token: str = Depends(oauth2_scheme)):
    """
    Guardia de Seguridad: Intercepta la petición, lee el token y devuelve el ID del usuario real.
    """
    error_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales o el token es inválido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # 1. Abrimos el candado del token con nuestra clave maestra
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 2. Extraemos el ID que guardamos cuando hizo login
        id_usuario = payload.get("id_usuario")
        if id_usuario is None:
            raise error_credenciales
            
        return id_usuario
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado. Vuelve a iniciar sesión.")
    except jwt.InvalidTokenError:
        raise error_credenciales
    

def obtener_usuario_gerente(token: str = Depends(oauth2_scheme)):
    """
    Guardia VIP: Verifica el token y exige que el usuario sea un Gerente (Rol 2).
    """
    error_permisos = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN, # 403 significa "Prohibido"
        detail="Acceso denegado. Solo los gerentes de Cipress pueden realizar esta acción."
    )
    
    try:
        # 1. Abrimos el candado del token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 2. Extraemos el ID y el ROL que guardamos al hacer login
        id_usuario = payload.get("id_usuario")
        id_rol = payload.get("id_rol")
        
        if id_usuario is None:
            raise HTTPException(status_code=401, detail="Token inválido")
            
        # 3. La regla de oro: Si no es rol 2, lo rebotamos
        if id_rol != 2:
            raise error_permisos
            
        return id_usuario
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado. Vuelve a iniciar sesión.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido.")