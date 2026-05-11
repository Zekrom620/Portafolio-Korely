from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Credenciales exactas que configuradas en el docker-compose.yml
DATABASE_URL = "postgresql://korely_user:korely_password@localhost:5433/korely_db"

# Motor de conexión a PostgreSQL
engine = create_engine(DATABASE_URL)

# Fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base de la que heredarán nuestros futuros modelos (tablas)
Base = declarative_base()

# Dependencia para obtener la sesión de la base de datos en cada petición a la API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()