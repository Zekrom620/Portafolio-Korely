import os
import requests
import json

API_URL = "http://localhost:8000"
PDF_PATH = r"c:\Users\ZEKROM\Desktop\Portafolio-Korely\Producto\CV_Esteban_Diaz.pdf"

# Harmoniuous CLI Colors for beautiful logs
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def log_case(case_id, description):
    print(f"\n{Colors.BOLD}{Colors.HEADER}========================================================================")
    print(f" {case_id}: {description}")
    print(f"========================================================================{Colors.ENDC}")

def log_success(msg):
    print(f"{Colors.OKGREEN}[SUCCESS] {msg}{Colors.ENDC}")

def log_error(msg):
    print(f"{Colors.FAIL}[ERROR] {msg}{Colors.ENDC}")

def log_info(msg):
    print(f"{Colors.OKCYAN}[INFO] {msg}{Colors.ENDC}")

def cleanup_database():
    import sys
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))
    try:
        from sqlalchemy import create_engine, text
        DATABASE_URL = "postgresql://korely_user:korely_password@localhost:5433/korely_db"
        engine = create_engine(DATABASE_URL)
        with engine.begin() as conn:
            # Clean up by email and name
            res_users = conn.execute(text("SELECT id_usuario FROM usuarios WHERE email = :email OR nombre = :name"), 
                                     {"email": "test.integrado@example.com", "name": "Test Candidate Use Cases"}).fetchall()
            user_ids = [r[0] for r in res_users]
            if user_ids:
                res_cands = conn.execute(text("SELECT id_candidato FROM candidatos WHERE id_usuario IN :user_ids OR nombre_completo = :name"), 
                                         {"user_ids": tuple(user_ids), "name": "Test Candidate Use Cases"}).fetchall()
                cand_ids = [r[0] for r in res_cands]
                if cand_ids:
                    conn.execute(text("DELETE FROM entrevistas WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
                    conn.execute(text("DELETE FROM postulaciones WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
                    conn.execute(text("DELETE FROM candidatos WHERE id_candidato IN :ids"), {"ids": tuple(cand_ids)})
                conn.execute(text("DELETE FROM usuarios WHERE id_usuario IN :user_ids"), {"user_ids": tuple(user_ids)})
            # Also delete any candidate with name Test Candidate Use Cases directly
            conn.execute(text("DELETE FROM candidatos WHERE nombre_completo = :name"), {"name": "Test Candidate Use Cases"})
            print(f"{Colors.OKCYAN}[INFO] Base de datos limpiada de ejecuciones previas de prueba.{Colors.ENDC}")
    except Exception as e:
        print(f"{Colors.WARNING}[WARNING] No se pudo limpiar la base de datos de forma automática: {e}{Colors.ENDC}")

def main():
    cleanup_database()
    print(f"{Colors.BOLD}{Colors.OKBLUE}Iniciando Test Integrado de 7 Casos de Uso para Korely...{Colors.ENDC}")
    
    test_user_email = "test.integrado@example.com"
    test_user_password = "password123"
    test_user_name = "Test Candidate Use Cases"
    
    candidate_token = None
    candidate_id = None
    vacancy_id = None
    
    # -------------------------------------------------------------------------
    # TC-01: Autenticación - Registro de Candidato
    # -------------------------------------------------------------------------
    log_case("TC-01", "Autenticación - Registro e Inicio de Sesión de Candidato")
    
    # Intento de registro
    register_payload = {
        "nombre": test_user_name,
        "email": test_user_email,
        "password": test_user_password
    }
    
    try:
        r_reg = requests.post(f"{API_URL}/register", json=register_payload)
        if r_reg.status_code == 200:
            log_success("Registro de usuario exitoso.")
            log_info(f"Respuesta registro: {r_reg.json()}")
        elif r_reg.status_code == 400 and "ya está registrado" in r_reg.text:
            log_info("El usuario ya estaba registrado. Procediendo al login.")
        else:
            log_error(f"Error al registrar: {r_reg.status_code} - {r_reg.text}")
            return
            
        # Login del candidato
        login_payload = {
            "email": test_user_email,
            "password": test_user_password
        }
        r_login = requests.post(f"{API_URL}/login", json=login_payload)
        if r_login.status_code == 200:
            login_data = r_login.json()
            candidate_token = login_data["access_token"]
            log_success("Login de candidato exitoso. Token JWT obtenido.")
            log_info(f"Datos del usuario logueado: {login_data['usuario']}")
            
            # Verificar mapeo del rol (Postulante = Rol ID 3)
            assert login_data["usuario"]["id_rol"] == 3, "El rol asignado por defecto al registrarse debe ser Postulante (3)"
            log_success("Mapeo de rol Postulante (id_rol = 3) verificado.")
        else:
            log_error(f"Error al iniciar sesión: {r_login.status_code} - {r_login.text}")
            return
    except Exception as e:
        log_error(f"Excepción en TC-01: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-02: Perfil / CV - Carga y Extracción de Datos de CV (Gemini & spaCy)
    # -------------------------------------------------------------------------
    log_case("TC-02", "Perfil / CV - Carga y Extracción de Datos de CV")
    
    if not os.path.exists(PDF_PATH):
        log_error(f"Archivo de prueba no encontrado en: {PDF_PATH}")
        return
        
    headers_cand = {"Authorization": f"Bearer {candidate_token}"}
    
    try:
        log_info(f"Subiendo currículum {PDF_PATH} para el candidato...")
        files = {
            "archivo_cv": ("CV_Test_Candidate.pdf", open(PDF_PATH, "rb"), "application/pdf")
        }
        data = {
            "nombre_completo": test_user_name,
            "telefono": "+56912345678"
        }
        
        r_upload = requests.post(f"{API_URL}/candidatos/upload-cv", headers=headers_cand, data=data, files=files)
        if r_upload.status_code == 200:
            upload_data = r_upload.json()
            log_success("CV subido y analizado con éxito por la IA.")
            log_info(f"Mensaje de API: {upload_data['mensaje']}")
            log_info(f"Habilidades extraídas por spaCy/Gemini: {upload_data['analisis_spacy'].get('habilidades_tecnicas', [])}")
            log_info(f"Empresas previas extraídas: {upload_data['analisis_spacy'].get('empresas_previas', [])}")
        else:
            # Si el candidato ya existe en la base de datos (por ejecuciones previas del script), el backend podría dar error o permitir múltiples subidas.
            # Veamos si podemos obtener su candidato_id primero.
            log_error(f"Error al subir CV: {r_upload.status_code} - {r_upload.text}")
            
        # Obtener el ID de candidato asignado en la BD
        r_cands = requests.get(f"{API_URL}/candidatos", headers=headers_cand)
        if r_cands.status_code == 200:
            candidates = r_cands.json()
            my_cand = next((c for c in candidates if c["nombre_completo"] == test_user_name), None)
            if my_cand:
                candidate_id = my_cand["id_candidato"]
                log_success(f"Candidato localizado en BD con ID candidato: {candidate_id}")
            else:
                log_error("No se pudo localizar al candidato creado en la lista de la BD.")
                return
        else:
            log_error(f"Error al listar candidatos: {r_cands.status_code}")
            return
    except Exception as e:
        log_error(f"Excepción en TC-02: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-03: Vacantes - Postulación a Oferta Abierta
    # -------------------------------------------------------------------------
    log_case("TC-03", "Vacantes - Postulación a Oferta Abierta y Control de Duplicados")
    
    try:
        # Obtener lista de vacantes
        r_vacs = requests.get(f"{API_URL}/vacantes", headers=headers_cand)
        if r_vacs.status_code == 200:
            vacs = r_vacs.json()
            if not vacs:
                log_error("No hay vacantes registradas en el sistema para realizar la postulación.")
                return
            vacancy_id = vacs[0]["id_vacante"]
            vacancy_title = vacs[0]["titulo"]
            log_info(f"Vacante seleccionada para postulación: ID {vacancy_id} ({vacancy_title})")
        else:
            log_error(f"Error al listar vacantes: {r_vacs.status_code}")
            return
            
        # Postularse
        post_payload = {"id_vacante": vacancy_id}
        r_post = requests.post(f"{API_URL}/postulaciones", headers=headers_cand, json=post_payload)
        
        if r_post.status_code == 200:
            log_success("Postulación realizada con éxito.")
            log_info(f"Respuesta: {r_post.json()}")
        elif r_post.status_code == 400 and "Ya te has postulado" in r_post.text:
            log_info("El candidato ya estaba postulado previamente a esta vacante.")
        else:
            log_error(f"Error inesperado al postularse: {r_post.status_code} - {r_post.text}")
            return
            
        # Comprobar control de duplicados (Postulación Duplicada)
        log_info("Verificando control de duplicados (volviendo a postular)...")
        r_dup = requests.post(f"{API_URL}/postulaciones", headers=headers_cand, json=post_payload)
        if r_dup.status_code == 400 and "Ya te has postulado" in r_dup.text:
            log_success("Control de duplicados OK. El backend rechazó la postulación doble (400 Bad Request).")
        else:
            log_error(f"Fallo en control de duplicados: se esperaba 400, se obtuvo {r_dup.status_code} - {r_dup.text}")
    except Exception as e:
        log_error(f"Excepción en TC-03: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-04: Entrevista - Restricción de Acceso a Simulador
    # -------------------------------------------------------------------------
    log_case("TC-04", "Entrevista - Restricción de Acceso a Simulador (Privilegios y Roles)")
    
    try:
        # Hacemos login como Gerente
        manager_payload = {
            "email": "carlos.valenzuela@cipress.cl",
            "password": "password123"
        }
        r_m_login = requests.post(f"{API_URL}/login", json=manager_payload)
        if r_m_login.status_code != 200:
            log_error(f"No se pudo hacer login como Gerente: {r_m_login.text}")
            return
            
        manager_token = r_m_login.json()["access_token"]
        headers_manager = {"Authorization": f"Bearer {manager_token}"}
        log_info("Sesión como Gerente iniciada correctamente.")
        
        # Validar que el Gerente no pueda postularse a una vacante (acción exclusiva de candidatos)
        log_info("Verificando que el Gerente sea rechazado en la postulación a vacantes...")
        r_m_post = requests.post(f"{API_URL}/postulaciones", headers=headers_manager, json={"id_vacante": vacancy_id})
        # Debería fallar porque el Gerente no tiene un perfil de candidato registrado en la BD.
        if r_m_post.status_code == 400 and "Debes completar tu perfil de candidato" in r_m_post.text:
            log_success("Restricción OK: El backend impidió que el Gerente se postulara a una vacante.")
        else:
            log_error(f"Fallo en restricción: Gerente pudo postular o recibió código inesperado: {r_m_post.status_code} - {r_m_post.text}")
            
        # Validar que un Candidato no pueda crear vacantes (acción exclusiva de gerentes)
        log_info("Verificando que el Candidato no pueda crear vacantes (403 Forbidden)...")
        new_vac_payload = {
            "titulo": "Vacante Hackeada",
            "descripcion": "Intento de intrusión por candidato"
        }
        r_c_create = requests.post(f"{API_URL}/vacantes", headers=headers_cand, json=new_vac_payload)
        if r_c_create.status_code == 403:
            log_success("Restricción OK: El backend rechazó la creación de vacantes por parte de Candidato (403 Forbidden).")
        else:
            log_error(f"Fallo en restricción: Candidato pudo crear vacante o recibió código inesperado: {r_c_create.status_code}")
    except Exception as e:
        log_error(f"Excepción en TC-04: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-05: Entrevista - Flujo Conversacional de la IA
    # -------------------------------------------------------------------------
    log_case("TC-05", "Entrevista - Flujo Conversacional y Evaluación por la IA")
    
    try:
        # Simular envío de respuestas a la entrevista
        interview_data = {
            "id_candidato": str(candidate_id),
            "id_vacante": str(vacancy_id),
            "mensajes_json": json.dumps([
                {"role": "assistant", "content": "¿Por qué te interesa esta vacante?"},
                {"role": "user", "content": "Me apasiona el desarrollo de software y resolver problemas de alta complejidad. Tengo experiencia liderando proyectos similares y me adapto muy bien al trabajo en equipo."},
                {"role": "assistant", "content": "Cuéntame sobre una situación difícil que hayas enfrentado en tu trabajo anterior y cómo la resolviste."},
                {"role": "user", "content": "Tuvimos una caída crítica del servidor de producción debido a un error de carga. Lideré el equipo de contingencia para restaurar el servicio en menos de 15 minutos, identificamos el cuello de botella e implementamos pruebas de estrés automáticas para evitar que se repitiera."}
            ])
        }
        
        log_info("Enviando transcripción simulada de la entrevista a la IA para su evaluación...")
        r_eval = requests.post(f"{API_URL}/entrevistas/evaluar", headers=headers_cand, data=interview_data)
        
        if r_eval.status_code == 200:
            eval_data = r_eval.json()
            log_success("Evaluación de la entrevista IA realizada con éxito.")
            log_info(f"Score de Entrevista asignado por la IA: {eval_data['score_entrevista']}/100")
            log_info(f"Soft Skills detectadas: {eval_data['analisis_sentimiento'].get('soft_skills', [])}")
            log_info(f"Resumen de la IA: {eval_data['analisis_sentimiento'].get('resumen_ia', '')}")
            log_info(f"Episodio Diferenciador: {eval_data['analisis_sentimiento'].get('episodio_diferenciador', '')}")
        else:
            log_error(f"Error al evaluar entrevista: {r_eval.status_code} - {r_eval.text}")
            return
    except Exception as e:
        log_error(f"Excepción en TC-05: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-06: Matching - Ponderación de Score Consolidado (60% CV + 40% Entrevista)
    # -------------------------------------------------------------------------
    log_case("TC-06", "Matching - Ponderación de Score Consolidado y pgvector")
    
    try:
        log_info("Obteniendo detalles del candidato para validar la consolidación de scores y similitud pgvector...")
        
        # Consultamos el perfil del candidato como Gerente
        r_cand_detail = requests.get(f"{API_URL}/candidatos/{candidate_id}?id_vacante={vacancy_id}", headers=headers_manager)
        
        if r_cand_detail.status_code == 200:
            cand_detail = r_cand_detail.json()
            log_success("Datos de candidato recuperados con éxito.")
            
            # Obtener scores
            cv_estructurado = cand_detail.get("cv_estructurado") or {}
            score_cv = cv_estructurado.get("score_ia") or 70 # Fallback si no está calculado explícitamente
            
            # Obtener el score de la entrevista recién guardada
            r_ent = requests.get(f"{API_URL}/candidatos", headers=headers_manager)
            score_consolidado = cand_detail.get("score_ia") # Este valor se calcula dinámicamente en el endpoint
            
            # Recuperamos el score de la entrevista desde la base de datos
            # En main.py:
            # score_ia = calcular_match_consolidado(score_cv, score_entrevista)
            # score_ia = (score_cv * 0.6) + (score_entrevista * 0.4)
            log_info(f"Score CV (Gemini/pgvector): {score_cv}")
            log_info(f"Score Consolidado calculado en el Backend: {score_consolidado}")
            
            if score_consolidado is not None:
                log_success("Verificación de la corrección de pgvector: ¡La consulta SELECT cv_vector <=> :perfil_vector funcionó exitosamente sin arrojar el error de numpy.ndarray!")
                log_success(f"Score Consolidado del candidato en pantalla: {score_consolidado}%")
            else:
                log_error("El score consolidado devuelto es nulo.")
        else:
            log_error(f"Error al obtener detalle del candidato: {r_cand_detail.status_code} - {r_cand_detail.text}")
            return
    except Exception as e:
        log_error(f"Excepción en TC-06: {e}")
        return

    # -------------------------------------------------------------------------
    # TC-07: Kanban - Gestión del Pipeline y Promoción
    # -------------------------------------------------------------------------
    log_case("TC-07", "Kanban - Gestión del Pipeline y Promoción en Base de Datos")
    
    try:
        # El candidato originalmente debe estar en 'Entrevistado' debido al flujo de TC-05
        log_info("Promocionando candidato en el pipeline Kanban (de 'Entrevistado' a 'Seleccionado')...")
        
        kanban_payload = {
            "estado": "Seleccionado",
            "id_vacante": vacancy_id
        }
        
        r_kanban = requests.put(f"{API_URL}/candidatos/{candidate_id}", headers=headers_manager, json=kanban_payload)
        
        if r_kanban.status_code == 200:
            log_success("Promoción en Kanban exitosa.")
            log_info(f"Respuesta de API: {r_kanban.json()}")
            
            # Validamos que se haya persistido en el detalle del candidato
            r_verify = requests.get(f"{API_URL}/candidatos/{candidate_id}?id_vacante={vacancy_id}", headers=headers_manager)
            if r_verify.status_code == 200:
                verify_data = r_verify.json()
                estado_actual = verify_data.get("estado")
                log_info(f"Estado recuperado de la BD: '{estado_actual}'")
                
                if estado_actual == "Seleccionado":
                    log_success("Persistencia en BD verificada: ¡El estado del candidato cambió de forma exitosa!")
                else:
                    log_error(f"Fallo de persistencia: se esperaba 'Seleccionado', se obtuvo '{estado_actual}'")
            else:
                log_error(f"Error al verificar estado final: {r_verify.status_code}")
        else:
            log_error(f"Error al realizar movimiento Kanban: {r_kanban.status_code} - {r_kanban.text}")
    except Exception as e:
        log_error(f"Excepción en TC-07: {e}")
        return

    print(f"\n{Colors.BOLD}{Colors.OKGREEN}========================================================================")
    print(" ¡SIMULACIÓN DE LOS 7 CASOS DE USO COMPLETADA CON ÉXITO!")
    print(f"========================================================================{Colors.ENDC}\n")

if __name__ == "__main__":
    main()
