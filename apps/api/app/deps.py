"""Authentification : le front envoie le JWT Supabase de l'utilisateur.

On vérifie la signature, puis on crée un client Supabase qui agit *en tant que*
cet utilisateur : toutes les requêtes passent par les politiques RLS.
"""
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException, status
from supabase import Client, create_client

from .config import Settings, get_settings


@dataclass
class CurrentUser:
    id: str
    token: str
    db: Client


def get_current_user(
    authorization: str = Header(..., description="Bearer <jwt Supabase>"),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Jeton manquant")
    token = authorization.split(" ", 1)[1]
    try:
        claims = jwt.decode(
            token, settings.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated"
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Jeton invalide") from exc

    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(token)
    return CurrentUser(id=claims["sub"], token=token, db=client)
