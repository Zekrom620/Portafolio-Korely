import security
from sqlalchemy import create_engine, text
from database import DATABASE_URL

def main():
    print(f"Conectando a la base de datos: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    with engine.begin() as conn:
        # 1. Obtener IDs de usuarios informales
        print("Identificando cuentas informales...")
        res_bodoque = conn.execute(text("SELECT id_usuario FROM usuarios WHERE nombre ILIKE '%bodoque%' OR email ILIKE '%bodoque%'")).fetchall()
        bodoque_ids = [r[0] for r in res_bodoque]
        
        res_dido = conn.execute(text("SELECT id_usuario FROM usuarios WHERE nombre ILIKE '%dido%' OR email ILIKE '%dido%'")).fetchall()
        dido_ids = [r[0] for r in res_dido]
        
        informal_ids = bodoque_ids + dido_ids
        print(f"IDs a limpiar: {informal_ids}")
        
        # 2. Borrar datos relacionados en cascada
        if informal_ids:
            # Obtener candidatos vinculados
            res_cands = conn.execute(text("SELECT id_candidato FROM candidatos WHERE id_usuario IN :ids"), {"ids": tuple(informal_ids)}).fetchall()
            cand_ids = [r[0] for r in res_cands]
            
            if cand_ids:
                print(f"Eliminando entrevistas, postulaciones para candidatos: {cand_ids}...")
                conn.execute(text("DELETE FROM entrevistas WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
                conn.execute(text("DELETE FROM postulaciones WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
                conn.execute(text("DELETE FROM candidatos WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
            
            print(f"Eliminando usuarios informales: {informal_ids}...")
            conn.execute(text("DELETE FROM usuarios WHERE id_usuario IN :ids"), {"ids": tuple(informal_ids)})

        # 3. Renombrar e formalizar el Gerente (Usuario ID 1)
        print("Formalizando el perfil del Gerente...")
        hash_pass = security.obtener_password_hash("password123")
        conn.execute(text("""
            UPDATE usuarios 
            SET nombre = 'Carlos Valenzuela', 
                email = 'carlos.valenzuela@cipress.cl', 
                password_hash = :hash
            WHERE id_usuario = 1
        """), {"hash": hash_pass})
        
        # 4. Crear un Candidato formal: Esteban Díaz (esteban.diaz@example.com)
        # Verificar si ya existe
        res_esteban = conn.execute(text("SELECT id_usuario FROM usuarios WHERE email = 'esteban.diaz@example.com'")).first()
        if not res_esteban:
            print("Creando usuario formal para candidato Esteban Díaz...")
            res_insert = conn.execute(text("""
                INSERT INTO usuarios (nombre, email, password_hash, id_rol)
                VALUES ('Esteban Diaz', 'esteban.diaz@example.com', :hash, 3)
                RETURNING id_usuario
            """), {"hash": hash_pass})
            new_user_id = res_insert.fetchone()[0]
            print(f"Candidato Esteban Díaz creado con ID usuario: {new_user_id}")
        else:
            print("El candidato Esteban Díaz ya estaba registrado.")
            
    print("Base de datos saneada e inicializada formalmente.")

if __name__ == "__main__":
    main()
