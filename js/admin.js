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
// Referencias del módulo Confirmaciones

const confirmacionesView = document.getElementById(
    "confirmaciones-view"
);

const confirmacionesTableBody = document.getElementById(
    "confirmaciones-table-body"
);

const confirmacionesBusqueda = document.getElementById(
    "confirmaciones-busqueda"
);

const confirmacionesFiltro = document.getElementById(
    "confirmaciones-filtro"
);

const confirmacionesMessage = document.getElementById(
    "confirmaciones-message"
);

const confirmacionesResultados = document.getElementById(
    "confirmaciones-resultados"
);

let confirmacionesActuales = [];
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
// Referencias del módulo Enlaces
const enlacesView = document.getElementById("enlaces-view");
const enlacesForm = document.getElementById("enlaces-form");
const enlacesTipo = document.getElementById("enlaces-tipo");

const enlacesResponsableField = document.getElementById(
    "enlaces-responsable-field"
);
const enlacesResponsableSelect = document.getElementById(
    "enlaces-responsable"
);

const enlacesInvitadoField = document.getElementById(
    "enlaces-invitado-field"
);
const enlacesInvitadoSelect = document.getElementById(
    "enlaces-invitado"
);

const generarEnlaceButton = document.getElementById(
    "generar-enlace-button"
);
const enlacesFormMessage = document.getElementById(
    "enlaces-form-message"
);
const enlacesTableBody = document.getElementById(
    "enlaces-table-body"
);

const enlaceGenerado = document.getElementById("enlace-generado");
const enlaceGeneradoUrl = document.getElementById("enlace-generado-url");
const enlaceGeneradoDestinatario = document.getElementById(
    "enlace-generado-destinatario"
);
// --------------------------------------------------
// Referencias del módulo Invitaciones
// --------------------------------------------------

const invitacionesView = document.getElementById(
    "invitaciones-view"
);

const generarPasesButton = document.getElementById(
    "generar-pases-button"
);

const invitacionesMessage = document.getElementById(
    "invitaciones-message"
);

const pasesTableBody = document.getElementById(
    "pases-table-body"
);

const pasesGenerados = document.getElementById(
    "pases-generados"
);

const pasesGeneradosResumen = document.getElementById(
    "pases-generados-resumen"
);

let pasesActuales = [];

// Los tokens originales solo viven en memoria.
// No se guardan en localStorage ni sessionStorage.
let pasesRecienGenerados = [];

let enlacesActuales = [];

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
    enlacesView.hidden = true;
    confirmacionesView.hidden = true;
    invitacionesView.hidden = true;
}

function mostrarResponsables() {
    homeView.hidden = true;
    responsablesView.hidden = false;
    invitadosView.hidden = true;
    enlacesView.hidden = true;
    confirmacionesView.hidden = true;
    invitacionesView.hidden = true;

    cargarResponsables();
}

function mostrarInvitados() {
    homeView.hidden = true;
    responsablesView.hidden = true;
    invitadosView.hidden = false;
    enlacesView.hidden = true;
    confirmacionesView.hidden = true;
    invitacionesView.hidden = true;

    cargarResponsablesSelect();
    cargarTodosInvitados();
}

function mostrarEnlaces() {
    homeView.hidden = true;
    responsablesView.hidden = true;
    invitadosView.hidden = true;
    enlacesView.hidden = false;
    confirmacionesView.hidden = true;
    invitacionesView.hidden = true;

    cargarOpcionesEnlaces();
    cargarEnlaces();
}
function mostrarConfirmaciones() {
    homeView.hidden = true;
    responsablesView.hidden = true;
    invitadosView.hidden = true;
    enlacesView.hidden = true;
    confirmacionesView.hidden = false;
    invitacionesView.hidden = true;

    cargarConfirmaciones();
}
function mostrarInvitaciones() {
    homeView.hidden = true;
    responsablesView.hidden = true;
    invitadosView.hidden = true;
    enlacesView.hidden = true;
    confirmacionesView.hidden = true;
    invitacionesView.hidden = false;

    cargarPases();
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
    if (modulo === "enlaces") {
    mostrarEnlaces();
    }
    if (modulo === "confirmaciones") {
    mostrarConfirmaciones();

    if (modulo === "invitaciones") {
    mostrarInvitaciones();
}
}
});
document.getElementById("back-home-invitaciones").addEventListener(
    "click",
    mostrarInicio
);
document.getElementById("back-home-invitados").addEventListener(
    "click",
    mostrarInicio
);
document.getElementById("back-home-enlaces").addEventListener(
    "click",
    mostrarInicio
);

document.getElementById("refresh-enlaces").addEventListener(
    "click",
    cargarEnlaces
);
document.getElementById("refresh-invitados").addEventListener(
    "click",
    cargarTodosInvitados
);
document.getElementById("back-home-confirmaciones").addEventListener(
    "click",
    mostrarInicio
);

document.getElementById("refresh-confirmaciones").addEventListener(
    "click",
    cargarConfirmaciones
);

confirmacionesBusqueda.addEventListener(
    "input",
    renderizarConfirmaciones
);

confirmacionesFiltro.addEventListener(
    "change",
    renderizarConfirmaciones
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
// --------------------------------------------------
// Enlaces: cargar opciones de destinatarios
// --------------------------------------------------

async function cargarOpcionesEnlaces() {
    enlacesResponsableSelect.innerHTML = `
        <option value="">Cargando responsables...</option>
    `;

    enlacesInvitadoSelect.innerHTML = `
        <option value="">Cargando invitados...</option>
    `;

    try {
        const [datosResponsables, datosInvitados] = await Promise.all([
            solicitarAPI("/responsables"),
            solicitarAPI("/invitados")
        ]);

        enlacesResponsableSelect.innerHTML = `
            <option value="">Selecciona un responsable</option>
        `;

        (datosResponsables.responsables || []).forEach((responsable) => {
            const opcion = document.createElement("option");
            opcion.value = responsable.id;
            opcion.textContent = responsable.nombre;

            enlacesResponsableSelect.appendChild(opcion);
        });

        enlacesInvitadoSelect.innerHTML = `
            <option value="">Selecciona un invitado</option>
        `;

        (datosInvitados.invitados || []).forEach((invitado) => {
            const opcion = document.createElement("option");
            opcion.value = invitado.id;
            opcion.textContent =
                `${invitado.nombre} — ${invitado.responsable_nombre}`;

            enlacesInvitadoSelect.appendChild(opcion);
        });

    } catch (error) {
        enlacesResponsableSelect.innerHTML = `
            <option value="">Error al cargar responsables</option>
        `;

        enlacesInvitadoSelect.innerHTML = `
            <option value="">Error al cargar invitados</option>
        `;

        mostrarMensaje(
            enlacesFormMessage,
            error.message,
            "error"
        );
    }
}

// --------------------------------------------------
// Enlaces: cambiar modalidad
// --------------------------------------------------

enlacesTipo.addEventListener("change", () => {
    const grupal = enlacesTipo.value === "RESPONSABLE";

    enlacesResponsableField.hidden = !grupal;
    enlacesInvitadoField.hidden = grupal;

    limpiarMensaje(enlacesFormMessage);
    enlaceGenerado.hidden = true;
});

// --------------------------------------------------
// Enlaces: consultar listado
// --------------------------------------------------

async function cargarEnlaces() {
    enlacesTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-cell">
                Consultando enlaces...
            </td>
        </tr>
    `;

    try {
        const datos = await solicitarAPI("/tokens");

        enlacesActuales = datos.tokens || [];

        const activos = enlacesActuales.filter(
            token => Number(token.activo) === 1
        );

        const grupales = enlacesActuales.filter(
            token => token.tipo === "RESPONSABLE"
        );

        const individuales = enlacesActuales.filter(
            token => token.tipo === "INDIVIDUAL"
        );

        const revocados = enlacesActuales.filter(
            token => Number(token.activo) === 0
        );

        document.getElementById("enlaces-activos").textContent =
            activos.length;

        document.getElementById("enlaces-grupales").textContent =
            grupales.length;

        document.getElementById("enlaces-individuales").textContent =
            individuales.length;

        document.getElementById("enlaces-revocados").textContent =
            revocados.length;

        if (enlacesActuales.length === 0) {
            enlacesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        Todavía no se han generado enlaces.
                    </td>
                </tr>
            `;
            return;
        }

        enlacesTableBody.innerHTML = "";

        enlacesActuales.forEach((token) => {
            const activo = Number(token.activo) === 1;

            const destinatario = token.tipo === "RESPONSABLE"
                ? token.responsable_nombre || "Responsable"
                : token.nombres_invitados || "Invitado";

            const tipo = token.tipo === "RESPONSABLE"
                ? "Grupal"
                : "Individual";

            const fecha = token.creado_en
                ? new Date(token.creado_en).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short"
                })
                : "—";

            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(destinatario)}</td>
                <td>${tipo}</td>
                <td>${Number(token.total_invitados || 0)}</td>
                <td>${escaparHTML(fecha)}</td>
                <td>
                    <span class="attendance-status ${
                        activo ? "confirmed" : "declined"
                    }">
                        ${activo ? "Activo" : "Revocado"}
                    </span>
                </td>
                <td>
                    ${
                        activo
                            ? `
                                <button
                                    type="button"
                                    class="table-action revoke-link-button"
                                    data-token-id="${Number(token.id)}">
                                    Revocar
                                </button>
                            `
                            : "—"
                    }
                </td>
            `;

            enlacesTableBody.appendChild(fila);
        });

    } catch (error) {
        enlacesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// --------------------------------------------------
// Enlaces: generar
// --------------------------------------------------

enlacesForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    limpiarMensaje(enlacesFormMessage);
    enlaceGenerado.hidden = true;

    const tipo = enlacesTipo.value;

    let cuerpo;
    let destinatario;

    if (tipo === "RESPONSABLE") {
        const responsableId = Number(
            enlacesResponsableSelect.value
        );

        if (!responsableId) {
            mostrarMensaje(
                enlacesFormMessage,
                "Selecciona un responsable.",
                "error"
            );
            return;
        }

        const responsable = responsablesActuales.find(
            item => Number(item.id) === responsableId
        );

        // responsablesActuales puede estar desactualizado;
        // se consulta la opción seleccionada como respaldo.
        destinatario = enlacesResponsableSelect.selectedOptions[0].textContent;

        cuerpo = {
            tipo: "RESPONSABLE",
            responsable_id: responsableId
        };

    } else {
        const invitadoId = Number(
            enlacesInvitadoSelect.value
        );

        if (!invitadoId) {
            mostrarMensaje(
                enlacesFormMessage,
                "Selecciona un invitado.",
                "error"
            );
            return;
        }

        destinatario = enlacesInvitadoSelect.selectedOptions[0].textContent;

        cuerpo = {
            tipo: "INDIVIDUAL",
            invitado_ids: [invitadoId]
        };
    }

    
    generarEnlaceButton.disabled = true;
    generarEnlaceButton.textContent = "Generando...";

    try {
        const resultado = await solicitarAPI("/tokens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(cuerpo)
        });

        enlaceGeneradoUrl.value = resultado.url_invitacion;

        enlaceGeneradoDestinatario.textContent =
            `${destinatario} · ${resultado.total_invitados} invitado(s)`;

        enlaceGenerado.hidden = false;

        mostrarMensaje(
            enlacesFormMessage,
            "El enlace se generó correctamente. Cópialo antes de salir de esta pantalla.",
            "success"
        );

        await cargarEnlaces();

    } catch (error) {
        mostrarMensaje(
            enlacesFormMessage,
            error.message,
            "error"
        );
    } finally {
        generarEnlaceButton.disabled = false;
        generarEnlaceButton.textContent = "Generar enlace";
    }
});

// --------------------------------------------------
// Enlaces: copiar enlace generado
// --------------------------------------------------

document.getElementById("copiar-enlace-generado").addEventListener(
    "click",
    async () => {
        try {
            await navigator.clipboard.writeText(
                enlaceGeneradoUrl.value
            );

            mostrarMensaje(
                enlacesFormMessage,
                "Enlace copiado al portapapeles.",
                "success"
            );

        } catch {
            enlaceGeneradoUrl.select();

            const copiado = document.execCommand("copy");

            mostrarMensaje(
                enlacesFormMessage,
                copiado
                    ? "Enlace copiado al portapapeles."
                    : "No fue posible copiar automáticamente. Selecciona y copia el enlace.",
                copiado ? "success" : "error"
            );
        }
    }
);

// --------------------------------------------------
// Enlaces: revocar
// --------------------------------------------------

enlacesTableBody.addEventListener("click", async (event) => {
    const boton = event.target.closest(".revoke-link-button");

    if (!boton) {
        return;
    }

    const tokenId = Number(boton.dataset.tokenId);

    if (!tokenId) {
        return;
    }

    const confirmar = confirm(
        "¿Deseas revocar este enlace? " +
        "Dejará de funcionar inmediatamente."
    );

    if (!confirmar) {
        return;
    }

    boton.disabled = true;
    boton.textContent = "Revocando...";

    try {
        await solicitarAPI(`/tokens/${tokenId}/revocar`, {
            method: "PATCH"
        });

        mostrarMensaje(
            enlacesFormMessage,
            "El enlace fue revocado correctamente.",
            "success"
        );

        await cargarEnlaces();

    } catch (error) {
        mostrarMensaje(
            enlacesFormMessage,
            error.message,
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Revocar";
    }
});
// --------------------------------------------------
// Confirmaciones: consultar información
// --------------------------------------------------

async function cargarConfirmaciones() {

    confirmacionesTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="empty-cell">
                Consultando confirmaciones...
            </td>
        </tr>
    `;

    limpiarMensaje(confirmacionesMessage);

    try {

        const datos = await solicitarAPI("/invitados");

        confirmacionesActuales = datos.invitados || [];

        const total = confirmacionesActuales.length;

        const confirmados = confirmacionesActuales.filter(
            invitado => invitado.asistencia === "CONFIRMADO"
        ).length;

        const declinados = confirmacionesActuales.filter(
            invitado => invitado.asistencia === "DECLINADO"
        ).length;

        const pendientes = confirmacionesActuales.filter(
            invitado => invitado.asistencia === "PENDIENTE"
        ).length;

        const respondidos = confirmados + declinados;

        const porcentaje = total > 0
            ? Math.round((respondidos / total) * 100)
            : 0;

        // Actualizar estadísticas.

        document.getElementById("confirmaciones-total").textContent =
            total;

        document.getElementById("confirmaciones-confirmados").textContent =
            confirmados;

        document.getElementById("confirmaciones-declinados").textContent =
            declinados;

        document.getElementById("confirmaciones-pendientes").textContent =
            pendientes;

        // Actualizar progreso.

        document.getElementById(
            "confirmaciones-progreso-texto"
        ).textContent = total > 0
            ? `${respondidos} de ${total} invitados han respondido (${porcentaje}%).`
            : "Todavía no hay invitados registrados.";

        const barra = document.getElementById(
            "confirmaciones-progreso-barra"
        );

        barra.style.width = `${porcentaje}%`;

        document.getElementById(
            "confirmaciones-progreso"
        ).setAttribute("aria-valuenow", porcentaje);

        renderizarConfirmaciones();

    } catch (error) {

        confirmacionesTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;

        mostrarMensaje(
            confirmacionesMessage,
            error.message,
            "error"
        );
    }
}


// --------------------------------------------------
// Confirmaciones: buscar y filtrar
// --------------------------------------------------

function renderizarConfirmaciones() {

    const busqueda = confirmacionesBusqueda.value
        .trim()
        .toLocaleLowerCase("es-MX");

    const filtro = confirmacionesFiltro.value;

    const invitadosFiltrados = confirmacionesActuales.filter(
        invitado => {

            const nombre = String(invitado.nombre || "")
                .toLocaleLowerCase("es-MX");

            const responsable = String(
                invitado.responsable_nombre || ""
            ).toLocaleLowerCase("es-MX");

            const coincideBusqueda =
                nombre.includes(busqueda) ||
                responsable.includes(busqueda);

            const coincideEstado =
                filtro === "TODOS" ||
                invitado.asistencia === filtro;

            return coincideBusqueda && coincideEstado;
        }
    );

    confirmacionesResultados.textContent =
        `Mostrando ${invitadosFiltrados.length} de ${confirmacionesActuales.length} invitados.`;

    if (invitadosFiltrados.length === 0) {

        confirmacionesTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    No se encontraron invitados con esos criterios.
                </td>
            </tr>
        `;

        return;
    }

    confirmacionesTableBody.innerHTML = "";

    invitadosFiltrados.forEach((invitado) => {

        const fila = document.createElement("tr");

        const mesa = invitado.mesa === null ||
                     invitado.mesa === ""
            ? "Sin asignar"
            : String(invitado.mesa);

        fila.innerHTML = `
            <td>
                ${escaparHTML(invitado.nombre)}
            </td>

            <td>
                ${escaparHTML(invitado.responsable_nombre || "—")}
            </td>

            <td>
                ${escaparHTML(mesa)}
            </td>

            <td>
                <span class="attendance-status ${claseAsistencia(invitado.asistencia)}">
                    ${escaparHTML(invitado.asistencia)}
                </span>
            </td>

            <td>
                <div class="confirmation-edit">

                    <select
                        class="confirmation-select"
                        data-asistencia-id="${Number(invitado.id)}"
                        aria-label="Cambiar asistencia de ${escaparHTML(invitado.nombre)}">

                        <option value="PENDIENTE"
                            ${invitado.asistencia === "PENDIENTE" ? "selected" : ""}>
                            Pendiente
                        </option>

                        <option value="CONFIRMADO"
                            ${invitado.asistencia === "CONFIRMADO" ? "selected" : ""}>
                            Confirmado
                        </option>

                        <option value="DECLINADO"
                            ${invitado.asistencia === "DECLINADO" ? "selected" : ""}>
                            Declinado
                        </option>

                    </select>

                    <button
                        type="button"
                        class="table-action confirmation-save-button"
                        data-invitado-id="${Number(invitado.id)}">

                        Guardar

                    </button>

                </div>
            </td>
        `;

        confirmacionesTableBody.appendChild(fila);
    });
}


// --------------------------------------------------
// Confirmaciones: actualizar asistencia manualmente
// --------------------------------------------------

confirmacionesTableBody.addEventListener("click", async (event) => {

    const boton = event.target.closest(
        ".confirmation-save-button"
    );

    if (!boton) {
        return;
    }

    const invitadoId = Number(boton.dataset.invitadoId);

    if (!invitadoId) {
        return;
    }

    const select = confirmacionesTableBody.querySelector(
        `[data-asistencia-id="${invitadoId}"]`
    );

    if (!select) {
        return;
    }

    const asistencia = select.value;

    const invitado = confirmacionesActuales.find(
        item => Number(item.id) === invitadoId
    );

    if (!invitado) {
        mostrarMensaje(
            confirmacionesMessage,
            "No se encontró el invitado seleccionado.",
            "error"
        );
        return;
    }

    if (invitado.asistencia === asistencia) {
        mostrarMensaje(
            confirmacionesMessage,
            "La asistencia ya tiene ese estado.",
            ""
        );
        return;
    }

    boton.disabled = true;
    boton.textContent = "Guardando...";

    try {

        await solicitarAPI(
            `/invitados/${invitadoId}/asistencia`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    asistencia
                })
            }
        );

        mostrarMensaje(
            confirmacionesMessage,
            `Asistencia de ${invitado.nombre} actualizada correctamente.`,
            "success"
        );

        await cargarConfirmaciones();

    } catch (error) {

        mostrarMensaje(
            confirmacionesMessage,
            error.message,
            "error"
        );

        boton.disabled = false;
        boton.textContent = "Guardar";
    }
});

// --------------------------------------------------
// Invitaciones: consultar pases
// --------------------------------------------------

async function cargarPases() {
    pasesTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-cell">
                Consultando pases...
            </td>
        </tr>
    `;

    try {
        const datos = await solicitarAPI("/pases");

        pasesActuales = datos.pases || [];

        const activos = pasesActuales.filter(
            pase => Number(pase.pase_activo) === 1
        );

        const revocados = pasesActuales.filter(
            pase => Number(pase.pase_activo) === 0
        );

        document.getElementById("pases-total").textContent =
            pasesActuales.length;

        document.getElementById("pases-activos").textContent =
            activos.length;

        document.getElementById("pases-revocados").textContent =
            revocados.length;

        if (pasesActuales.length === 0) {
            pasesTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        Todavía no se han generado pases.
                    </td>
                </tr>
            `;
            return;
        }

        pasesTableBody.innerHTML = "";

        pasesActuales.forEach((pase) => {

            const paseActivo =
                Number(pase.pase_activo) === 1;

            const invitadoActivo =
                Number(pase.invitado_activo) === 1;

            const fecha = pase.creado_en
                ? new Date(pase.creado_en).toLocaleString("es-MX", {
                    dateStyle: "short",
                    timeStyle: "short"
                })
                : "—";

            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(pase.nombre)}</td>

                <td>${escaparHTML(
                    pase.responsable_nombre || "—"
                )}</td>

                <td>${escaparHTML(pase.mesa || "Sin asignar")}</td>

                <td>
                    <span class="attendance-status ${
                        claseAsistencia(pase.asistencia)
                    }">
                        ${escaparHTML(pase.asistencia)}
                    </span>
                </td>

                <td>
                    <span class="attendance-status ${
                        paseActivo && invitadoActivo
                            ? "confirmed"
                            : "declined"
                    }">
                        ${
                            paseActivo && invitadoActivo
                                ? "Activo"
                                : "No disponible"
                        }
                    </span>
                </td>

                <td>${escaparHTML(fecha)}</td>
            `;

            pasesTableBody.appendChild(fila);
        });

    } catch (error) {
        pasesTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-cell error-text">
                    ${escaparHTML(error.message)}
                </td>
            </tr>
        `;
    }
}


// --------------------------------------------------
// Invitaciones: generar pases
// --------------------------------------------------

generarPasesButton.addEventListener("click", async () => {

    const confirmar = window.confirm(
        "Se generarán pases para todos los invitados activos que hayan confirmado su asistencia y todavía no tengan uno. ¿Continuar?"
    );

    if (!confirmar) {
        return;
    }

    generarPasesButton.disabled = true;
    generarPasesButton.textContent = "Generando pases...";

    limpiarMensaje(invitacionesMessage);

    try {
        const resultado = await solicitarAPI("/pases", {
            method: "POST"
        });

        pasesRecienGenerados = resultado.pases || [];

        pasesGenerados.hidden = pasesRecienGenerados.length === 0;

        if (pasesRecienGenerados.length > 0) {
            pasesGeneradosResumen.textContent =
                `${pasesRecienGenerados.length} pase(s) generado(s). Los códigos están disponibles en memoria para preparar sus QR y documentos.`;
        } else {
            pasesGeneradosResumen.textContent = "";
        }

        mostrarMensaje(
            invitacionesMessage,
            resultado.total_generados > 0
                ? `Se generaron ${resultado.total_generados} pase(s) correctamente.`
                : "No hay invitados confirmados pendientes de generar su pase.",
            "success"
        );

        await cargarPases();

    } catch (error) {

        mostrarMensaje(
            invitacionesMessage,
            error.message,
            "error"
        );

    } finally {
        generarPasesButton.disabled = false;
        generarPasesButton.textContent =
            "Generar pases de confirmados";
    }
});


// --------------------------------------------------
// Invitaciones: actualizar listado
// --------------------------------------------------

document.getElementById("refresh-pases").addEventListener(
    "click",
    cargarPases
);
