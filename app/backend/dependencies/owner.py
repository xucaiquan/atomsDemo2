"""项目归属身份解析：登录用户使用 JWT sub，匿名用户使用服务端签名 Cookie。"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials

from core.auth import AccessTokenError, decode_access_token
from dependencies.auth import bearer_scheme

ANON_COOKIE = "atoms_anon"
ANON_MAX_AGE = 180 * 24 * 60 * 60


@dataclass(frozen=True)
class OwnerIdentity:
    key: str
    anonymous_token: str | None = None


def _secret() -> bytes:
    value = os.environ.get("JWT_SECRET_KEY") or os.environ.get("SECRET_KEY")
    if not value:
        # 本地开发兜底；生产环境由平台注入 JWT_SECRET_KEY。
        value = "atoms-local-anonymous-cookie-secret"
    return value.encode("utf-8")


def _signature(nonce: str) -> str:
    return hmac.new(_secret(), nonce.encode("utf-8"), hashlib.sha256).hexdigest()


def create_anonymous_token() -> str:
    nonce = secrets.token_urlsafe(24)
    return f"{nonce}.{_signature(nonce)}"


def verify_anonymous_token(token: str) -> bool:
    try:
        nonce, signature = token.rsplit(".", 1)
    except ValueError:
        return False
    return bool(nonce) and hmac.compare_digest(_signature(nonce), signature)


async def get_owner_identity(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> OwnerIdentity:
    """返回不可由请求体伪造的稳定归属；匿名首次访问会生成待签发 token。"""
    if credentials and credentials.scheme.lower() == "bearer":
        try:
            payload = decode_access_token(credentials.credentials)
            subject = payload.get("sub")
            if subject:
                return OwnerIdentity(key=f"user:{subject}")
        except AccessTokenError:
            # 无效 Bearer 不降级复用其他人的身份，按新的匿名会话处理。
            pass

    token = request.cookies.get(ANON_COOKIE, "")
    if verify_anonymous_token(token):
        return OwnerIdentity(key=f"anon:{token}")
    token = create_anonymous_token()
    return OwnerIdentity(key=f"anon:{token}", anonymous_token=token)


def set_anonymous_cookie(response, identity: OwnerIdentity, request: Request) -> None:
    if not identity.anonymous_token:
        return
    response.set_cookie(
        ANON_COOKIE,
        identity.anonymous_token,
        max_age=ANON_MAX_AGE,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite="lax",
        path="/",
    )
