import PyPDF2
import io

def extraer_texto_pdf(contenido_pdf: bytes) -> str:
    """
    Recibe los bytes de un archivo PDF y devuelve todo su texto como un string.
    """
    # Usamos io.BytesIO para leer el archivo directamente desde la memoria RAM 
    # sin tener que guardarlo en el disco duro del servidor
    lector = PyPDF2.PdfReader(io.BytesIO(contenido_pdf))
    texto_completo = ""
    
    for pagina in lector.pages:
        texto_extraido = pagina.extract_text()
        if texto_extraido:
            texto_completo += texto_extraido + "\n"
            
    return texto_completo 