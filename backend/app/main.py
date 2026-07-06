from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import router as auth_router
from app.rooms import router as rooms_router
from app.teachers import router as teachers_router
from app.courses import router as courses_router
from app.schedules import router as schedules_router
from app.timetables import router as timetables_router
from app.curriculums import router as curriculums_router
from app.settings import router as settings_router
from app.audit_logs import router as audit_logs_router






app = FastAPI(title="Planovate API")

# ── CORS ─────────────────────────────────────────────────────────────────
# Restrict this to your actual frontend origin(s), not "*", once you know
# what the university server's domain/port will be.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(teachers_router)
app.include_router(courses_router)
app.include_router(schedules_router)
app.include_router(timetables_router)
app.include_router(curriculums_router)
app.include_router(settings_router)
app.include_router(audit_logs_router)


@app.get("/api")
async def health_check():
    return {"status": "ok", "message": "Planovate FastAPI backend running"}