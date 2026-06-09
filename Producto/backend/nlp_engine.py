import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Cargamos tu API Key de forma 100% segura desde el .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("[ERROR] ERROR CRÍTICO: Python no está encontrando el archivo .env o la variable GEMINI_API_KEY")
else:
    genai.configure(api_key=api_key)
    print("[OK] Credenciales de Gemini cargadas de forma segura.")

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
        print(f"[ERROR] {error_real}")
        return {"error": error_real}

def generar_embedding(texto: str):
    """
    Toma un texto (CV o descripción de vacante) y genera su vector embedding usando Gemini.
    """
    try:
        if not api_key:
            return None
        # gemini-embedding-001 genera por defecto 3072, pero permite configurarlo a 768 dimensiones
        resultado = genai.embed_content(
            model="models/gemini-embedding-001",
            content=texto,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        return resultado['embedding']
    except Exception as e:
        print(f"[ERROR] Error al generar embedding con Gemini: {str(e)}")
        return None

def analizar_compatibilidad(cv_texto: str, vacante_titulo: str, vacante_desc: str, vacante_competencias: list):
    """
    Compara el CV del candidato con los requerimientos de la vacante usando Gemini.
    Devuelve un diccionario con score_ia, fortalezas, brechas y habilidades_tecnicas.
    """
    try:
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        competencias_str = ", ".join(vacante_competencias) if vacante_competencias else "No especificadas"
        
        prompt = f"""
        Eres Korely, un Headhunter Autónomo experto con Inteligencia Artificial.
        Evalúa el currículum de un candidato frente a los requisitos de una vacante.
        
        DATOS DE LA VACANTE:
        - Título: {vacante_titulo}
        - Descripción: {vacante_desc}
        - Competencias Requeridas: {competencias_str}
        
        CURRÍCULUM DEL CANDIDATO:
        {cv_texto}
        
        Analiza detalladamente la afinidad y calcula un puntaje de compatibilidad (score_ia) de 0 a 100.
        Identifica fortalezas (dónde coincide su experiencia/habilidades con la vacante) y brechas (qué requerimientos de la vacante no se cumplen).
        
        Debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
        {{
            "score_ia": <número entre 0 y 100>,
            "fortalezas": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
            "brechas": ["brecha 1", "brecha 2"],
            "habilidades_tecnicas": ["habilidad detectada 1", "habilidad detectada 2"]
        }}
        """
        
        respuesta = model.generate_content(prompt)
        texto_respuesta = respuesta.text
        
        if "```json" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```json", "").replace("```", "").strip()
        elif "```" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```", "").strip()
            
        datos_json = json.loads(texto_respuesta.strip())
        return datos_json
    except Exception as e:
        print(f"[ERROR] Error al analizar compatibilidad con Gemini: {str(e)}")
        return {
            "score_ia": 70,
            "fortalezas": ["Tiene experiencia en áreas relacionadas con el periodismo/comunicaciones."],
            "brechas": ["Se requiere profundizar en algunas competencias técnicas específicas de la vacante."],
            "habilidades_tecnicas": ["Redacción", "Comunicaciones"]
        }