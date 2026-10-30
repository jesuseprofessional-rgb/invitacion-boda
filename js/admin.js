const API_BASE = "/api";

const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");

const loginForm = document.getElementById("login-form");
const passwordInput = document.getElementById("admin-password");
const loginButton = document.getElementById("login-button");
const loginError = document.getElementById("login-error");

const logoutButton = document.getElementById("logout-button");
const dashboardMessage = document.getElementById("dashboard-message");


function mostrarLogin() {
    dashboardScreen.hidden = true;
    loginScreen.hidden = false;
}

function mostrarDashboard() {
    loginScreen.hidden = true;
    dashboardScreen.hidden = false;
}

function mostrarError(mensaje) {
    loginError.textContent = mensaje;
}

async function consultarSesion() {
    try {
        const respuesta = await fetch(`${API_BASE}/admin/session`, {
            method: "GET",
            credentials: "same-origin"
        });

        if (respuesta.ok) {
            mostrarDashboard();
            return true;
        }

        if (respuesta.status === 401) {
            mostrarLogin();
            return false;
        }

        mostrarLogin();
        mostrarError("No fue posible comprobar la sesión. Intenta nuevamente.");
        return false;

    } catch (error) {
        mostrarLogin();
        mostrarError("No fue posible conectar con el servidor.");
        return false;
    }
}


loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    mostrarError("");

    const password = passwordInput.value;

    if (!password) {
        mostrarError("Introduce tu contraseña.");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Verificando...";

    try {
        const respuesta = await fetch(`${API_BASE}/admin/login`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                mostrarError("La contraseña es incorrecta.");
            } else if (respuesta.status === 403) {
                mostrarError("La solicitud no fue autorizada.");
            } else {
                mostrarError(
                    datos.detail || "No fue posible iniciar sesión."
                );
            }

            return;
        }

        passwordInput.value = "";
        mostrarDashboard();

    } catch (error) {
        mostrarError("No fue posible conectar con el servidor.");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Iniciar sesión";
    }
});


logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "Cerrando sesión...";

    dashboardMessage.textContent = "";
    dashboardMessage.className = "message";

    try {
        const respuesta = await fetch(`${API_BASE}/admin/logout`, {
            method: "POST",
            credentials: "same-origin"
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            dashboardMessage.textContent =
                datos.detail || "No fue posible cerrar la sesión.";
            dashboardMessage.classList.add("error");
            return;
        }

        mostrarLogin();
        passwordInput.value = "";
        mostrarError("");

    } catch (error) {
        dashboardMessage.textContent =
            "No fue posible conectar con el servidor.";
        dashboardMessage.classList.add("error");

    } finally {
        logoutButton.disabled = false;
        logoutButton.textContent = "Cerrar sesión";
    }
});


// Comprobar si ya existe una sesión al abrir el panel.
consultarSesion();