import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Cargamos tu API Key de forma 100% segura desde el .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ ERROR CRÍTICO: Python no está encontrando el archivo .env o la variable GEMINI_API_KEY")
else:
    genai.configure(api_key=api_key)
    print("✅ Credenciales de Gemini cargadas de forma segura.")

def procesar_cv(texto_cv: str):
    """
    Toma el texto bruto de un CV y usa la versión más reciente de Gemini para estructurarlo.
    """
    try:
        # AQUÍ ESTÁ LA CORRECCIÓN: Usamos el modelo moderno que pide la documentación.
        # Puedes probar con 'gemini-1.5-flash' o el que encontraste en la doc: 'gemini-3-flash-preview'
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = f"""
        Eres Korely, un Headhunter Autónomo experto. 
        Lee el siguiente texto extraído de un currículum y extrae la información clave.
        Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura, sin texto adicional:
        {{
            "nombre_candidato": "Nombre encontrado o 'No especificado'",
            "habilidades_tecnicas": ["habilidad 1", "habilidad 2"],
            "empresas_previas": ["Empresa 1", "Empresa 2"]
        }}

        Texto del CV:
        {texto_cv}
        """
        
        respuesta = model.generate_content(prompt)
        texto_respuesta = respuesta.text
        
        # Limpieza por si Gemini responde con formato Markdown
        if "```json" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```json", "").replace("```", "").strip()
        elif "```" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```", "").strip()
            
        datos_json = json.loads(texto_respuesta)
        return datos_json
        
    except Exception as e:
        error_real = f"ERROR EXACTO DE GOOGLE: {type(e).__name__} - {str(e)}"
        print(f"❌ {error_real}")
        return {"error": error_real}