const API_BASE = "/api";

const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("admin-password");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");

const logoutButton = document.getElementById("logout-button");
const dashboardMessage = document.getElementById("dashboard-message");

const homeView = document.getElementById("home-view");
const responsablesView = document.getElementById("responsables-view");

const invitadosView = document.getElementById("invitados-view");

const invitadosForm = document.getElementById("invitados-form");
const invitadosResponsableSelect = document.getElementById(
    "invitados-responsable"
);
const invitadosFields = document.getElementById("invitados-fields");
const invitadosFormMessage = document.getElementById(
    "invitados-form-message"
);
const invitadosResultados = document.getElementById(
    "invitados-resultados"
);
const registrarInvitadosButton = document.getElementById(
    "registrar-invitados-button"
);
const invitadosGeneralTable = document.getElementById(
    "invitados-general-table"
);

let invitadosActuales = [];

const responsableForm = document.getElementById("responsable-form");
const responsableSubmit = document.getElementById("responsable-submit");
const responsableMessage = document.getElementById("responsable-message");

const responsablesTableBody = document.getElementById(
    "responsables-table-body"
);

const invitadosResponsableCard = document.getElementById(
    "invitados-responsable-card"
);

const invitadosTableBody = document.getElementById(
    "invitados-table-body"
);

let responsablesActuales = [];

// --------------------------------------------------
// Utilidades de interfaz
// --------------------------------------------------

function mostrarLogin() {
    dashboardScreen.hidden = true;
    loginScreen.hidden = false;
}

function mostrarDashboard() {
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
    mostrarInicio();
}

function mostrarInicio() {
    homeView.hidden = false;
    responsablesView.hidden = true;
    invitadosView.hidden = true;
    invitadosResponsableCard.hidden = true;
}

function mostrarResponsables() {
    homeView.hidden = true;
    responsablesView.hidden = false;
    invitadosView.hidden = true;

    cargarResponsables();
}

function mostrarInvitados() {
    homeView.hidden = true;
    responsablesView.hidden = true;
    invitadosView.hidden = false;

    cargarResponsablesSelect();
    cargarTodosInvitados();
}

function mostrarError(mensaje) {
    loginError.textContent = mensaje;
}

function mostrarMensaje(elemento, mensaje, tipo = "") {
    elemento.textContent = mensaje;
    elemento.className = `message ${tipo}`;
}

function limpiarMensaje(elemento) {
    elemento.textContent = "";
    elemento.className = "message";
}

async function solicitarAPI(ruta, opciones = {}) {
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        credentials: "same-origin",
        ...opciones,
        headers: {
            ...(opciones.headers || {})
        }
    });

    let datos = {};

    try {
        datos = await respuesta.json();
    } catch {
        datos = {};
    }

    if (respuesta.status === 401 && ruta !== "/admin/login") {
        mostrarLogin();
        mostrarError("Tu sesión ha expirado. Inicia sesión nuevamente.");
        throw new Error("Sesión administrativa no válida.");
    }

    if (!respuesta.ok) {
        throw new Error(
            datos.detail || "No fue posible completar la operación."
        );
    }

    return datos;
}

// --------------------------------------------------
// Autenticación
// --------------------------------------------------

async function consultarSesion() {
    try {
        await solicitarAPI("/admin/session");
        mostrarDashboard();
        return true;
    } catch {
        mostrarLogin();
        return false;
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    limpiarMensaje(loginError);

    const password = passwordInput.value;

    if (!password) {
        mostrarError("Introduce tu contraseña.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Verificando...";

    try {
        await solicitarAPI("/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        });

        passwordInput.value = "";
        mostrarDashboard();

    } catch (error) {
        mostrarError(
            error.message === "Failed to fetch"
                ? "No fue posible conectar con el servidor."
                : error.message
        );
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión";
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Cerrando sesión...";

    limpiarMensaje(dashboardMessage);

    try {
        await solicitarAPI("/admin/logout", {
            method: "POST"
        });

        mostrarLogin();
        passwordInput.value = "";
        limpiarMensaje(loginError);

    } catch (error) {
        mostrarMensaje(dashboardMessage, error.message, "error");
    } finally {
        logoutButton.disabled = false;
        logoutButton.textContent = "Cerrar sesión";
    }
});

// --------------------------------------------------
// Navegación
// --------------------------------------------------
document.addEventListener("click", (event) => {
    const objetivo = event.target;

    if (!(objetivo instanceof Element)) {
        return;
    }

    const boton = objetivo.closest("[data-module]");

    if (!boton) {
        return;
    }

    const modulo = boton.dataset.module;

    if (modulo === "responsables") {
        mostrarResponsables();
    }
    if (modulo === "invitados") {
    mostrarInvitados();
}
});
document.getElementById("back-home-invitados").addEventListener(
    "click",
    mostrarInicio
);

document.getElementById("refresh-invitados").addEventListener(
    "click",
    cargarTodosInvitados
);

document.getElementById("agregar-invitado").addEventListener(
    "click",
    agregarCampoInvitado
);
document.getElementById("back-home-button").addEventListener(
    "click",
    mostrarInicio
);

document.getElementById("refresh-responsables").addEventListener(
    "click",
    cargarResponsables
);

document.getElementById("close-invitados-button").addEventListener(
    "click",
    () => {
        invitadosResponsableCard.hidden = true;
    }
    
);

// --------------------------------------------------
// Responsables: consultar listado
// --------------------------------------------------

async function cargarResponsables() {
    responsablesTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-cell">
                Cargando responsables...
            </td>
        </tr>
    `;

    try {
        const datos = await solicitarAPI("/responsables");

        responsablesActuales = datos.responsables || [];

        const totalResponsables = responsablesActuales.length;

        const totalInvitados = responsablesActuales.reduce(
            (total, responsable) =>
                total + Number(responsable.total_invitados || 0),
            0
        );

        document.getElementById("total-responsables").textContent =
            totalResponsables;

        document.getElementById("total-invitados").textContent =
            totalInvitados;

        if (totalResponsables === 0) {
            responsablesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        Todavía no hay responsables registrados.
                    </td>
                </tr>
            `;
            return;
        }

        responsablesTableBody.innerHTML = "";

        responsablesActuales.forEach((responsable) => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(responsable.nombre)}</td>
                <td>${escaparHTML(responsable.telefono || "—")}</td>
                <td>${Number(responsable.total_invitados || 0)}</td>
                <td>${Number(responsable.total_confirmados || 0)}</td>
                <td>${Number(responsable.total_declinados || 0)}</td>
                <td>
                    <button
                        type="button"
                        class="table-action"
                        data-responsable-id="${Number(responsable.id)}">
                        Ver invitados
                    </button>
                </td>
            `;

            responsablesTableBody.appendChild(fila);
        });

        responsablesTableBody
            .querySelectorAll("[data-responsable-id]")
            .forEach((boton) => {
                boton.addEventListener("click", () => {
                    const id = Number(boton.dataset.responsableId);
                    consultarInvitadosResponsable(id);
                });
            });

    } catch (error) {
        responsablesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// --------------------------------------------------
// Responsables: registrar
// --------------------------------------------------

responsableForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    limpiarMensaje(responsableMessage);

    const nombre = document.getElementById(
        "responsable-nombre"
    ).value.trim();

    const telefono = document.getElementById(
        "responsable-telefono"
    ).value.trim();

    if (nombre.length < 2) {
        mostrarMensaje(
            responsableMessage,
            "El nombre debe contener al menos 2 caracteres.",
            "error"
        );
        return;
    }

    responsableSubmit.disabled = true;
    responsableSubmit.textContent = "Registrando...";

    try {
        await solicitarAPI("/responsables", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre,
                telefono: telefono || null
            })
        });

        responsableForm.reset();

        mostrarMensaje(
            responsableMessage,
            "Responsable registrado correctamente.",
            "success"
        );

        await cargarResponsables();

    } catch (error) {
        mostrarMensaje(
            responsableMessage,
            error.message,
            "error"
        );
    } finally {
        responsableSubmit.disabled = false;
        responsableSubmit.textContent = "Registrar responsable";
    }
});

// --------------------------------------------------
// Responsables: consultar invitados
// --------------------------------------------------

async function consultarInvitadosResponsable(responsableId) {
    invitadosResponsableCard.hidden = false;

    document.getElementById(
        "detalle-responsable-nombre"
    ).textContent = "Cargando...";

    document.getElementById(
        "detalle-responsable-total"
    ).textContent = "";

    invitadosTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="empty-cell">
                Consultando invitados...
            </td>
        </tr>
    `;

    try {
        const datos = await solicitarAPI(
            `/responsables/${responsableId}/invitados`
        );

        document.getElementById(
            "detalle-responsable-nombre"
        ).textContent = datos.responsable.nombre;

        document.getElementById(
            "detalle-responsable-total"
        ).textContent = `${datos.total_invitados} invitados registrados`;

        invitadosTableBody.innerHTML = "";

        if (!datos.invitados.length) {
            invitadosTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-cell">
                        Este responsable todavía no tiene invitados.
                    </td>
                </tr>
            `;
            return;
        }

        datos.invitados.forEach((invitado) => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(invitado.nombre)}</td>
                <td>${escaparHTML(invitado.telefono || "—")}</td>
                <td>${escaparHTML(
                invitado.mesa === null
                    ? "Sin asignar"
                    : String(invitado.mesa)
            )}</td>
                <td>
                    <span class="attendance-status ${claseAsistencia(invitado.asistencia)}">
                        ${escaparHTML(invitado.asistencia)}
                    </span>
                </td>
            `;

            invitadosTableBody.appendChild(fila);
        });

        invitadosResponsableCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        document.getElementById(
            "detalle-responsable-nombre"
        ).textContent = "No fue posible consultar los invitados";

        invitadosTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;
    }
}
function agregarCampoInvitado() {
    const fila = document.createElement("div");

    fila.className = "invitado-form-row";

    fila.innerHTML = `
        <div class="form-field">
            <label>Nombre *</label>
            <input type="text"
                   name="nombre"
                   placeholder="Nombre completo"
                   minlength="2"
                   maxlength="150"
                   required>
        </div>

        <div class="form-field">
            <label>Teléfono</label>
            <input type="tel"
                   name="telefono"
                   placeholder="Opcional"
                   maxlength="30">
        </div>

        <button type="button"
                class="table-action eliminar-campo-invitado">
            Quitar
        </button>
    `;

    invitadosFields.appendChild(fila);

    fila.querySelector('input[name="nombre"]').focus();
}
invitadosFields.addEventListener("click", (event) => {
    const boton = event.target.closest(".eliminar-campo-invitado");

    if (!boton) {
        return;
    }

    const filas = invitadosFields.querySelectorAll(
        ".invitado-form-row"
    );

    if (filas.length <= 1) {
        mostrarMensaje(
            invitadosFormMessage,
            "Debe permanecer al menos un campo de invitado.",
            "error"
        );
        return;
    }

    boton.closest(".invitado-form-row").remove();
    limpiarMensaje(invitadosFormMessage);
});
async function cargarResponsablesSelect() {
    invitadosResponsableSelect.innerHTML = `
        <option value="">Cargando responsables...</option>
    `;

    try {
        const datos = await solicitarAPI("/responsables");

        responsablesActuales = datos.responsables || [];

        invitadosResponsableSelect.innerHTML = `
            <option value="">Selecciona un responsable</option>
        `;

        responsablesActuales.forEach((responsable) => {
            const opcion = document.createElement("option");

            opcion.value = responsable.id;
            opcion.textContent = responsable.nombre;

            invitadosResponsableSelect.appendChild(opcion);
        });

        if (responsablesActuales.length === 0) {
            mostrarMensaje(
                invitadosFormMessage,
                "Primero debes registrar un responsable.",
                "error"
            );
        }

    } catch (error) {
        invitadosResponsableSelect.innerHTML = `
            <option value="">No fue posible cargar responsables</option>
        `;

        mostrarMensaje(
            invitadosFormMessage,
            error.message,
            "error"
        );
    }
}
invitadosForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    limpiarMensaje(invitadosFormMessage);
    invitadosResultados.innerHTML = "";

    const responsableId = Number(
        invitadosResponsableSelect.value
    );

    if (!responsableId) {
        mostrarMensaje(
            invitadosFormMessage,
            "Selecciona un responsable.",
            "error"
        );
        return;
    }

    const filas = [
        ...invitadosFields.querySelectorAll(".invitado-form-row")
    ];

    const personas = filas.map((fila) => ({
        nombre: fila.querySelector('[name="nombre"]').value.trim(),
        telefono: fila.querySelector('[name="telefono"]').value.trim()
    }));

    if (personas.some(persona => persona.nombre.length < 2)) {
        mostrarMensaje(
            invitadosFormMessage,
            "Todos los invitados deben tener un nombre de al menos 2 caracteres.",
            "error"
        );
        return;
    }

    registrarInvitadosButton.disabled = true;
    registrarInvitadosButton.textContent = "Registrando...";

    let exitosos = 0;
    const errores = [];

    try {
        for (const persona of personas) {
            try {
                await solicitarAPI("/invitados", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nombre: persona.nombre,
                        telefono: persona.telefono || null,
                        responsable_id: responsableId
                    })
                });

                exitosos++;

            } catch (error) {
                errores.push({
                    nombre: persona.nombre,
                    mensaje: error.message
                });
            }
        }

        if (exitosos === personas.length) {
            invitadosForm.reset();

            invitadosFields.innerHTML = `
                <div class="invitado-form-row">
                    <div class="form-field">
                        <label>Nombre *</label>
                        <input type="text"
                               name="nombre"
                               placeholder="Nombre completo"
                               minlength="2"
                               maxlength="150"
                               required>
                    </div>

                    <div class="form-field">
                        <label>Teléfono</label>
                        <input type="tel"
                               name="telefono"
                               placeholder="Opcional"
                               maxlength="30">
                    </div>
                </div>
            `;

            mostrarMensaje(
                invitadosFormMessage,
                `${exitosos} invitado(s) registrado(s) correctamente.`,
                "success"
            );

        } else {
            mostrarMensaje(
                invitadosFormMessage,
                `${exitosos} registrado(s), ${errores.length} con error. Revisa los resultados.`,
                "error"
            );

            invitadosResultados.innerHTML = errores.map(error => `
                <p class="error-text">
                    ${escaparHTML(error.nombre)}:
                    ${escaparHTML(error.mensaje)}
                </p>
            `).join("");
        }

        await cargarTodosInvitados();
        await cargarResponsables();

    } finally {
        registrarInvitadosButton.disabled = false;
        registrarInvitadosButton.textContent = "Registrar invitados";
    }
});
// --------------------------------------------------
// Seguridad de presentación
// --------------------------------------------------

function escaparHTML(valor) {
    return String(valor).replace(/[&<>"']/g, (caracter) => {
        const equivalencias = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return equivalencias[caracter];
    });
}

function claseAsistencia(asistencia) {
    switch (asistencia) {
        case "CONFIRMADO":
            return "confirmed";
        case "DECLINADO":
            return "declined";
        default:
            return "pending";
    }
}

// Comprobar si ya existe una sesión al abrir el panel.
consultarSesion();
async function cargarTodosInvitados() {
    invitadosGeneralTable.innerHTML = `
        <tr>
            <td colspan="4" class="empty-cell">
                Cargando invitados...
            </td>
        </tr>
    `;

    try {
        const datos = await solicitarAPI("/invitados");

        invitadosActuales = datos.invitados || [];

        document.getElementById("invitados-total").textContent =
            datos.total_invitados;

        document.getElementById("invitados-confirmados").textContent =
            datos.total_confirmados;

        document.getElementById("invitados-pendientes").textContent =
            datos.total_pendientes;

        document.getElementById("invitados-declinados").textContent =
            datos.total_declinados;

        if (invitadosActuales.length === 0) {
            invitadosGeneralTable.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-cell">
                        Todavía no hay invitados registrados.
                    </td>
                </tr>
            `;
            return;
        }

        invitadosGeneralTable.innerHTML = "";

        invitadosActuales.forEach((invitado) => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(invitado.nombre)}</td>
                <td>${escaparHTML(invitado.responsable_nombre)}</td>
                <td>${escaparHTML(invitado.telefono || "—")}</td>
                <td>
                    <span class="attendance-status ${claseAsistencia(invitado.asistencia)}">
                        ${escaparHTML(invitado.asistencia)}
                    </span>
                </td>
            `;

            invitadosGeneralTable.appendChild(fila);
        });

    } catch (error) {
        invitadosGeneralTable.innerHTML = `
            <tr>
                <td colspan="4" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;
    }
}