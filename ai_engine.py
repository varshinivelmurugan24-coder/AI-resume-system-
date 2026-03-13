import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re

def extract_text_from_pdf(filepath: str) -> str:
    text = ""
    try:
        with open(filepath, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return clean_text(text)

def clean_text(text: str) -> str:
    # Remove non-alphanumeric characters and extra whitespace
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def calculate_match_score(resume_text: str, job_description: str) -> float:
    if not resume_text or not job_description:
        return 0.0
    
    clean_jd = clean_text(job_description)
    
    # Using TF-IDF and Cosine Similarity to calculate the match
    tfidf = TfidfVectorizer(stop_words='english')
    matrix = tfidf.fit_transform([clean_jd, resume_text])
    
    # matrix[0] is JD, matrix[1] is Resume
    similarity = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
    
    # Scale to 0-100
    return float(similarity * 100)

def process_resume(filepath: str, job_description: str) -> tuple[str, float]:
    """
    Extracts text from resume and scores it against job description.
    Returns (extracted_text, score)
    """
    text = extract_text_from_pdf(filepath)
    score = calculate_match_score(text, job_description)
    return text, score
