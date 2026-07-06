from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime

from app.models import RoomCreate, RoomOut
from app.database import rooms_collection
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/rooms", tags=["rooms"])

DEFAULT_AVAILABILITY = {
    "day": {
        "mon": {"time": []}, "tue": {"time": []}, "wed": {"time": []},
        "thu": {"time": []}, "fri": {"time": []}, "sat": {"time": []},
    }
}


def room_to_out(doc: dict) -> RoomOut:
    return RoomOut(
        unid=doc["unid"],
        ID=doc.get("ID", ""),
        name=doc["name"],
        capacity=doc["capacity"],
        floor=doc.get("floor", ""),
        faculty=doc.get("faculty", ""),
        availability=doc.get("availability", DEFAULT_AVAILABILITY),
    )


@router.get("", response_model=list[RoomOut])
async def list_rooms(faculty: str | None = None, user: dict = Depends(get_current_user)):
    query = {}
    if faculty:
        query["faculty"] = {"$regex": f"^{faculty}$", "$options": "i"}  # case-insensitive exact match
    rooms = await rooms_collection.find(query).to_list(length=None)
    return [room_to_out(r) for r in rooms]


@router.get("/faculties", response_model=list[str])
async def list_faculties(user: dict = Depends(get_current_user)):
    faculties = await rooms_collection.distinct("faculty")
    return sorted(f for f in faculties if f)


@router.post("", response_model=RoomOut, status_code=201)
async def upsert_room(
    payload: RoomCreate,
    user: dict = Depends(require_role("admin", "tt_incharge")),
):
    unid = payload.unid or int(datetime.utcnow().timestamp() * 1000)

    doc = {
        "_id": unid,
        "unid": unid,
        "ID": payload.ID.strip(),
        "name": payload.name.strip(),
        "capacity": payload.capacity,
        "floor": payload.floor.strip(),
        "faculty": payload.faculty.strip(),
        "availability": payload.availability or DEFAULT_AVAILABILITY,
    }

    existing = await rooms_collection.find_one({"_id": unid})
    if existing:
        # can't touch _id on update, so exclude it from the $set
        update_fields = {k: v for k, v in doc.items() if k != "_id"}
        await rooms_collection.update_one({"_id": unid}, {"$set": update_fields})
    else:
        await rooms_collection.insert_one(doc)

    saved = await rooms_collection.find_one({"_id": unid})
    return room_to_out(saved)


@router.delete("/{unid}", status_code=204)
async def delete_room(unid: int, user: dict = Depends(require_role("admin", "tt_incharge"))):
    result = await rooms_collection.delete_one({"_id": unid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Room not found")