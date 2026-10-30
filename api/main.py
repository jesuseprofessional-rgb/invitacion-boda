import secrets
import os
from fastapi import Depends, Header
import pymysql
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pymysql.cursors import DictCursor
from fastapi.security import APIKeyHeader
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import Request, Response


app = FastAPI(
    title="API de Invitaciones",
    description="Backend para gestionar y consultar invitaciones de boda",
    version="1.0.0",
    root_path="/api",
)
admin_key_header = APIKeyHeader(
    name="X-Admin-Key",
    auto_error=False,
)

class ResponsableCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    telefono: str | None = Field(default=None, max_length=30)
class InvitadoCrear(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    telefono: str | None = Field(default=None, max_length=25)
    responsable_id: int = Field(gt=0)
class AsistenciaActualizar(BaseModel):
    asistencia: str = Field(
        pattern="^(PENDIENTE|CONFIRMADO|DECLINADO)$"
    )
class TokenCrear(BaseModel):
    invitado_ids: list[int] = Field(min_length=1, max_length=20)
class AsistenciaInvitacion(BaseModel):
    invitado_id: int = Field(gt=0)
    asistencia: str = Field(
        pattern="^(CONFIRMADO|DECLINADO)$"
    )
class AdminLogin(BaseModel):
    password: str = Field(min_length=1, max_length=256)

def obtener_conexion():
    return pymysql.connect(
        host=os.environ["DB_HOST"],
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        database=os.environ["DB_NAME"],
        charset="utf8mb4",
        cursorclass=DictCursor,
        connect_timeout=5,
    )
def validar_origen_admin(request: Request):
    origen_configurado = os.environ.get("ADMIN_ALLOWED_ORIGIN")

    if not origen_configurado:
        raise HTTPException(
            status_code=503,
            detail="Origen administrativo no configurado",
        )

    origen_recibido = request.headers.get("origin")

    if (
        not origen_recibido
        or not secrets.compare_digest(
            origen_recibido,
            origen_configurado,
        )
    ):
        raise HTTPException(
            status_code=403,
            detail="Origen de solicitud no permitido",
        )


def verificar_admin(
    request: Request,
    x_admin_key: str | None = Depends(admin_key_header),
):
    clave_configurada = os.environ.get("ADMIN_API_KEY")

    # Compatibilidad con Swagger y herramientas administrativas.
    if (
        x_admin_key
        and clave_configurada
        and secrets.compare_digest(x_admin_key, clave_configurada)
    ):
        return True

    # Las solicitudes que modifican datos requieren validación de origen
    # cuando utilizan la sesión del navegador.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        validar_origen_admin(request)

    token = request.cookies.get("admin_session")

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Sesión administrativa no iniciada",
        )

    token_hash = hashlib.sha256(token.encode("utf-8")).digest()
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM admin_sessions
                WHERE token_hash = %s
                  AND revoked_at IS NULL
                  AND expires_at > UTC_TIMESTAMP()
                LIMIT 1
                """,
                (token_hash,),
            )

            sesion = cursor.fetchone()

        if not sesion:
            raise HTTPException(
                status_code=401,
                detail="La sesión ha expirado o fue revocada",
            )

        return True

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="No fue posible validar la sesión administrativa",
        )

    finally:
        if conexion:
            conexion.close()
def verificar_password_admin(password: str) -> bool:
    hash_configurado = os.environ.get("ADMIN_PASSWORD_HASH")

    if not hash_configurado:
        raise HTTPException(
            status_code=503,
            detail="Contraseña administrativa no configurada",
        )

    try:
        salt_hex, digest_hex = hash_configurado.split(":", 1)

        salt = bytes.fromhex(salt_hex)
        digest_esperado = bytes.fromhex(digest_hex)

        digest_recibido = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=2**14,
            r=8,
            p=1,
            dklen=64,
        )

        return secrets.compare_digest(
            digest_recibido,
            digest_esperado,
        )

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=503,
            detail="Configuración de contraseña administrativa inválida",
        )


@app.post("/admin/login")
def iniciar_sesion_admin(
    datos: AdminLogin,
    request: Request,
    response: Response,
):
    validar_origen_admin(request)

    if not verificar_password_admin(datos.password):
        raise HTTPException(
            status_code=401,
            detail="Contraseña incorrecta",
        )

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).digest()

    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    expiracion = ahora + timedelta(hours=8)

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO admin_sessions (
                    token_hash,
                    expires_at
                )
                VALUES (%s, %s)
                """,
                (token_hash, expiracion),
            )

        conexion.commit()

        response.set_cookie(
            key="admin_session",
            value=token,
            max_age=8 * 60 * 60,
            httponly=True,
            secure=True,
            samesite="strict",
            path="/",
        )

        return {
            "authenticated": True,
            "expires_in": 28800,
        }

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=503,
            detail="No fue posible iniciar la sesión",
        )

    finally:
        if conexion:
            conexion.close()


@app.get("/admin/session")
def consultar_sesion_admin(
    _: bool = Depends(verificar_admin),
):
    return {
        "authenticated": True,
    }


@app.post("/admin/logout")
def cerrar_sesion_admin(
    request: Request,
    response: Response,
):
    validar_origen_admin(request)

    token = request.cookies.get("admin_session")

    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).digest()
        conexion = None

        try:
            conexion = obtener_conexion()

            with conexion.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE admin_sessions
                    SET revoked_at = UTC_TIMESTAMP()
                    WHERE token_hash = %s
                      AND revoked_at IS NULL
                    """,
                    (token_hash,),
                )

            conexion.commit()

        except Exception:
            if conexion:
                conexion.rollback()

            raise HTTPException(
                status_code=503,
                detail="No fue posible cerrar la sesión",
            )

        finally:
            if conexion:
                conexion.close()

    response.delete_cookie(
        key="admin_session",
        path="/",
        secure=True,
        httponly=True,
        samesite="strict",
    )

    return {
        "authenticated": False,
        "mensaje": "Sesión cerrada correctamente",
    }
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "api-invitaciones",
    }


@app.get("/health/database")
def comprobar_base_datos():
    try:
        conexion = obtener_conexion()

        try:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT DATABASE() AS nombre")
                resultado = cursor.fetchone()

            return {
                "status": "ok",
                "database_connected": True,
                "database": resultado["nombre"],
            }
        finally:
            conexion.close()

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="No fue posible conectar con la base de datos",
        )

@app.get("/responsables")
def consultar_responsables(
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    r.id,
                    r.nombre,
                    r.telefono,
                    r.activo,
                    r.creado_en,
                    COUNT(i.id) AS total_invitados,
                    SUM(
                        CASE
                            WHEN i.asistencia = 'CONFIRMADO' THEN 1
                            ELSE 0
                        END
                    ) AS total_confirmados,
                    SUM(
                        CASE
                            WHEN i.asistencia = 'DECLINADO' THEN 1
                            ELSE 0
                        END
                    ) AS total_declinados
                FROM responsables AS r
                LEFT JOIN invitados AS i
                    ON i.responsable_id = r.id
                    AND i.activo = 1
                WHERE r.activo = 1
                GROUP BY
                    r.id,
                    r.nombre,
                    r.telefono,
                    r.activo,
                    r.creado_en
                ORDER BY r.nombre ASC
                """
            )

            responsables = cursor.fetchall()

        return {
            "total_responsables": len(responsables),
            "responsables": responsables,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los responsables",
        )

    finally:
        if conexion:
            conexion.close()
@app.post("/responsables", status_code=201)
def crear_responsable(
    responsable: ResponsableCrear,
    _: bool = Depends(verificar_admin),
):
    nombre = responsable.nombre.strip()
    telefono = (
        responsable.telefono.strip()
        if responsable.telefono
        else None
    )
    if len(nombre) < 2:
        raise HTTPException(
            status_code=422,
            detail="El nombre debe contener al menos 2 caracteres",
        )

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO responsables (nombre, telefono, activo)
                VALUES (%s, %s, 1)
                """,
                (nombre, telefono),
            )

            responsable_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT id, nombre, telefono, activo, creado_en
                FROM responsables
                WHERE id = %s
                """,
                (responsable_id,),
            )

            resultado = cursor.fetchone()

        conexion.commit()

        return {
            "mensaje": "Responsable registrado correctamente",
            "responsable": resultado,
        }

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar al responsable",
        )

    finally:
        if conexion:
            conexion.close()

@app.post("/invitados", status_code=201)
def crear_invitado(
    invitado: InvitadoCrear,
    _: bool = Depends(verificar_admin),
):
    nombre = invitado.nombre.strip()
    telefono = (
        invitado.telefono.strip()
        if invitado.telefono and invitado.telefono.strip()
        else None
    )

    if len(nombre) < 2:
        raise HTTPException(
            status_code=422,
            detail="El nombre debe contener al menos 2 caracteres",
        )

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM responsables
                WHERE id = %s AND activo = 1
                """,
                (invitado.responsable_id,),
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="El responsable no existe o está inactivo",
                )

            cursor.execute(
                """
                INSERT INTO invitados (
                    nombre,
                    telefono,
                    mesa,
                    responsable_id,
                    activo,
                    asistencia
                )
                VALUES (%s, %s, NULL, %s, 1, 'PENDIENTE')
                """,
                (
                    nombre,
                    telefono,
                    invitado.responsable_id,
                ),
            )

            invitado_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT
                    id,
                    nombre,
                    telefono,
                    mesa,
                    responsable_id,
                    activo,
                    asistencia,
                    creado_en
                FROM invitados
                WHERE id = %s
                """,
                (invitado_id,),
            )

            resultado = cursor.fetchone()

        conexion.commit()

        return {
            "mensaje": "Invitado registrado correctamente",
            "invitado": resultado,
        }

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar al invitado",
        )

    finally:
        if conexion:
            conexion.close()

@app.get("/responsables/{responsable_id}/invitados")
def consultar_invitados(
    responsable_id: int,
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, nombre
                FROM responsables
                WHERE id = %s AND activo = 1
                """,
                (responsable_id,),
            )
            responsable = cursor.fetchone()

            if not responsable:
                raise HTTPException(
                    status_code=404,
                    detail="El responsable no existe o está inactivo",
                )

            cursor.execute(
                """
                SELECT
                    id,
                    nombre,
                    telefono,
                    mesa,
                    asistencia,
                    creado_en
                FROM invitados
                WHERE responsable_id = %s AND activo = 1
                ORDER BY nombre
                """,
                (responsable_id,),
            )

            invitados = cursor.fetchall()

        return {
            "responsable": {
                "id": responsable["id"],
                "nombre": responsable["nombre"],
            },
            "total_invitados": len(invitados),
            "invitados": invitados,
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los invitados",
        )

    finally:
        if conexion:
            conexion.close()

@app.patch("/invitados/{invitado_id}/asistencia")
def actualizar_asistencia(
    invitado_id: int,
    datos: AsistenciaActualizar,
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM invitados
                WHERE id = %s AND activo = 1
                """,
                (invitado_id,),
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="El invitado no existe o está inactivo",
                )

            cursor.execute(
                """
                UPDATE invitados
                SET asistencia = %s
                WHERE id = %s
                """,
                (datos.asistencia, invitado_id),
            )

            cursor.execute(
                """
                SELECT
                    id,
                    nombre,
                    telefono,
                    mesa,
                    responsable_id,
                    asistencia
                FROM invitados
                WHERE id = %s
                """,
                (invitado_id,),
            )

            invitado = cursor.fetchone()

        conexion.commit()

        return {
            "mensaje": "Asistencia actualizada correctamente",
            "invitado": invitado,
        }

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible actualizar la asistencia",
        )

    finally:
        if conexion:
            conexion.close()

@app.post("/tokens", status_code=201)
def crear_token(
    datos: TokenCrear,
    _: bool = Depends(verificar_admin),
):
    # Evitar IDs repetidos en la misma invitación.
    if len(datos.invitado_ids) != len(set(datos.invitado_ids)):
        raise HTTPException(
            status_code=422,
            detail="La lista contiene IDs de invitados repetidos",
        )

    conexion = None

    try:
        # El token original se genera una sola vez.
        token = secrets.token_urlsafe(32)

        # Solo almacenaremos su hash binario SHA-256.
        token_hash = hashlib.sha256(
            token.encode("utf-8")
        ).digest()

        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            marcadores = ", ".join(
                ["%s"] * len(datos.invitado_ids)
            )

            cursor.execute(
                f"""
                SELECT id
                FROM invitados
                WHERE id IN ({marcadores})
                  AND activo = 1
                """,
                tuple(datos.invitado_ids),
            )

            invitados_encontrados = {
                fila["id"]
                for fila in cursor.fetchall()
            }

            if invitados_encontrados != set(datos.invitado_ids):
                raise HTTPException(
                    status_code=404,
                    detail=(
                        "Uno o más invitados no existen "
                        "o están inactivos"
                    ),
                )

            cursor.execute(
                """
                INSERT INTO tokens_invitacion (
                    token_hash,
                    activo
                )
                VALUES (%s, 1)
                """,
                (token_hash,),
            )

            token_id = cursor.lastrowid

            cursor.executemany(
                """
                INSERT INTO invitacion_invitados (
                    token_id,
                    invitado_id
                )
                VALUES (%s, %s)
                """,
                [
                    (token_id, invitado_id)
                    for invitado_id in datos.invitado_ids
                ],
            )

        conexion.commit()

        base_url = os.environ.get(
            "PUBLIC_INVITATION_BASE_URL",
            "https://invitacion-erick-yolanda.cworks.cc",
        ).rstrip("/")

        return {
            "mensaje": "Token de invitación creado correctamente",
            "token_id": token_id,
            "token": token,
            "url_invitacion": f"{base_url}/?token={token}",
            "invitado_ids": datos.invitado_ids,
        }
    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible crear el token de invitación",
        )

    finally:
        if conexion:
            conexion.close()


@app.get("/invitacion/{token}")
def consultar_invitacion(token: str):
    # Rechazar tokens vacíos o excesivamente largos.
    if not token or len(token) > 200:
        raise HTTPException(
            status_code=404,
            detail="Invitación no válida o revocada",
        )

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).digest()

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id
                FROM tokens_invitacion
                WHERE token_hash = %s
                  AND activo = 1
                  AND revocado_en IS NULL
                """,
                (token_hash,),
            )

            registro_token = cursor.fetchone()

            if not registro_token:
                raise HTTPException(
                    status_code=404,
                    detail="Invitación no válida o revocada",
                )

            cursor.execute(
                """
                SELECT
                    i.id,
                    i.nombre,
                    i.asistencia
                FROM invitacion_invitados AS ii
                INNER JOIN invitados AS i
                    ON i.id = ii.invitado_id
                WHERE ii.token_id = %s
                  AND i.activo = 1
                ORDER BY i.nombre
                """,
                (registro_token["id"],),
            )

            invitados = cursor.fetchall()

        if not invitados:
            raise HTTPException(
                status_code=404,
                detail="La invitación no tiene invitados activos",
            )

        return {
            "invitados": invitados,
            "total_invitados": len(invitados),
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar la invitación",
        )

    finally:
        if conexion:
            conexion.close()


@app.patch("/invitacion/{token}/asistencia")
def responder_invitacion(
    token: str,
    datos: AsistenciaInvitacion,
):
    if not token or len(token) > 200:
        raise HTTPException(
            status_code=404,
            detail="Invitación no válida o invitado no autorizado",
        )

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).digest()

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            # Validar que el token exista y siga activo.
            cursor.execute(
                """
                SELECT id
                FROM tokens_invitacion
                WHERE token_hash = %s
                  AND activo = 1
                  AND revocado_en IS NULL
                """,
                (token_hash,),
            )

            registro_token = cursor.fetchone()

            if not registro_token:
                raise HTTPException(
                    status_code=404,
                    detail="Invitación no válida o invitado no autorizado",
                )

            # Verificar que el invitado pertenezca a este enlace.
            cursor.execute(
                """
                SELECT i.id, i.nombre
                FROM invitacion_invitados AS ii
                INNER JOIN invitados AS i
                    ON i.id = ii.invitado_id
                WHERE ii.token_id = %s
                  AND i.id = %s
                  AND i.activo = 1
                """,
                (
                    registro_token["id"],
                    datos.invitado_id,
                ),
            )

            invitado = cursor.fetchone()

            if not invitado:
                raise HTTPException(
                    status_code=404,
                    detail="Invitación no válida o invitado no autorizado",
                )

            cursor.execute(
                """
                UPDATE invitados
                SET asistencia = %s
                WHERE id = %s
                """,
                (
                    datos.asistencia,
                    datos.invitado_id,
                ),
            )

            cursor.execute(
                """
                SELECT id, nombre, asistencia
                FROM invitados
                WHERE id = %s
                """,
                (datos.invitado_id,),
            )

            resultado = cursor.fetchone()

        conexion.commit()

        return {
            "mensaje": "Respuesta de asistencia registrada correctamente",
            "invitado": resultado,
        }

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible registrar la respuesta",
        )

    finally:
        if conexion:
            conexion.close()


@app.patch("/tokens/{token_id}/revocar")
def revocar_token(
    token_id: int,
    _: bool = Depends(verificar_admin),
):
    if token_id <= 0:
        raise HTTPException(
            status_code=422,
            detail="El ID del token debe ser mayor que cero",
        )

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, activo, revocado_en
                FROM tokens_invitacion
                WHERE id = %s
                """,
                (token_id,),
            )

            token = cursor.fetchone()

            if not token:
                raise HTTPException(
                    status_code=404,
                    detail="El token no existe",
                )

            if not token["activo"] or token["revocado_en"] is not None:
                raise HTTPException(
                    status_code=409,
                    detail="El token ya fue revocado",
                )

            cursor.execute(
                """
                UPDATE tokens_invitacion
                SET activo = 0,
                    revocado_en = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (token_id,),
            )

        conexion.commit()

        return {
            "mensaje": "Token revocado correctamente",
            "token_id": token_id,
            "activo": False,
        }

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible revocar el token",
        )

    finally:
        if conexion:
            conexion.close()


@app.get("/tokens")
def consultar_tokens(
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    t.id,
                    t.activo,
                    t.creado_en,
                    t.revocado_en,
                    COUNT(
                        CASE WHEN i.activo = 1 THEN i.id END
                    ) AS total_invitados,
                    GROUP_CONCAT(
                        CASE WHEN i.activo = 1 THEN i.nombre END
                        ORDER BY i.nombre
                        SEPARATOR ', '
                    ) AS nombres_invitados
                FROM tokens_invitacion AS t
                LEFT JOIN invitacion_invitados AS ii
                    ON ii.token_id = t.id
                LEFT JOIN invitados AS i
                    ON i.id = ii.invitado_id
                GROUP BY
                    t.id,
                    t.activo,
                    t.creado_en,
                    t.revocado_en
                ORDER BY t.creado_en DESC
                """
            )

            tokens = cursor.fetchall()

        return {
            "total_tokens": len(tokens),
            "tokens": tokens,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los tokens",
        )

    finally:
        if conexion:
            conexion.close()

