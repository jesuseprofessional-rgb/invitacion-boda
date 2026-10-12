// =========================================
// DATOS DE LA BODA
// =========================================

const boda = {

    novios: {
        novio: "Eric Hernández Vargas",
        novia: "Yolanda Álvarez Bonilla"
    },

    fecha: "2026-12-05T14:00:00",

    iglesia: {
        nombre: "Santiago Apóstol",
        hora: "2:00 pm"
    },

    recepcion: {
        nombre: "Salón República",
        horario: "4:00 pm a 9:00 pm"
    },

    padrinos: {
        velacion: [
            "Regina Ramos Ortega",
            "José Francisco Rodríguez García"
        ],

        lazo: [
            "Laura Gpe. López Reyes",
            "Facundo Rodolfo Calderón Mercado"
        ],

        arras: "Por confirmar"
    }

};


// =========================================
// PANTALLA DE APERTURA
// =========================================

const openingScreen =
    document.getElementById("opening-screen");

const openInvitation =
    document.getElementById("open-invitation");


const musicaBoda =
    document.getElementById("musica-boda");

const musicToggle =
    document.getElementById("music-toggle");


openInvitation.addEventListener("click", () => {

    openingScreen.classList.add("hidden");

    musicaBoda.play()
        .then(() => {

            musicToggle.textContent = "♫";

        })
        .catch((error) => {

            console.log(
                "No se pudo iniciar la música:",
                error
            );

        });

});


musicToggle.addEventListener("click", () => {

    if (musicaBoda.paused) {

        musicaBoda.play();

        musicToggle.textContent = "♫";
        musicToggle.classList.remove("paused");
        musicToggle.setAttribute(
            "aria-label",
            "Pausar música"
        );

    } else {

        musicaBoda.pause();

        musicToggle.textContent = "♪";
        musicToggle.classList.add("paused");
        musicToggle.setAttribute(
            "aria-label",
            "Reproducir música"
        );

    }

});


// =========================================
// ELEMENTOS DE TEXTO
// =========================================

const nombreNovios =
    `${ boda.novios.novia } & ${ boda.novios.novio }`;


// =========================================
// FECHA DE LA BODA
// =========================================

const fechaBoda =
    new Date(boda.fecha);


// =========================================
// FORMATO DE FECHA
// =========================================

const opcionesFecha = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
};


const fechaTexto =
    fechaBoda.toLocaleDateString(
        "es-MX",
        opcionesFecha
    );


// =========================================
// ACTUALIZAR DATOS EN LA PÁGINA
// =========================================

// Nombres

document.getElementById("novios").textContent =
    nombreNovios;

document.getElementById("opening-novios").textContent =
    nombreNovios;

document.getElementById("closing-novios").textContent =
    nombreNovios;


// Fecha

document.getElementById("fecha").textContent =
    fechaTexto;

document.getElementById("fecha-countdown").textContent =
    fechaTexto;


// Fecha corta para apertura y cierre

const fechaCorta =
    `${ String(fechaBoda.getDate()).padStart(2, "0") } · ` +
    `${ String(fechaBoda.getMonth() + 1).padStart(2, "0") } · ` +
    `${ fechaBoda.getFullYear() }`;


document.getElementById("opening-fecha").textContent =
    fechaCorta;

document.getElementById("closing-fecha").textContent =
    fechaCorta;


// Iglesia

document.getElementById("iglesia").textContent =
    boda.iglesia.nombre;

document.getElementById("iglesia-evento").textContent =
    boda.iglesia.nombre;

document.getElementById("hora-ceremonia").textContent =
    boda.iglesia.hora;

document.getElementById("hora-ceremonia-evento").textContent =
    boda.iglesia.hora;


// Recepción

document.getElementById("recepcion-lugar").textContent =
    boda.recepcion.nombre;

document.getElementById("recepcion-horario").textContent =
    boda.recepcion.horario;


// Padrinos

document.getElementById("padrinos-arras").textContent =
    boda.padrinos.arras;


// =========================================
// ELEMENTOS DEL CONTADOR
// =========================================

const dias =
    document.getElementById("dias");

const horas =
    document.getElementById("horas");

const minutos =
    document.getElementById("minutos");

const segundos =
    document.getElementById("segundos");


// =========================================
// ACTUALIZAR CONTADOR
// =========================================

function actualizarContador() {

    const ahora = new Date();

    const diferencia =
        fechaBoda - ahora;


    // La fecha ya pasó

    if (diferencia <= 0) {

        dias.textContent = "0";
        horas.textContent = "0";
        minutos.textContent = "0";
        segundos.textContent = "0";

        return;
    }


    // Convertimos milisegundos
    // en días, horas, minutos y segundos

    const diasRestantes =
        Math.floor(
            diferencia /
            (1000 * 60 * 60 * 24)
        );


    const horasRestantes =
        Math.floor(
            (diferencia /
                (1000 * 60 * 60)) % 24
        );


    const minutosRestantes =
        Math.floor(
            (diferencia /
                (1000 * 60)) % 60
        );


    const segundosRestantes =
        Math.floor(
            (diferencia / 1000) % 60
        );


    // Mostrar resultados

    dias.textContent =
        diasRestantes;

    horas.textContent =
        String(horasRestantes)
            .padStart(2, "0");

    minutos.textContent =
        String(minutosRestantes)
            .padStart(2, "0");

    segundos.textContent =
        String(segundosRestantes)
            .padStart(2, "0");

}


// =========================================
// ANIMACIONES AL HACER SCROLL
// =========================================

const elementosReveal =
    document.querySelectorAll(".reveal");


const observer =
    new IntersectionObserver(
        (entradas) => {

            entradas.forEach((entrada) => {

                if (entrada.isIntersecting) {

                    entrada.target
                        .classList
                        .add("visible");

                    observer.unobserve(
                        entrada.target
                    );

                }

            });

        },
        {
            threshold: 0.15
        }
    );


elementosReveal.forEach((elemento) => {

    observer.observe(elemento);

});


// =========================================
// EJECUTAR
// =========================================

actualizarContador();


// Actualizar cada segundo

setInterval(
    actualizarContador,
    1000
);


console.log(
    "Invitación de boda cargada correctamente."
);
// =========================================
// CONFIRMACION DE ASISTENCIA
// =========================================

async function inicializarConfirmacion() {

    const mensaje = document.getElementById("rsvp-message");
    const loading = document.getElementById("rsvp-loading");
    const error = document.getElementById("rsvp-error");
    const contenedor = document.getElementById("rsvp-invitados");
    const estado = document.getElementById("rsvp-status");

    // Si la sección no existe, no hacemos nada.
    if (!mensaje || !loading || !error || !contenedor || !estado) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

    // Sin token, mostramos la invitación normalmente.
    if (!token) {
        mensaje.textContent =
            "Si recibiste una invitación personalizada, abre el enlace que te compartieron para confirmar tu asistencia.";
        return;
    }

    loading.hidden = false;
    error.hidden = true;
    contenedor.hidden = true;
    estado.textContent = "";

    try {
        const respuesta = await fetch(
            `/api/invitacion/${encodeURIComponent(token)}`
        );

        if (respuesta.status === 404) {
            throw new Error(
                "Este enlace de invitación no es válido o ya fue revocado. Por favor, contacta a los novios."
            );
        }

        if (!respuesta.ok) {
            throw new Error(
                "No fue posible consultar la invitación. Inténtalo nuevamente más tarde."
            );
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos.invitados) || datos.invitados.length === 0) {
            throw new Error(
                "Esta invitación no tiene invitados activos asociados."
            );
        }

        mensaje.textContent =
            "Selecciona la respuesta de cada invitado. Tus respuestas se guardarán al confirmar.";

        contenedor.replaceChildren();

        datos.invitados.forEach((invitado) => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "rsvp-guest";

            const nombre = document.createElement("h3");
            nombre.textContent = invitado.nombre;

            const respuestaActual = document.createElement("p");
            respuestaActual.className = "rsvp-guest-status";

            const asistenciaActual = invitado.asistencia;

            if (asistenciaActual === "CONFIRMADO") {
                respuestaActual.textContent = "Asistencia confirmada";
            } else if (asistenciaActual === "DECLINADO") {
                respuestaActual.textContent = "Asistencia declinada";
            } else {
                respuestaActual.textContent = "Pendiente de respuesta";
            }

            const acciones = document.createElement("div");
            acciones.className = "rsvp-guest-actions";

            const botonConfirmar = document.createElement("button");
            botonConfirmar.type = "button";
            botonConfirmar.className = "rsvp-button";
            botonConfirmar.textContent = "Confirmar asistencia";

            const botonDeclinar = document.createElement("button");
            botonDeclinar.type = "button";
            botonDeclinar.className = "rsvp-button rsvp-button-secondary";
            botonDeclinar.textContent = "No podré asistir";

            async function guardarAsistencia(asistencia, boton) {
                botonConfirmar.disabled = true;
                botonDeclinar.disabled = true;
                estado.textContent = "Guardando respuesta...";

                try {
                    const respuesta = await fetch(
                        `/api/invitacion/${encodeURIComponent(token)}/asistencia`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                invitado_id: invitado.id,
                                asistencia: asistencia
                            })
                        }
                    );

                    if (respuesta.status === 404) {
                        throw new Error(
                            "La invitación ya no está disponible. Contacta a los novios."
                        );
                    }

                    if (!respuesta.ok) {
                        throw new Error(
                            "No se pudo guardar tu respuesta. Inténtalo nuevamente."
                        );
                    }

                    invitado.asistencia = asistencia;

                    respuestaActual.textContent =
                        asistencia === "CONFIRMADO"
                            ? "Asistencia confirmada"
                            : "Asistencia declinada";

                    estado.textContent =
                        "Respuesta guardada correctamente para " +
                        invitado.nombre +
                        ".";

                } catch (err) {
                    estado.textContent = "";
                    error.textContent = err.message;
                    error.hidden = false;
                } finally {
                    botonConfirmar.disabled = false;
                    botonDeclinar.disabled = false;
                }
            }

            botonConfirmar.addEventListener("click", () => {
                guardarAsistencia("CONFIRMADO", botonConfirmar);
            });

            botonDeclinar.addEventListener("click", () => {
                guardarAsistencia("DECLINADO", botonDeclinar);
            });

            acciones.append(botonConfirmar, botonDeclinar);
            tarjeta.append(nombre, respuestaActual, acciones);
            contenedor.appendChild(tarjeta);
        });

        contenedor.hidden = false;

    } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
    } finally {
        loading.hidden = true;
    }
}

inicializarConfirmacion();
