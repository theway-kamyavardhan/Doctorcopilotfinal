from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.doctor import DoctorCreate, DoctorRead
from app.schemas.patient import PatientCreate, PatientRead
from app.schemas.user import UserRead
from app.services.auth import AuthService
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/register/patient", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
async def register_patient(payload: PatientCreate, db: AsyncSession = Depends(get_db)) -> PatientRead:
    return await AuthService(db).register_patient(payload)


@router.post("/register/doctor", response_model=DoctorRead, status_code=status.HTTP_201_CREATED)
async def register_doctor(payload: DoctorCreate, db: AsyncSession = Depends(get_db)) -> DoctorRead:
    return await AuthService(db).register_doctor(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    return await AuthService(db).login(payload)


@router.get("/me", response_model=UserRead)
async def get_me(current_user=Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
