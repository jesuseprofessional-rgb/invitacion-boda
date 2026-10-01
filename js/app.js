// =========================================
// DATOS DE LA BODA
// =========================================

const boda = {

    novios: {
        novio: "Eric Hernández Vargas",
        novia: "Yolanda Álvarez Bonilla"
    },

    fecha: "2026-12-15T14:00:00",

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
    `${ boda.novios.novio } & ${ boda.novios.novia }`;


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