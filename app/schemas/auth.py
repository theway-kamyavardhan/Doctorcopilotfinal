from pydantic import AliasChoices, BaseModel, Field


class LoginRequest(BaseModel):
    identifier: str = Field(validation_alias=AliasChoices("identifier", "username", "email"))
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
