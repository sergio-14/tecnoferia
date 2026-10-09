// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de Votación con Huella Fuerte y Prevención Visual de Duplicados
// =========================================================================

window.calificacionActual = 0; 
window.completadosPublico = 0;

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

window.cargarInstitucionesParaVoto = async function() {
    try {
        const res = await fetch('/api/instituciones');
        const instituciones = await res.json();
        const selVoto = document.getElementById('voto-institucion');

        if (!selVoto) return;

        const grupos = {};
        instituciones.forEach(inst => {
            if (!grupos[inst.tipo]) grupos[inst.tipo] = [];
            grupos[inst.tipo].push(inst);
        });

        let htmlOpciones = '<option value="" disabled selected>Seleccione su colegio...</option>';
        for (const [tipo, lista] of Object.entries(grupos)) {
            htmlOpciones += `<optgroup label="${tipo}" style="background: #fff; color: #000;">`;
            lista.forEach(inst => {
                htmlOpciones += `<option value="${inst.nombre}" style="background: #fff; color: #000;">${inst.nombre}</option>`;
            });
            htmlOpciones += `</optgroup>`;
        }
        htmlOpciones += `
            <optgroup label="Otros" style="background: #fff; color: #000;">
                <option value="Visitante Particular / Otro" style="background: #fff; color: #000;">Visitante Particular / Otro</option>
            </optgroup>
        `;
        selVoto.innerHTML = htmlOpciones;
    } catch (e) {
        console.error("Error al cargar colegios", e);
    }
};

window.generarHuellaDigitalFuerte = async function() {
    let savedId = localStorage.getItem('feria_device_id');
    if(savedId) return savedId;

    const screenW = Math.max(screen.width, screen.height);
    const screenH = Math.min(screen.width, screen.height);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125,1,62,20);
    ctx.fillStyle = "#069";
    ctx.fillText("TecnoFeria2026", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("UABJB", 4, 17);
    const canvasData = canvas.toDataURL();

    const hardwareData = [
        navigator.hardwareConcurrency || 2, 
        screenW + 'x' + screenH,            
        screen.colorDepth || 24,            
        canvasData                          
    ].join('|');

    let hash = 0;
    for (let i = 0; i < hardwareData.length; i++) {
        const char = hardwareData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    
    const finalId = 'DEV-' + Math.abs(hash).toString(36).toUpperCase() + screenW;
    localStorage.setItem('feria_device_id', finalId);
    return finalId;
};

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

        const inputCi = document.getElementById('voto-ci');
        let deviceId = "";
        
        if (inputCi) {
            document.getElementById('caja-ci-oculta').style.display = 'none';

            deviceId = await window.generarHuellaDigitalFuerte();
            inputCi.value = deviceId;

            try {
                const resUser = await fetch(`/api/usuarios/${deviceId}`);
                if (resUser.ok) {
                    document.getElementById('caja-institucion-visitante').style.display = 'none';
                } else {
                    document.getElementById('caja-institucion-visitante').style.display = 'block';
                    window.cargarInstitucionesParaVoto();
                }
            } catch(e) {
                console.error(e);
            }
        }

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');
                
                // 🔥 VERIFICACIÓN INMEDIATA: SI YA VOTÓ, OCULTAMOS TODO Y MOSTRAMOS MENSAJE 🔥
                if (deviceId) {
                    try {
                        const resVerif = await fetch(`/api/verificar_voto_duplicado/${deviceId}/${idProy}`);
                        const dataVerif = await resVerif.json();
                        
                        if (dataVerif.yaVoto) {
                            formEl.style.display = 'none'; // Oculta el formulario de estrellas
                            tituloEl.style.border = 'none';
                            tituloEl.style.background = 'transparent';
                            tituloEl.innerHTML = `
                                <div style="text-align: center; padding: 20px 10px;">
                                    <i class="fas fa-check-circle" style="font-size: 4.5rem; color: #28a745; margin-bottom: 20px; display: block;"></i>
                                    <h3 style="color: #ffc107; font-size: 1.6rem; margin-bottom: 15px; border:none; padding:0;">¡Voto ya registrado!</h3>
                                    <p style="color: #e2e8f0; font-size: 1rem; font-weight: normal; line-height: 1.5; margin-bottom: 20px;">
                                        Tu dispositivo ya emitió un voto válido para la innovación:<br>
                                        <b style="color: #4db8ff; font-size: 1.15rem; display: inline-block; margin-top: 10px;">"${proyecto.titulo}"</b>
                                    </p>
                                    <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 30px;">
                                        <i class="fas fa-shield-alt"></i> Por seguridad, el sistema solo permite un (1) voto por dispositivo para cada stand.
                                    </p>
                                    <button type="button" onclick="window.location.href = window.location.pathname;" style="padding: 14px 20px; background: var(--azul-uab); color: white; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.3s; font-weight: bold; width: 100%;">
                                        <i class="fas fa-qrcode"></i> Escanear Otro Proyecto
                                    </button>
                                </div>
                            `;
                            return; // Cortar ejecución aquí para que no cargue lo demás
                        }
                    } catch(e) { console.error("Error al verificar duplicado", e); }
                }

                // CANDADO DEL TRIBUNAL COMENTADO PARA TUS PRUEBAS
                /*
                const estado = proyecto.estado_evaluacion;
                if (!estado || estado === "Pendiente") { ... }
                */

                tituloEl.innerText = proyecto.titulo;
                document.getElementById('voto-idProy').value = proyecto.id;
                document.getElementById('voto-cat').value = proyecto.categoria;

                setTimeout(() => { window.simularVerificacionCI(); }, 300);

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

window.sumarPublico = function(elemento) {
    if (elemento) {
        let val = elemento.value.replace(/[^0-9]/g, '');
        val = val.replace(/^0+/, '');
        if (val !== "") {
            val = parseInt(val, 10);
            let max = parseInt(elemento.getAttribute('max'), 10);
            if (val > max) val = max;
        }
        elemento.value = val;
    }

    const inputs = document.querySelectorAll('.pub-nota');
    let total = 0; let completados = 0;
    
    inputs.forEach(input => {
        if (input.value !== "") {
            total += parseInt(input.value, 10);
            completados++;
        }
    });

    const votoPuntaje = document.getElementById('voto-puntaje');
    if(votoPuntaje) votoPuntaje.value = total;

    window.calificacionActual = total; 
    window.completadosPublico = completados;
    
    window.simularVerificacionCI();
};

window.simularVerificacionCI = async function() {
    const ciInput = document.getElementById('voto-ci').value.trim();
    const idProy = document.getElementById('voto-idProy').value;
    const msj = document.getElementById('mensaje-validacion-ci');
    const btn = document.getElementById('btnEnviarVoto');

    const cajaInst = document.getElementById('caja-institucion-visitante');
    const selInst = document.getElementById('voto-institucion');
    
    let instSeleccionada = true;
    if (cajaInst && cajaInst.style.display === 'block' && (!selInst || selInst.value === "")) {
        instSeleccionada = false;
    }

    msj.innerHTML = '<span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Conectando dispositivo...</span>';

    if (ciInput.startsWith('DEV-')) {
        msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-mobile-alt"></i> Dispositivo Conectado Correctamente</span>`;
        
        if (window.completadosPublico === 4 && instSeleccionada) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
        } else {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        }
        return;
    }
};

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
    
    const selInst = document.getElementById('voto-institucion');
    const institucionVisitante = (selInst && selInst.value) ? selInst.value : "Visitante Anónimo (Dispositivo)";

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
        
        const cierreStr = configuracion.fecha_cierre_votacion; 
        if (cierreStr) {
            const [dateP, timeP] = cierreStr.split('T');
            const [yy, mm, dd] = dateP.split('-');
            const [hh, mns, ss] = timeP.split(':');
            const fechaCierre = new Date(yy, mm - 1, dd, hh, mns, ss);
            
            if (new Date() > fechaCierre) {
                alert("⏳ El periodo de votación del público ha finalizado.\n\nDirígete a la pantalla de resultados para ver los promedios.");
                btn.innerHTML = 'Confirmar Voto'; btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
                return;
            }
        }

        // 🔥 GPS ACTIVADO PARA TUS PRUEBAS 🔥
        const position = await obtenerUbicacionGPS();
        const userLat = parseFloat(position.coords.latitude);
        const userLon = parseFloat(position.coords.longitude);

        const LAT_FERIA = parseFloat(configuracion.gps_latitud);
        const LON_FERIA = parseFloat(configuracion.gps_longitud);
        const RADIO_FERIA = parseInt(configuracion.gps_radio, 10);

        if (isNaN(LAT_FERIA) || isNaN(LON_FERIA) || isNaN(RADIO_FERIA) || isNaN(userLat) || isNaN(userLon)) {
            alert("⛔ ALERTA DE SEGURIDAD: Su dispositivo devolvió coordenadas corruptas o el GPS está bloqueado.");
            btn.innerHTML = 'Confirmar Voto'; btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
            return;
        }

        const distanciaMetros = calcularDistanciaMetros(LAT_FERIA, LON_FERIA, userLat, userLon);

        if (distanciaMetros > RADIO_FERIA) {
            alert(`⛔ ALERTA DE FRAUDE: ESTÁS DEMASIADO LEJOS\n\nEl sistema detecta que estás a ${distanciaMetros.toFixed(0)} metros de distancia.\nSolo se permite votar dentro de un radio de ${RADIO_FERIA} metros de la ubicación configurada.`);
            btn.innerHTML = 'Confirmar Voto'; btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
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
                lon: userLon,
                institucionVisitante: institucionVisitante
            })
        });
        
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Error al registrar el voto.");

        localStorage.setItem('feria_inst_registrada', 'true');

        alert("🎉 ¡Voto registrado con éxito! Gracias por participar en la TecnoFeria.");
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