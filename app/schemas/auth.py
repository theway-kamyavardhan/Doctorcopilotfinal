from pydantic import AliasChoices, BaseModel, Field

from app.models.enums import UserRole


class LoginRequest(BaseModel):
    identifier: str = Field(validation_alias=AliasChoices("identifier", "username", "email"))
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
