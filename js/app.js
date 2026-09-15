// =========================================
// PANTALLA DE APERTURA
// =========================================

const openingScreen =
    document.getElementById("opening-screen");

const openInvitation =
    document.getElementById("open-invitation");


openInvitation.addEventListener("click", () => {

    openingScreen.classList.add("hidden");

}); console.log("Invitación de boda cargada correctamente.");


// =========================================
// FECHA DE LA BODA
// =========================================

const fechaBoda = new Date("2026-11-21T17:30:00");


// =========================================
// ELEMENTOS DEL CONTADOR
// =========================================

const dias = document.getElementById("dias");
const horas = document.getElementById("horas");
const minutos = document.getElementById("minutos");
const segundos = document.getElementById("segundos");


// =========================================
// ACTUALIZAR CONTADOR
// =========================================

function actualizarContador() {

    const ahora = new Date();

    const diferencia = fechaBoda - ahora;


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

    const diasRestantes = Math.floor(
        diferencia / (1000 * 60 * 60 * 24)
    );


    const horasRestantes = Math.floor(
        (diferencia / (1000 * 60 * 60)) % 24
    );


    const minutosRestantes = Math.floor(
        (diferencia / (1000 * 60)) % 60
    );


    const segundosRestantes = Math.floor(
        (diferencia / 1000) % 60
    );


    // Mostrar los resultados

    dias.textContent = diasRestantes;

    horas.textContent = String(horasRestantes).padStart(2, "0");

    minutos.textContent = String(minutosRestantes).padStart(2, "0");

    segundos.textContent = String(segundosRestantes).padStart(2, "0");
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

                    entrada.target.classList.add("visible");

                    observer.unobserve(entrada.target);
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

setInterval(actualizarContador, 1000);