from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# ── What a client sends when registering ────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # "admin", "hod", "teacher", "tt_incharge", "student"
    faculty: Optional[str] = ""
    department: Optional[str] = ""

# ── What a client sends when logging in ─────────────────────────────────
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ── What the API sends back, never includes the password ────────────────
class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    faculty: str = ""
    department: str = ""
    created_at: datetime

# ── What actually gets stored in MongoDB ─────────────────────────────────
class UserInDB(BaseModel):
    email: str
    password: str  # hashed, never plaintext
    name: str
    role: str
    faculty: str = ""
    department: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ── Token response after successful login/register ───────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Rooms ──────────────────────────────────────────────────────────────────
class DayAvailability(BaseModel):
    time: list[str] = []

class Availability(BaseModel):
    mon: DayAvailability = DayAvailability()
    tue: DayAvailability = DayAvailability()
    wed: DayAvailability = DayAvailability()
    thu: DayAvailability = DayAvailability()
    fri: DayAvailability = DayAvailability()
    sat: DayAvailability = DayAvailability()

class RoomCreate(BaseModel):
    unid: Optional[int] = None   # if not given, we generate one
    ID: str = ""
    name: str
    capacity: int
    floor: str = ""
    faculty: str = ""
    availability: Optional[dict] = None  # {"day": {"mon": {"time": []}, ...}}

class RoomOut(BaseModel):
    unid: int
    ID: str = ""
    name: str
    capacity: int
    floor: str = ""
    faculty: str = ""
    availability: dict


# ── Teachers ─────────────────────────────────────────────────────────────
class TeacherCreate(BaseModel):
    unid: Optional[int] = None
    ID: str = ""
    name: str
    faculty: str = ""
    department: str = ""

class TeacherOut(BaseModel):
    unid: int
    ID: str = ""
    name: str
    faculty: str = ""
    department: str = ""

# ── Courses ──────────────────────────────────────────────────────────────
class CourseCreate(BaseModel):
    unid: Optional[int] = None
    ID: str = ""
    name: str
    code: str = ""
    credits: str = ""
    teachers: list[int] = []   # list of teacher unids
    faculty: str = ""
    department: str = ""
    semester: str = ""

class CourseOut(BaseModel):
    unid: int
    ID: str = ""
    name: str
    code: str = ""
    credits: str = ""
    teachers: list[int] = []
    faculty: str = ""
    department: str = ""
    semester: str = ""