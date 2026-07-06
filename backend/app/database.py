from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.database_name]

# Collections, one handle per collection, reused everywhere
users_collection = db["users"]
rooms_collection = db["rooms"]
teachers_collection = db["teachers"]
courses_collection = db["courses"]