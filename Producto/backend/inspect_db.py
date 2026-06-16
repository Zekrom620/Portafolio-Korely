from sqlalchemy import create_engine, text
from database import DATABASE_URL

def main():
    print(f"Conectando a la base de datos: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        print("\n--- Usuarios Registrados ---")
        res_users = conn.execute(text("SELECT id_usuario, nombre, email, id_rol FROM usuarios")).fetchall()
        for u in res_users:
            print(f"ID: {u[0]} | Nombre: {u[1]} | Email: {u[2]} | Rol ID: {u[3]}")
            
        print("\n--- Candidatos Registrados ---")
        res_cands = conn.execute(text("SELECT id_candidato, nombre_completo, telefono, id_usuario FROM candidatos")).fetchall()
        for c in res_cands:
            print(f"ID: {c[0]} | Nombre: {c[1]} | Teléfono: {c[2]} | Usuario ID: {c[3]}")

if __name__ == "__main__":
    main()
