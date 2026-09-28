// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de la pantalla pública de votación por QR con GPS Anti-Fraude
// =========================================================================

window.calificacionActual = 0; 

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(radLat1) * Math.cos(radLat2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

window.cargarProyectoParaVotar = async function() {
    const params = new URLSearchParams(window.location.search);
    const idProy = params.get('idProy');

    if (idProy) {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.style.display = 'none';
        document.body.classList.remove('login-active');

        document.querySelectorAll('.navbar, header, #main-header').forEach(b => b.style.setProperty('display', 'none', 'important'));
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.setProperty('padding-top', '0px', 'important');
        }
        
        document.getElementById('votar-proyecto').style.display = 'block';

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');
                const estado = proyecto.estado_evaluacion;
                
                if (!estado || estado === "Pendiente") {
                    tituloEl.innerHTML = `<i class="fas fa-clock"></i> El proyecto <b>"${proyecto.titulo}"</b> aún está siendo evaluado por el Tribunal. Las votaciones públicas no están habilitadas.`;
                    tituloEl.style.color = "#f39c12"; 
                    formEl.style.display = 'none';
                    return;
                } else if (estado === "Evaluado (No clasifica)") {
                    tituloEl.innerHTML = `<i class="fas fa-times-circle"></i> El proyecto <b>"${proyecto.titulo}"</b> no clasificó a la etapa de exposición pública.`;
                    tituloEl.style.color = "#d32f2f"; 
                    formEl.style.display = 'none';
                    return;
                } else if (estado !== "Pre-seleccionado") {
                    tituloEl.innerHTML = `⚠️ Proyecto inactivo o no habilitado.`;
                    tituloEl.style.color = "#d32f2f";
                    formEl.style.display = 'none';
                    return;
                }

                tituloEl.innerText = proyecto.titulo;
                document.getElementById('voto-idProy').value = proyecto.id;
                document.getElementById('voto-cat').value = proyecto.categoria;
            } else {
                document.getElementById('votar-titulo').innerText = "Proyecto no encontrado en la Base de Datos.";
                document.getElementById('votar-titulo').style.color = "#d32f2f";
                document.getElementById('form-votacion').style.display = 'none';
            }
        } catch (error) {
            console.error(error);
        }
    }
};

window.simularVerificacionCI = async function() {
    const ciInput = document.getElementById('voto-ci').value.trim();
    const idProy = document.getElementById('voto-idProy').value;
    const msj = document.getElementById('mensaje-validacion-ci');
    const btn = document.getElementById('btnEnviarVoto');

    if (ciInput.length < 5) {
        msj.innerHTML = ""; 
        btn.disabled = true; 
        btn.style.opacity = "0.5"; 
        btn.style.cursor = "not-allowed";
        return;
    }

    msj.innerHTML = '<span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Buscando visitante...</span>';

    try {
        const res = await fetch(`/api/usuarios/${ciInput}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.datos) {
                
                try {
                    const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
                    const dataVerif = await resVerif.json();
                    
                    if (dataVerif.yaVoto) {
                        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Ya calificaste este proyecto. No puedes votar dos veces.</span>`;
                        btn.disabled = true;
                        btn.style.opacity = "0.5";
                        btn.style.cursor = "not-allowed";
                        return;
                    }
                } catch(e) {}

                msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Habilitado: ${data.datos.nombre_completo}</span>`;
                
                let incompletos = false;
                document.querySelectorAll('.pub-nota').forEach(inp => { if(inp.value === "") incompletos = true; });

                if (window.calificacionActual > 0 && !incompletos) {
                    btn.disabled = false;
                    btn.style.opacity = "1";
                    btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true;
                    btn.style.opacity = "0.5";
                    btn.style.cursor = "not-allowed";
                }
            }
        } else {
            msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> CI no habilitado. Acércate al punto de Habilitación.</span>`;
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        }
    } catch(e) {
        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-exclamation-triangle"></i> Error de conexión.</span>`;
    }
}

function obtenerUbicacionGPS() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Tu dispositivo o navegador no soporta geolocalización."));
        }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => {
                let msg = "Error desconocido al obtener ubicación.";
                if (error.code === 1) msg = "PERMISO DENEGADO: Debes darle 'Permitir' a la solicitud de ubicación GPS en tu pantalla para poder votar.";
                if (error.code === 2) msg = "UBICACIÓN NO DISPONIBLE: No se pudo conectar al satélite GPS. Intenta salir a un lugar más despejado.";
                if (error.code === 3) msg = "TIEMPO AGOTADO: El GPS tardó demasiado en responder.";
                reject(new Error(msg));
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

window.enviarCalificacion = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviarVoto');
    
    const idProy = document.getElementById('voto-idProy').value;
    const ci = document.getElementById('voto-ci').value.trim();
    const nota = document.getElementById('voto-puntaje').value;

    if (!idProy || !nota || !ci) {
        alert("⚠️ Completa todos los campos y la rúbrica.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Verificando Reglas y GPS...';
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "wait";

    try {
        const resConf = await fetch('/api/configuraciones');
        const configuracion = await resConf.json();
        
        //  FIX FRONTEND: Armando la fecha manualmente para obligar al navegador a no equivocarse 🔥
        const cierreStr = configuracion.fecha_cierre_votacion; 
        if (cierreStr) {
            const [dateP, timeP] = cierreStr.split('T');
            const [yy, mm, dd] = dateP.split('-');
            const [hh, mns, ss] = timeP.split(':');
            const fechaCierre = new Date(yy, mm - 1, dd, hh, mns, ss);
            
            if (new Date() > fechaCierre) {
                alert(" El periodo de votación del público ha finalizado.\n\nDirígete a la pantalla de resultados para ver los promedios.");
                btn.innerHTML = 'Confirmar Voto';
                btn.disabled = false;
                btn.style.opacity = "1";
                btn.style.cursor = "pointer";
                return;
            }
        }

        const LAT_FERIA = parseFloat(configuracion.gps_latitud);
        const LON_FERIA = parseFloat(configuracion.gps_longitud);
        const RADIO_FERIA = parseInt(configuracion.gps_radio, 10);

        const position = await obtenerUbicacionGPS();
        const userLat = parseFloat(position.coords.latitude);
        const userLon = parseFloat(position.coords.longitude);

        if (isNaN(LAT_FERIA) || isNaN(LON_FERIA) || isNaN(RADIO_FERIA) || isNaN(userLat) || isNaN(userLon)) {
            alert(" ALERTA DE SEGURIDAD: Su dispositivo devolvió coordenadas corruptas o el GPS está bloqueado.");
            btn.innerHTML = 'Confirmar Voto';
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            return;
        }

        const distanciaMetros = calcularDistanciaMetros(LAT_FERIA, LON_FERIA, userLat, userLon);

        if (isNaN(distanciaMetros) || distanciaMetros > RADIO_FERIA) {
            alert(` ALERTA DE FRAUDE: ESTÁS DEMASIADO LEJOS\n\nEl sistema detecta que estás a ${isNaN(distanciaMetros) ? 'una distancia desconocida' : distanciaMetros.toFixed(0)} metros de la feria.\nSolo se permite votar dentro de un radio de ${RADIO_FERIA} metros del recinto habilitado.`);
            btn.innerHTML = 'Confirmar Voto';
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            return;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando Voto...';
        
        const res = await fetch('/api/votar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProyecto: idProy,
                ci: ci,
                nota: nota,
                lat: userLat,
                lon: userLon
            })
        });
        
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Error al registrar el voto.");

        alert(" ¡Voto registrado con éxito! Gracias por participar en la TecnoFeria.");
        localStorage.clear();
        window.location.href = window.location.pathname; 

    } catch (error) {
        alert("❌ " + error.message);
        btn.innerHTML = 'Confirmar Voto';
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
};

document.addEventListener("DOMContentLoaded", window.cargarProyectoParaVotar);