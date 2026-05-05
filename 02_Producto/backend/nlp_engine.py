import spacy

try:
    nlp = spacy.load("es_core_news_md")
    print("✅ IA de spaCy cargada correctamente.")
except Exception as e:
    print(f"❌ Error al cargar spaCy: {e}")

def procesar_cv(texto_cv: str):
    """
    Toma el texto de un CV y extrae entidades agrupándolas en categorías limpias.
    """
    doc = nlp(texto_cv)
    
    # Creamos un diccionario limpio para organizar la información
    datos_extraidos = {
        "Personas": [],
        "Organizaciones": [],
        "Lugares": []
    }
    
    # Clasificamos las entidades en sus listas correspondientes
    for entidad in doc.ents:
        if entidad.label_ == "PER":
            datos_extraidos["Personas"].append(entidad.text)
        elif entidad.label_ == "ORG":
            datos_extraidos["Organizaciones"].append(entidad.text)
        elif entidad.label_ == "LOC":
            datos_extraidos["Lugares"].append(entidad.text)
            
    # Opcional: Eliminamos duplicados por si la IA detecta la misma palabra dos veces
    datos_extraidos["Personas"] = list(set(datos_extraidos["Personas"]))
    datos_extraidos["Organizaciones"] = list(set(datos_extraidos["Organizaciones"]))
    datos_extraidos["Lugares"] = list(set(datos_extraidos["Lugares"]))
            
    return datos_extraidos