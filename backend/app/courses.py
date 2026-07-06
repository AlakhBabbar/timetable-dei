from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from app.models import CourseCreate, CourseOut
from app.database import courses_collection
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/courses", tags=["courses"])


def course_to_out(doc: dict) -> CourseOut:
    return CourseOut(
        unid=doc["unid"],
        ID=doc.get("ID", ""),
        name=doc["name"],
        code=doc.get("code", ""),
        credits=doc.get("credits", ""),
        teachers=doc.get("teachers", []),
        faculty=doc.get("faculty", ""),
        department=doc.get("department", ""),
        semester=doc.get("semester", ""),
    )


@router.get("", response_model=list[CourseOut])
async def list_courses(
    faculty: str | None = None,
    department: str | None = None,
    semester: str | None = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if faculty:
        query["faculty"] = {"$regex": f"^{faculty}$", "$options": "i"}
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if semester:
        query["semester"] = {"$regex": f"^{semester}$", "$options": "i"}
    courses = await courses_collection.find(query).to_list(length=None)
    return [course_to_out(c) for c in courses]


@router.get("/departments", response_model=list[str])
async def list_departments(faculty: str, user: dict = Depends(get_current_user)):
    departments = await courses_collection.distinct(
        "department", {"faculty": {"$regex": f"^{faculty}$", "$options": "i"}}
    )
    return sorted(d for d in departments if d)


@router.get("/semesters", response_model=list[str])
async def list_semesters(
    faculty: str,
    department: str,
    user: dict = Depends(get_current_user),
):
    semesters = await courses_collection.distinct(
        "semester",
        {
            "faculty": {"$regex": f"^{faculty}$", "$options": "i"},
            "department": {"$regex": f"^{department}$", "$options": "i"},
        },
    )
    return sorted(s for s in semesters if s)


@router.post("", response_model=CourseOut, status_code=201)
async def upsert_course(
    payload: CourseCreate,
    user: dict = Depends(require_role("admin", "tt_incharge")),
):
    unid = payload.unid or int(datetime.utcnow().timestamp() * 1000)

    doc = {
        "_id": unid,
        "unid": unid,
        "ID": payload.ID.strip(),
        "name": payload.name.strip(),
        "code": payload.code.strip(),
        "credits": payload.credits.strip(),
        "teachers": payload.teachers,
        "faculty": payload.faculty.strip(),
        "department": payload.department.strip(),
        "semester": payload.semester.strip(),
    }

    existing = await courses_collection.find_one({"_id": unid})
    if existing:
        update_fields = {k: v for k, v in doc.items() if k != "_id"}
        await courses_collection.update_one({"_id": unid}, {"$set": update_fields})
    else:
        await courses_collection.insert_one(doc)

    saved = await courses_collection.find_one({"_id": unid})
    return course_to_out(saved)


@router.delete("/{unid}", status_code=204)
async def delete_course(unid: int, user: dict = Depends(require_role("admin", "tt_incharge"))):
    result = await courses_collection.delete_one({"_id": unid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")