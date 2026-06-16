import requests
import os

API_URL = "http://localhost:8000"
PDF_PATH = r"c:\Users\ZEKROM\Desktop\Portafolio-Korely\Producto\CV_Esteban_Diaz.pdf"

def main():
    print("Iniciando simulación de registro e ingesta de Juan Pérez...")
    
    # 1. Register
    payload_register = {
        "nombre_usuario": "Juan Perez",
        "email": "juan.perez@example.com",
        "password": "password123",
        "rol": "Postulante"
    }
    
    # Check if user already exists
    # If they do, we will just login
    r_reg = requests.post(f"{API_URL}/register", json={
        "nombre": payload_register["nombre_usuario"],
        "email": payload_register["email"],
        "password": payload_register["password"]
    })
    
    if r_reg.status_code == 200:
        print("Usuario registrado exitosamente.")
    elif r_reg.status_code == 400 and "ya está registrado" in r_reg.text:
        print("El usuario ya estaba registrado. Procediendo al login.")
    else:
        print(f"Error al registrar: {r_reg.text}")
        return

    # 2. Login
    payload_login = {
        "email": "juan.perez@example.com",
        "password": "password123"
    }
    
    r_login = requests.post(f"{API_URL}/login", json=payload_login)
    if r_login.status_code != 200:
        print(f"Error de login: {r_login.text}")
        return
        
    login_data = r_login.json()
    token = login_data["access_token"]
    print("Login exitoso. Token obtenido.")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # 3. Subir CV
    if not os.path.exists(PDF_PATH):
        print(f"Error: No existe el archivo {PDF_PATH}")
        return
        
    print(f"Subiendo currículum {PDF_PATH} para Juan Pérez...")
    files = {
        "archivo_cv": ("CV_Juan_Perez.pdf", open(PDF_PATH, "rb"), "application/pdf")
    }
    data = {
        "nombre_completo": "Juan Perez",
        "telefono": "+56999999999"
    }
    
    r_upload = requests.post(f"{API_URL}/candidatos/upload-cv", headers=headers, data=data, files=files)
    if r_upload.status_code != 200:
        print(f"Error al subir CV: {r_upload.text}")
        return
    print("Currículum subido y analizado con éxito por la IA.")
    
    # 4. Obtener id_candidato
    r_candidates = requests.get(f"{API_URL}/candidatos", headers=headers)
    if r_candidates.status_code != 200:
        print(f"Error al obtener lista de candidatos: {r_candidates.text}")
        return
        
    candidates = r_candidates.json()
    my_candidate = None
    for cand in candidates:
        if cand["nombre_completo"] == "Juan Perez":
            my_candidate = cand
            break
            
    if not my_candidate:
        print("Error: No se encontró al candidato Juan Pérez en la base de datos.")
        return
        
    cand_id = my_candidate["id_candidato"]
    print(f"Candidato localizado con ID: {cand_id}")
    
    # 5. Postular a Vacante ID 1 (Periodista) o ver vacantes disponibles
    r_vacs = requests.get(f"{API_URL}/vacantes", headers=headers)
    vacs = r_vacs.json()
    if not vacs:
        print("No hay vacantes en el sistema. No se puede postular.")
        return
        
    vac_id = vacs[0]["id_vacante"]
    vac_title = vacs[0]["titulo"]
    print(f"Postulando a vacante ID {vac_id} ({vac_title})...")
    
    r_postulate = requests.post(f"{API_URL}/postulaciones", headers=headers, json={"id_vacante": vac_id})
    if r_postulate.status_code != 200:
        if "Ya te has postulado" in r_postulate.text:
            print("Ya postulado a esta vacante.")
        else:
            print(f"Error al postular: {r_postulate.text}")
            return
    else:
        print("Postulación creada exitosamente.")
        
    print("Simulación inicial completa. Candidato registrado, CV subido y postulado.")

if __name__ == "__main__":
    main()
