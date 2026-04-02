from fastapi import APIRouter

from app.api.v1.endpoints import admin, appointments, auth, cases, debug, doctors, patients, reports, system

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(debug.router, prefix="/debug", tags=["debug"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
