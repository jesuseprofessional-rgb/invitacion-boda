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

        arras: "Benigno Del Angel Morales"
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

    if (!mensaje || !loading || !error || !contenedor || !estado) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

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

            const acciones = document.createElement("div");
            acciones.className = "rsvp-guest-actions";
            const paseContenedor = document.createElement("div");
            paseContenedor.className = "rsvp-pass";
            
            const botonConfirmar = document.createElement("button");
            botonConfirmar.type = "button";
            botonConfirmar.className = "rsvp-button";
            botonConfirmar.textContent = "Confirmar asistencia";

            const botonDeclinar = document.createElement("button");
            botonDeclinar.type = "button";
            botonDeclinar.className =
                "rsvp-button rsvp-button-secondary";
            botonDeclinar.textContent = "No podré asistir";

            function actualizarEstadoVisual(asistencia) {

                if (asistencia === "CONFIRMADO") {
                    respuestaActual.textContent = "Asistencia confirmada";

                    botonConfirmar.classList.add("selected");
                    botonDeclinar.classList.remove("selected");

                } else if (asistencia === "DECLINADO") {
                    respuestaActual.textContent = "Asistencia declinada";

                    botonDeclinar.classList.add("selected");
                    botonConfirmar.classList.remove("selected");

                } else {
                    respuestaActual.textContent = "Pendiente de respuesta";

                    botonConfirmar.classList.remove("selected");
                    botonDeclinar.classList.remove("selected");
                }
            }

            actualizarEstadoVisual(invitado.asistencia);
           
            
async function generarBoletoPNG(token, nombre) {

    await document.fonts.ready;

    const urlPase =
        `${window.location.origin}/acceso/?token=${encodeURIComponent(token)}`;

    const qrDataURL = await QRCode.toDataURL(urlPase, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: "H"
    });

    const imagenQR = new Image();

    await new Promise((resolve, reject) => {
        imagenQR.onload = resolve;
        imagenQR.onerror = reject;
        imagenQR.src = qrDataURL;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1200;

    const ctx = canvas.getContext("2d");

    // Fondo
    ctx.fillStyle = "#f8f3f3";
    ctx.fillRect(0, 0, 900, 1200);

    // Marco exterior
    ctx.strokeStyle = "#b98a90";
    ctx.lineWidth = 5;
    ctx.strokeRect(25, 25, 850, 1150);

    // Encabezado vino
    ctx.fillStyle = "#722f37";
    ctx.fillRect(45, 45, 810, 300);

    // Encabezado
    ctx.textAlign = "center";
    ctx.fillStyle = "#eadfe1";
    ctx.font = '22px "Montserrat"';
    ctx.fillText("INVITACIÓN EXCLUSIVA", 450, 105);

    // Nombres de los novios
    ctx.fillStyle = "#ffffff";
    ctx.font = '72px "Cormorant Garamond"';
    ctx.fillText("Eric & Yolanda", 450, 205);

    ctx.fillStyle = "#eadfe1";
    ctx.font = '24px "Montserrat"';
    ctx.fillText("NOS CASAMOS", 450, 270);

    // Título del pase
    ctx.fillStyle = "#722f37";
    ctx.font = '48px "Cormorant Garamond"';
    ctx.fillText("Pase de acceso", 450, 435);

    // Invitado
    ctx.fillStyle = "#b98a90";
    ctx.font = '22px "Montserrat"';
    ctx.fillText("INVITADO", 450, 505);

    ctx.fillStyle = "#722f37";
    ctx.font = '48px "Cormorant Garamond"';
    ctx.fillText(nombre, 450, 570, 760);

    // QR
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(275, 620, 350, 350);

    ctx.drawImage(imagenQR, 295, 640, 310, 310);

    // Fecha
    ctx.fillStyle = "#722f37";
    ctx.font = '30px "Montserrat"';
    ctx.fillText("05 · 12 · 2026", 450, 1040);

    // Pie del boleto
    ctx.fillStyle = "#b98a90";
    ctx.font = '22px "Montserrat"';
    ctx.fillText("PASE PERSONAL E INTRANSFERIBLE", 450, 1100);

    ctx.fillStyle = "#722f37";
    ctx.font = '28px "Parisienne"';
    ctx.fillText("Eric & Yolanda", 450, 1140);

    // Descargar PNG
    const enlace = document.createElement("a");

    const nombreArchivo = nombre
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "invitado";

    enlace.download = `pase-${nombreArchivo}.png`;
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();
}


async function mostrarPase(token, nombre) {

    paseContenedor.replaceChildren();

    if (!token) return;

    const tituloPase = document.createElement("h4");
    tituloPase.textContent = "Tu pase de acceso";

    const canvas = document.createElement("canvas");
    canvas.className = "rsvp-pass-qr";

    const botonDescarga = document.createElement("button");
    botonDescarga.type = "button";
    botonDescarga.className = "rsvp-pass-download";
    botonDescarga.textContent = "Descargar mi pase";

    paseContenedor.append(
        tituloPase,
        canvas,
        botonDescarga
    );

    try {

        const urlPase =
            `${window.location.origin}/acceso/?token=${encodeURIComponent(token)}`;

        await QRCode.toCanvas(canvas, urlPase, {
            width: 220,
            margin: 2,
            errorCorrectionLevel: "H"
        });

        botonDescarga.addEventListener("click", async () => {

            botonDescarga.disabled = true;
            botonDescarga.textContent = "Preparando boleto...";

            try {
                await generarBoletoPNG(token, nombre);

            } catch (err) {
                console.error("Error al descargar el pase:", err);
                estado.textContent =
                    "No fue posible generar el boleto. Inténtalo nuevamente.";

            } finally {
                botonDescarga.disabled = false;
                botonDescarga.textContent = "Descargar mi pase";
            }
        });

    } catch (err) {

        paseContenedor.textContent =
            "No fue posible generar tu código QR. Recarga la invitación.";

        console.error("Error al generar el QR:", err);
    }
}

            async function guardarAsistencia(asistencia) {

                botonConfirmar.disabled = true;
                botonDeclinar.disabled = true;

                error.hidden = true;
                error.textContent = "";

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

const resultado = await respuesta.json();

                    invitado.asistencia = asistencia;

                    actualizarEstadoVisual(asistencia);
                    if (
    asistencia === "CONFIRMADO" &&
    resultado.pase &&
    resultado.pase.pase_token
) {
    invitado.pase_token = resultado.pase.pase_token;
    await mostrarPase(invitado.pase_token, invitado.nombre);

} else {
    invitado.pase_token = null;
    paseContenedor.replaceChildren();
}
                    estado.textContent =
                        "Respuesta guardada correctamente para " +
                        invitado.nombre + ".";

                } catch (err) {

                    error.textContent =
                        err instanceof TypeError
                            ? "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo nuevamente."
                            : err.message;

                    error.hidden = false;
                    estado.textContent = "";

                } finally {
                    botonConfirmar.disabled = false;
                    botonDeclinar.disabled = false;
                }
            }

            botonConfirmar.addEventListener("click", () => {
                guardarAsistencia("CONFIRMADO");
            });

            botonDeclinar.addEventListener("click", () => {
                guardarAsistencia("DECLINADO");
            });

            acciones.append(botonConfirmar, botonDeclinar);

            tarjeta.append(
    nombre,
    respuestaActual,
    acciones,
    paseContenedor
);
            if (
    invitado.asistencia === "CONFIRMADO" &&
    invitado.pase_token
) {
    mostrarPase(invitado.pase_token, invitado.nombre);
}
            contenedor.appendChild(tarjeta);
        });

        contenedor.hidden = false;

    } catch (err) {

        error.textContent =
            err instanceof TypeError
                ? "No fue posible conectar con el servidor. Inténtalo nuevamente más tarde."
                : err.message;

        error.hidden = false;

    } finally {
        loading.hidden = true;
    }
}

inicializarConfirmacion();

