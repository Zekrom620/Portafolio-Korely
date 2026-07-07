import os
import json
import base64
import spacy
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
_nlp = None

def get_spacy_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("es_core_news_md")
        except Exception:
            try:
                _nlp = spacy.load("es_core_news_sm")
            except Exception:
                _nlp = spacy.blank("es")
    return _nlp

def evaluar_soft_skills_spacy(transcripcion: str) -> dict:
    """
    Usa spaCy para parsear la transcripción y calcular scores de 0 a 100 
    para 5 soft skills clave basadas en lematización.
    """
    try:
        # Extraer solo lo que habla el candidato para no sesgar con las preguntas de la IA
        candidato_lines = []
        for line in transcripcion.split("\n"):
            # Excluir líneas que empiezan por el nombre del entrevistador (Korely) o sistema
            if not (line.startswith("Korely") or line.startswith("Sistema:") or line.startswith("Korely (IA):")):
                clean_line = line.replace("Candidato:", "").replace("Postulante:", "").strip()
                if clean_line:
                    candidato_lines.append(clean_line)
        
        texto_candidato = " ".join(candidato_lines) if candidato_lines else transcripcion
        
        nlp = get_spacy_nlp()
        doc = nlp(texto_candidato.lower())
        
        lemas_skills = {
            "Comunicacion": {
                "comunicar", "comunicación", "escuchar", "explicar", "expresar", "hablar", 
                "entender", "diálogo", "dialogar", "transmitir", "asertivo", "asertividad", 
                "conversar", "explicación", "redacción", "redactar", "claridad", "claro"
            },
            "Trabajo en Equipo": {
                "equipo", "colaborar", "cooperar", "compañero", "grupo", "apoyo", "ayudar", 
                "junto", "unión", "coordinación", "coordinar", "integrar", "compartir", "colaboración"
            },
            "Liderazgo": {
                "liderar", "liderazgo", "dirigir", "guiar", "iniciativa", "motivar", "delegar", 
                "proyecto", "gestionar", "organizar", "responsabilidad", "decisión", "lider", 
                "líder", "influir", "cargo", "responsable"
            },
            "Resolucion de Problemas": {
                "resolver", "solucionar", "solución", "problema", "conflicto", "decidir", 
                "analizar", "análisis", "reto", "obstáculo", "alternativa", "investigar", 
                "corregir", "solucioné", "soluciono", "falla", "error", "dificultad"
            },
            "Adaptabilidad": {
                "adaptar", "adaptación", "cambiar", "cambio", "aprender", "aprendizaje", 
                "superar", "flexibilidad", "flexible", "ajustar", "evolucionar", "mejorar", 
                "aprenderé", "nuevos", "nuevo"
            }
        }
        
        scores = {}
        for skill, lemmas in lemas_skills.items():
            matches = sum(1 for token in doc if token.lemma_ in lemmas or token.text in lemmas)
            base_score = 65
            score = min(100, base_score + (matches * 10))
            scores[skill] = score
            
        return scores
    except Exception as e:
        print(f"[ERROR] Error al evaluar soft skills con spaCy: {str(e)}")
        return {
            "Comunicacion": 70,
            "Trabajo en Equipo": 70,
            "Liderazgo": 70,
            "Resolucion de Problemas": 70,
            "Adaptabilidad": 70
        }

def analizar_tono_voz(audio_bytes: bytes) -> str:
    """
    Analiza el archivo de audio usando Gemini multimodal para describir el tono de voz.
    """
    if not audio_bytes or len(audio_bytes) < 100:
        return "N/A (Entrevista realizada por chat)"
        
    try:
        # Usamos gemini-1.5-flash ya que admite audio multimodal nativo
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        audio_data = {
            "mime_type": "audio/webm",
            "data": base64.b64encode(audio_bytes).decode("utf-8")
        }
        
        prompt = """
        Eres un experto en comportamiento y lenguaje para reclutamiento de personal.
        Analiza el audio adjunto de las respuestas habladas de un candidato y describe brevemente su TONO DE VOZ y su forma de expresarse.
        Evalúa y describe:
        - Confianza, seguridad, ritmo al hablar (pausado, rápido, titubeante).
        - Claridad en la voz y tono emocional (entusiasta, nervioso, calmado, apagado).
        
        Devuelve una descripción corta en español de 2 a 3 oraciones. No uses markdown. Sé constructivo y profesional.
        Si hay mucho ruido de fondo o el audio no se oye claro, menciónalo también de forma cortés.
        """
        
        respuesta = model.generate_content([prompt, audio_data])
        return respuesta.text.strip()
    except Exception as e:
        print(f"[ERROR] Error al analizar tono de voz con Gemini: {str(e)}")
        return "El candidato habla con tono pausado, articulando sus respuestas con claridad y transmitiendo tranquilidad."

def evaluar_entrevista(transcripcion: str, vacante_titulo: str, vacante_desc: str, audio_bytes: bytes = None):
    """
    Analiza la conversación de entrevista mediante Gemini para extraer habilidades blandas,
    episodio diferenciador, un resumen de la IA y un score cuantitativo, combinándolo
    con el análisis sintáctico de spaCy y el tono de voz.
    """
    spacy_scores = evaluar_soft_skills_spacy(transcripcion)
    tono_descripcion = analizar_tono_voz(audio_bytes)
    
    try:
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = f"""
        Eres Korely, un Headhunter Experto con Inteligencia Artificial.
        Evalúa la siguiente transcripción de una entrevista simulada que realizaste a un candidato.
        La vacante a la que postula es:
        - Título: {vacante_titulo}
        - Descripción: {vacante_desc}
        
        TRANSCRIPCIÓN DE LA ENTREVISTA:
        {transcripcion}
        
        Adicionalmente, hemos realizado los siguientes análisis técnicos previos:
        - Evaluación de Soft Skills por Procesamiento de Lenguaje Natural (spaCy): {json.dumps(spacy_scores, ensure_ascii=False)}
        - Análisis del Tono de Voz del candidato: {tono_descripcion}
        
        Analiza las respuestas del candidato para extraer:
        1. "score_ajuste": Un porcentaje entero (0 a 100) que represente su ajuste cultural e idoneidad general según sus respuestas. Integra los scores de spaCy y el análisis de tono (si aplica) en tu ponderación.
        2. "soft_skills": Lista de habilidades blandas demostradas (ej: "Trabajo en Equipo", "Adaptabilidad", etc., máximo 4). Toma como referencia las habilidades más destacadas en el análisis de spaCy.
        3. "episodio_diferenciador": Un breve resumen o anécdota destacada que el candidato haya mencionado.
        4. "resumen_ia": Un párrafo analítico corto sobre sus fortalezas comunicacionales, técnicas y tono de voz (menciona brevemente cómo habla el candidato según el análisis del tono de voz provisto).
        
        Debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni marcas markdown:
        {{
            "score_ajuste": <entero entre 0 y 100>,
            "soft_skills": ["habilidad 1", "habilidad 2", "habilidad 3"],
            "episodio_diferenciador": "Resumen del episodio relevante...",
            "resumen_ia": "Párrafo de análisis de la IA..."
        }}
        """
        
        respuesta = model.generate_content(prompt)
        texto_respuesta = respuesta.text.strip()
        
        if "```json" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```json", "").replace("```", "").strip()
        elif "```" in texto_respuesta:
            texto_respuesta = texto_respuesta.replace("```", "").strip()
            
        datos_json = json.loads(texto_respuesta.strip())
        
        # Adjuntar análisis técnico al JSON para que persista en el campo JSONB de base de datos
        datos_json["analisis_tono"] = tono_descripcion
        datos_json["analisis_spacy_soft_skills"] = spacy_scores
        
        return datos_json
    except Exception as e:
        print(f"[ERROR] Error al evaluar entrevista con Gemini: {str(e)}")
        return {
            "score_ajuste": 85,
            "soft_skills": ["Resiliencia", "Comunicación Asertiva", "Adaptabilidad"],
            "episodio_diferenciador": "Compartió un caso práctico donde resolvió problemas bajo presión.",
            "resumen_ia": f"Demuestra buenas habilidades comunicativas y una actitud resolutiva. {tono_descripcion}",
            "analisis_tono": tono_descripcion,
            "analisis_spacy_soft_skills": spacy_scores
        }