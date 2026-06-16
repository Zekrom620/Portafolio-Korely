import requests
import os

API_URL = "http://localhost:8000"
PDF_PATH = r"c:\Users\ZEKROM\Desktop\Portafolio-Korely\Producto\CV_Esteban_Diaz.pdf"

def main():
    print("Iniciando simulación de ingesta de Esteban Díaz...")
    
    # 1. Login
    payload_login = {
        "email": "esteban.diaz@example.com",
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
    
    # 2. Subir CV
    if not os.path.exists(PDF_PATH):
        print(f"Error: No existe el archivo {PDF_PATH}")
        return
        
    print(f"Subiendo currículum {PDF_PATH} para Esteban Díaz...")
    files = {
        "archivo_cv": ("CV_Esteban_Diaz.pdf", open(PDF_PATH, "rb"), "application/pdf")
    }
    data = {
        "nombre_completo": "Esteban Diaz",
        "telefono": "+56988888888"
    }
    
    r_upload = requests.post(f"{API_URL}/candidatos/upload-cv", headers=headers, data=data, files=files)
    if r_upload.status_code != 200:
        print(f"Error al subir CV: {r_upload.text}")
        return
    print("Currículum subido y analizado con éxito por la IA.")
    
    # 3. Obtener id_candidato
    r_candidates = requests.get(f"{API_URL}/candidatos", headers=headers)
    if r_candidates.status_code != 200:
        print(f"Error al obtener lista de candidatos: {r_candidates.text}")
        return
        
    candidates = r_candidates.json()
    my_candidate = None
    for cand in candidates:
        if cand["nombre_completo"] == "Esteban Diaz":
            my_candidate = cand
            break
            
    if not my_candidate:
        print("Error: No se encontró al candidato Esteban Díaz en la base de datos.")
        return
        
    cand_id = my_candidate["id_candidato"]
    print(f"Candidato localizado con ID: {cand_id}")
    
    # 4. Postular a Vacante ID 1
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
