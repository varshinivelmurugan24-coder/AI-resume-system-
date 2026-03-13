from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

from models import SessionLocal, Job, Candidate
from ai_engine import process_resume

app = FastAPI(title="AI Resume Screening API")

# Setup CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Directory for storing uploads temporarily
os.makedirs("uploads", exist_ok=True)

@app.post("/jobs/")
def create_job(title: str = Form(...), description: str = Form(...), db: Session = Depends(get_db)):
    job = Job(title=title, description=description)
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id, "title": job.title}

@app.get("/jobs/")
def get_jobs(db: Session = Depends(get_db)):
    return db.query(Job).all()

@app.post("/upload/")
async def upload_resume(
    name: str = Form(...),
    email: str = Form(...),
    job_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())

    # Process resume text and calculate match score
    parsed_text, match_score = process_resume(file_location, job.description)
    
    candidate = Candidate(
        name=name,
        email=email,
        filename=file.filename,
        parsed_text=parsed_text,
        job_id=job.id,
        match_score=round(match_score, 2)
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    return {"id": candidate.id, "name": candidate.name, "score": candidate.match_score}

@app.get("/candidates/{job_id}")
def get_candidates(job_id: int, db: Session = Depends(get_db)):
    return db.query(Candidate).filter(Candidate.job_id == job_id).order_by(Candidate.match_score.desc()).all()
