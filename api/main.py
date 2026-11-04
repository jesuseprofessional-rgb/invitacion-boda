import hashlib
import os
import secrets

from datetime import datetime, timedelta, timezone

import pymysql

from cryptography.fernet import Fernet, InvalidToken

from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    Response,
)

from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from pymysql.cursors import DictCursor

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


def obtener_cifrador_pases():
    clave = os.environ.get("PASES_ENCRYPTION_KEY")

    if not clave:
        raise RuntimeError(
            "No está configurada la clave de cifrado de los pases"
        )

    try:
        return Fernet(clave.encode("utf-8"))

    except (ValueError, TypeError):
        raise RuntimeError(
            "La clave de cifrado de los pases no es válida"
        )


def cifrar_token_pase(token: str) -> bytes:
    return obtener_cifrador_pases().encrypt(
        token.encode("utf-8")
    )


def descifrar_token_pase(token_cifrado: bytes) -> str:
    return obtener_cifrador_pases().decrypt(
        token_cifrado
    ).decode("utf-8") 


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
    tipo: str = Field(pattern="^(RESPONSABLE|INDIVIDUAL)$")
    responsable_id: int | None = Field(default=None, gt=0)
    invitado_ids: list[int] | None = Field(default=None, min_length=1, max_length=100)
class AsistenciaInvitacion(BaseModel):
    invitado_id: int = Field(gt=0)
    asistencia: str = Field(
        pattern="^(CONFIRMADO|DECLINADO)$"
    )
class AdminLogin(BaseModel):
    password: str = Field(min_length=1, max_length=256)

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
@app.get("/invitados")
def consultar_todos_invitados(
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    i.id,
                    i.nombre,
                    i.telefono,
                    i.mesa,
                    i.responsable_id,
                    r.nombre AS responsable_nombre,
                    i.asistencia,
                    i.creado_en
                FROM invitados AS i
                INNER JOIN responsables AS r
                    ON r.id = i.responsable_id
                WHERE i.activo = 1
                ORDER BY r.nombre ASC, i.nombre ASC
                """
            )

            invitados = cursor.fetchall()

        total = len(invitados)

        confirmados = sum(
            1 for invitado in invitados
            if invitado["asistencia"] == "CONFIRMADO"
        )

        declinados = sum(
            1 for invitado in invitados
            if invitado["asistencia"] == "DECLINADO"
        )

        pendientes = sum(
            1 for invitado in invitados
            if invitado["asistencia"] == "PENDIENTE"
        )

        return {
            "total_invitados": total,
            "total_confirmados": confirmados,
            "total_declinados": declinados,
            "total_pendientes": pendientes,
            "invitados": invitados,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los invitados",
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
    # Validar la combinación de datos recibida.
    if datos.tipo == "RESPONSABLE":
        if not datos.responsable_id:
            raise HTTPException(
                status_code=422,
                detail="Se requiere responsable_id para un enlace grupal",
            )

        if datos.invitado_ids:
            raise HTTPException(
                status_code=422,
                detail="Un enlace grupal no debe recibir invitado_ids",
            )

    elif datos.tipo == "INDIVIDUAL":
        if datos.responsable_id is not None:
            raise HTTPException(
                status_code=422,
                detail="Un enlace individual no debe recibir responsable_id",
            )

        if not datos.invitado_ids or len(datos.invitado_ids) != 1:
            raise HTTPException(
                status_code=422,
                detail="Un enlace individual requiere exactamente un invitado",
            )

    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:

            if datos.tipo == "RESPONSABLE":
                # Bloquear el responsable durante la generación.
                cursor.execute(
                    """
                    SELECT id
                    FROM responsables
                    WHERE id = %s AND activo = 1
                    FOR UPDATE
                    """,
                    (datos.responsable_id,),
                )

                responsable = cursor.fetchone()

                if not responsable:
                    raise HTTPException(
                        status_code=404,
                        detail="El responsable no existe o está inactivo",
                    )

                # Obtener todos sus invitados activos.
                cursor.execute(
                    """
                    SELECT id
                    FROM invitados
                    WHERE responsable_id = %s
                      AND activo = 1
                    ORDER BY id
                    """,
                    (datos.responsable_id,),
                )

                invitados = cursor.fetchall()

                if not invitados:
                    raise HTTPException(
                        status_code=409,
                        detail="El responsable todavía no tiene invitados activos",
                    )

                invitado_ids = [
                    invitado["id"]
                    for invitado in invitados
                ]

                # Revocar cualquier enlace grupal anterior.
                cursor.execute(
                    """
                    UPDATE tokens_invitacion
                    SET activo = 0,
                        revocado_en = CURRENT_TIMESTAMP
                    WHERE responsable_id = %s
                      AND tipo = 'RESPONSABLE'
                      AND activo = 1
                      AND revocado_en IS NULL
                    """,
                    (datos.responsable_id,),
                )

            else:
                invitado_id = datos.invitado_ids[0]

                # Bloquear el invitado durante la generación.
                cursor.execute(
                    """
                    SELECT id
                    FROM invitados
                    WHERE id = %s AND activo = 1
                    FOR UPDATE
                    """,
                    (invitado_id,),
                )

                invitado = cursor.fetchone()

                if not invitado:
                    raise HTTPException(
                        status_code=404,
                        detail="El invitado no existe o está inactivo",
                    )

                invitado_ids = [invitado_id]

                # Revocar cualquier enlace individual anterior.
                cursor.execute(
                    """
                    UPDATE tokens_invitacion AS t
                    INNER JOIN invitacion_invitados AS ii
                        ON ii.token_id = t.id
                    SET t.activo = 0,
                        t.revocado_en = CURRENT_TIMESTAMP
                    WHERE ii.invitado_id = %s
                      AND t.tipo = 'INDIVIDUAL'
                      AND t.activo = 1
                      AND t.revocado_en IS NULL
                    """,
                    (invitado_id,),
                )

            # Generar el token. Solo se almacena su hash.
            token = secrets.token_urlsafe(32)

            token_hash = hashlib.sha256(
                token.encode("utf-8")
            ).digest()

            cursor.execute(
                """
                INSERT INTO tokens_invitacion (
                    token_hash,
                    tipo,
                    responsable_id,
                    activo
                )
                VALUES (%s, %s, %s, 1)
                """,
                (
                    token_hash,
                    datos.tipo,
                    datos.responsable_id,
                ),
            )

            token_id = cursor.lastrowid

            # Guardar las relaciones iniciales.
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
                    for invitado_id in invitado_ids
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
            "tipo": datos.tipo,
            "responsable_id": datos.responsable_id,
            "token": token,
            "url_invitacion": f"{base_url}/?token={token}",
            "invitado_ids": invitado_ids,
            "total_invitados": len(invitado_ids),
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

            # Validar el token de invitación.
            cursor.execute(
                """
                SELECT
                    t.id,
                    t.tipo,
                    t.responsable_id
                FROM tokens_invitacion AS t
                LEFT JOIN responsables AS r
                    ON r.id = t.responsable_id
                WHERE t.token_hash = %s
                  AND t.activo = 1
                  AND t.revocado_en IS NULL
                  AND (
                      t.tipo = 'INDIVIDUAL'
                      OR (
                          t.tipo = 'RESPONSABLE'
                          AND r.activo = 1
                      )
                  )
                LIMIT 1
                """,
                (token_hash,),
            )

            registro_token = cursor.fetchone()

            if not registro_token:
                raise HTTPException(
                    status_code=404,
                    detail="Invitación no válida o revocada",
                )

            # Consultar invitados de una invitación grupal.
            if registro_token["tipo"] == "RESPONSABLE":

                cursor.execute(
                    """
                    SELECT
                        i.id,
                        i.nombre,
                        i.asistencia,
                        p.token_cifrado
                    FROM invitados AS i
                    LEFT JOIN pases_acceso AS p
                        ON p.invitado_id = i.id
                       AND p.activo = 1
                       AND p.revocado_en IS NULL
                       AND i.asistencia = 'CONFIRMADO'
                    WHERE i.responsable_id = %s
                      AND i.activo = 1
                    ORDER BY i.nombre
                    """,
                    (registro_token["responsable_id"],),
                )

            # Consultar invitados de una invitación individual.
            else:

                cursor.execute(
                    """
                    SELECT
                        i.id,
                        i.nombre,
                        i.asistencia,
                        p.token_cifrado
                    FROM invitacion_invitados AS ii
                    INNER JOIN invitados AS i
                        ON i.id = ii.invitado_id
                    LEFT JOIN pases_acceso AS p
                        ON p.invitado_id = i.id
                       AND p.activo = 1
                       AND p.revocado_en IS NULL
                       AND i.asistencia = 'CONFIRMADO'
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

        # Recuperar el token de cada pase confirmado.
        for invitado in invitados:

            token_cifrado = invitado.pop(
                "token_cifrado",
                None,
            )

            invitado["pase_token"] = None

            if token_cifrado:
                try:
                    invitado["pase_token"] = (
                        descifrar_token_pase(token_cifrado)
                    )

                except InvalidToken:
                    raise HTTPException(
                        status_code=500,
                        detail="No fue posible recuperar el pase digital",
                    )

        return {
            "tipo": registro_token["tipo"],
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
            # Bloquear el token mientras se procesa la respuesta.
            cursor.execute(
                """
                SELECT
                    t.id,
                    t.tipo,
                    t.responsable_id
                FROM tokens_invitacion AS t
                LEFT JOIN responsables AS r
                    ON r.id = t.responsable_id
                WHERE t.token_hash = %s
                  AND t.activo = 1
                  AND t.revocado_en IS NULL
                  AND (
                      t.tipo = 'INDIVIDUAL'
                      OR (
                          t.tipo = 'RESPONSABLE'
                          AND r.activo = 1
                      )
                  )
                LIMIT 1
                FOR UPDATE
                """,
                (token_hash,),
            )

            registro_token = cursor.fetchone()

            if not registro_token:
                raise HTTPException(
                    status_code=404,
                    detail="Invitación no válida o invitado no autorizado",
                )

            if registro_token["tipo"] == "RESPONSABLE":
                cursor.execute(
                    """
                    SELECT id, nombre
                    FROM invitados
                    WHERE id = %s
                      AND responsable_id = %s
                      AND activo = 1
                    FOR UPDATE
                    """,
                    (
                        datos.invitado_id,
                        registro_token["responsable_id"],
                    ),
                )

            else:
                cursor.execute(
                    """
                    SELECT i.id, i.nombre
                    FROM invitacion_invitados AS ii
                    INNER JOIN invitados AS i
                        ON i.id = ii.invitado_id
                    WHERE ii.token_id = %s
                      AND i.id = %s
                      AND i.activo = 1
                    FOR UPDATE
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
        t.tipo,
        t.responsable_id,
        r.nombre AS responsable_nombre,
        t.activo,
        t.creado_en,
        t.revocado_en,

        CASE
            WHEN t.tipo = 'RESPONSABLE' THEN (
                SELECT COUNT(*)
                FROM invitados AS i
                WHERE i.responsable_id = t.responsable_id
                  AND i.activo = 1
            )
            ELSE (
                SELECT COUNT(*)
                FROM invitacion_invitados AS ii
                INNER JOIN invitados AS i
                    ON i.id = ii.invitado_id
                WHERE ii.token_id = t.id
                  AND i.activo = 1
            )
        END AS total_invitados,

        CASE
            WHEN t.tipo = 'RESPONSABLE' THEN (
                SELECT GROUP_CONCAT(
                    i.nombre
                    ORDER BY i.nombre
                    SEPARATOR ', '
                )
                FROM invitados AS i
                WHERE i.responsable_id = t.responsable_id
                  AND i.activo = 1
            )
            ELSE (
                SELECT GROUP_CONCAT(
                    i.nombre
                    ORDER BY i.nombre
                    SEPARATOR ', '
                )
                FROM invitacion_invitados AS ii
                INNER JOIN invitados AS i
                    ON i.id = ii.invitado_id
                WHERE ii.token_id = t.id
                  AND i.activo = 1
            )
        END AS nombres_invitados

    FROM tokens_invitacion AS t

    LEFT JOIN responsables AS r
        ON r.id = t.responsable_id

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


@app.post("/pases", status_code=201)
@app.post("/pases", status_code=201)
def generar_pases(
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()
        pases_generados = []

        with conexion.cursor() as cursor:

            # Bloquear los invitados confirmados.
            # Esto serializa la generación de sus pases.
            cursor.execute(
                """
                SELECT
                    i.id AS invitado_id,
                    i.nombre,
                    i.mesa,
                    i.asistencia,
                    r.nombre AS responsable_nombre
                FROM invitados AS i
                INNER JOIN responsables AS r
                    ON r.id = i.responsable_id
                WHERE i.activo = 1
                  AND i.asistencia = 'CONFIRMADO'
                ORDER BY i.id
                FOR UPDATE
                """
            )

            invitados = cursor.fetchall()

            for invitado in invitados:

                # Comprobar si ya tiene un pase activo.
                cursor.execute(
                    """
                    SELECT id
                    FROM pases_acceso
                    WHERE invitado_id = %s
                      AND activo = 1
                      AND revocado_en IS NULL
                    LIMIT 1
                    """,
                    (invitado["invitado_id"],),
                )

                if cursor.fetchone():
                    continue

                # Generar credencial individual.
                token = secrets.token_urlsafe(32)

                token_hash = hashlib.sha256(
                    token.encode("utf-8")
                ).digest()

                token_cifrado = cifrar_token_pase(token)

                cursor.execute(
                    """
                    INSERT INTO pases_acceso (
                        invitado_id,
                        token_hash,
                        token_cifrado,
                        activo
                    )
                    VALUES (%s, %s, %s, 1)
                    """,
                    (
                        invitado["invitado_id"],
                        token_hash,
                        token_cifrado,
                    ),
                )

                pases_generados.append({
                    "pase_id": cursor.lastrowid,
                    "invitado_id": invitado["invitado_id"],
                    "nombre": invitado["nombre"],
                    "mesa": invitado["mesa"],
                    "responsable_nombre": invitado["responsable_nombre"],
                    "token": token,
                })

        conexion.commit()

        return {
            "mensaje": "Pases generados correctamente",
            "total_generados": len(pases_generados),
            "pases": pases_generados,
        }

    except HTTPException:
        if conexion:
            conexion.rollback()
        raise

    except pymysql.err.IntegrityError:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=409,
            detail="Conflicto al generar los pases de acceso",
        )

    except Exception:
        if conexion:
            conexion.rollback()

        raise HTTPException(
            status_code=500,
            detail="No fue posible generar los pases de acceso",
        )

    finally:
        if conexion:
            conexion.close()
@app.get("/pases")
def consultar_pases(
    _: bool = Depends(verificar_admin),
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    p.id AS pase_id,
                    p.invitado_id,
                    i.nombre,
                    i.mesa,
                    i.asistencia,
                    i.activo AS invitado_activo,
                    r.nombre AS responsable_nombre,
                    p.activo AS pase_activo,
                    p.creado_en,
                    p.revocado_en,
                    p.registrado_en
                FROM pases_acceso AS p
                INNER JOIN invitados AS i
                    ON i.id = p.invitado_id
                INNER JOIN responsables AS r
                    ON r.id = i.responsable_id
                ORDER BY p.creado_en DESC
                """
            )

            pases = cursor.fetchall()

        return {
            "total_pases": len(pases),
            "pases": pases,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="No fue posible consultar los pases de acceso",
        )

    finally:
        if conexion:
            conexion.close()
@app.patch("/pases/{pase_id}/revocar")
def revocar_pase(
    pase_id: int,
    _: bool = Depends(verificar_admin)
):
    conexion = None

    try:
        conexion = obtener_conexion()

        with conexion.cursor() as cursor:
            cursor.execute("""
                SELECT id, activo, revocado_en
                FROM pases_acceso
                WHERE id = %s
                FOR UPDATE
            """, (pase_id,))

            pase = cursor.fetchone()

            if not pase:
                raise HTTPException(
                    status_code=404,
                    detail="Pase no encontrado"
                )

            if not pase["activo"] or pase["revocado_en"] is not None:
                raise HTTPException(
                    status_code=409,
                    detail="El pase ya está revocado"
                )

            cursor.execute("""
                UPDATE pases_acceso
                SET activo = 0,
                    revocado_en = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (pase_id,))

        conexion.commit()

        return {
            "mensaje": "Pase revocado correctamente",
            "pase_id": pase_id
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
            detail="Error al revocar el pase"
        )

    finally:
        if conexion:
            conexion.close()