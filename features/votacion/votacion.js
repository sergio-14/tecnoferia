// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de Votación y Modo Visitante / Público (Persistencia Reforzada)
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

// 🔥 FUNCIÓN PARA ENTRAR AL SISTEMA COMO PÚBLICO 🔥
window.ingresarComoPublico = async function() {
    const panelVoto = document.getElementById('votar-proyecto');
    if (panelVoto) panelVoto.style.display = 'none';

    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';

    document.body.classList.remove('login-active');
    document.querySelectorAll('.navbar, header, #main-header').forEach(b => {
        b.style.setProperty('display', 'block', 'important');
    });

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.style.display = 'block';
    }

    const menusPrivados = ['nav-mi-proyecto', 'nav-registro', 'nav-evaluacion', 'nav-informes'];
    menusPrivados.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    localStorage.setItem('usuario_rol', 'VISITANTE');
    localStorage.setItem('usuario_datos', JSON.stringify({ ci: 'publico', nombre_completo: 'Visitante Público' }));

    if (typeof navigate === 'function') {
        const btnInicio = document.querySelector('#nav-links-menu li a');
        navigate('inicio', btnInicio);
    }
};

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

// 🔥 GENERADOR SÚPER-PERSISTENTE (Evita colisiones y resiste borrado de caché temporal) 🔥
window.generarIdFuerte = function() {
    // 1. Buscamos en todas las capas de memoria del celular
    let id = localStorage.getItem('feria_device_id') || sessionStorage.getItem('feria_device_id');
    if (!id) {
        let match = document.cookie.match(new RegExp('(^| )feria_device_id=([^;]+)'));
        if (match) id = match[2];
    }

    // Si encontramos el ID guardado, lo restauramos en todas partes
    if (id) {
        localStorage.setItem('feria_device_id', id);
        sessionStorage.setItem('feria_device_id', id);
        document.cookie = "feria_device_id=" + id + "; max-age=31536000; path=/";
        return id;
    }

    // 2. Si es nuevo, generamos un ID único aleatorio (Soluciona el problema de celulares idénticos)
    const randomHash = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const finalId = 'DEV-' + randomHash.toUpperCase();

    // 3. Lo cimentamos en las 3 memorias
    localStorage.setItem('feria_device_id', finalId);
    sessionStorage.setItem('feria_device_id', finalId);
    document.cookie = "feria_device_id=" + finalId + "; max-age=31536000; path=/";
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

            // Usamos el nuevo generador fuerte
            deviceId = window.generarIdFuerte();
            inputCi.value = deviceId;

            // Verificamos si la Base de Datos ya conoce este celular
            try {
                const resUser = await fetch(`/api/usuarios/${deviceId}`);
                if (resUser.ok) {
                    document.getElementById('caja-institucion-visitante').style.display = 'none';
                } else {
                    document.getElementById('caja-institucion-visitante').style.display = 'block';
                    window.cargarInstitucionesParaVoto();
                }
            } catch(e) { console.error(e); }
        }

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');
                
                // 🔥 PROTECCIÓN VISUAL INMEDIATA CONTRA DOBLE VOTO 🔥
                if (deviceId) {
                    try {
                        const resVerif = await fetch(`/api/verificar_voto_duplicado/${deviceId}/${idProy}`);
                        const dataVerif = await resVerif.json();
                        
                        if (dataVerif.yaVoto) {
                            formEl.style.display = 'none'; 
                            tituloEl.style.border = 'none';
                            tituloEl.style.background = 'transparent';
                            tituloEl.innerHTML = `
                                <div style="text-align: center; padding: 20px 10px;">
                                    <i class="fas fa-check-circle" style="font-size: 4.5rem; color: #28a745; margin-bottom: 20px; display: block;"></i>
                                    <h3 style="color: #ffc107; font-size: 1.6rem; margin-bottom: 15px; border:none; padding:0;">¡Voto Registrado!</h3>
                                    <p style="color: #e2e8f0; font-size: 1rem; font-weight: normal; line-height: 1.5; margin-bottom: 20px;">
                                        Tu dispositivo ya emitió un voto válido para la innovación:<br>
                                        <b style="color: #4db8ff; font-size: 1.15rem; display: inline-block; margin-top: 10px;">"${proyecto.titulo}"</b>
                                    </p>
                                    <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 30px;">
                                        <i class="fas fa-shield-alt"></i> Por reglas de la feria, el sistema solo permite un (1) voto por dispositivo para cada stand.
                                    </p>
                                    <button type="button" onclick="window.location.href = window.location.pathname;" style="padding: 14px 20px; background: var(--azul-uab); color: white; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.3s; font-weight: bold; width: 100%; margin-bottom: 15px;">
                                        <i class="fas fa-qrcode"></i> Escanear Otro Proyecto
                                    </button>
                                    <button type="button" onclick="window.ingresarComoPublico()" style="padding: 14px 20px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.3s; font-weight: bold; width: 100%;">
                                        <i class="fas fa-chart-pie"></i> Ver Resultados en Vivo
                                    </button>
                                </div>
                            `;
                            return; 
                        }
                    } catch(e) { console.error("Error al verificar duplicado", e); }
                }

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
    if (cajaInst && cajaInst.style.display !== 'none' && (!selInst || selInst.value === "")) {
        instSeleccionada = false;
    }

    msj.innerHTML = '<span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Conectando dispositivo...</span>';

    if (ciInput.startsWith('DEV-')) {
        // Validación secundaria en caso de que logren evadir la pantalla de bloqueo
        try {
            const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
            const dataVerif = await resVerif.json();
            
            if (dataVerif.yaVoto) {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Este celular ya votó por este proyecto.</span>`;
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
                return;
            }
        } catch(e) {}

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
    
    const cajaInst = document.getElementById('caja-institucion-visitante');
    const selInst = document.getElementById('voto-institucion');
    let institucionVisitante = "Visitante Anónimo (Dispositivo)";
    
    // Solo toma el valor del select si la caja está visible en la pantalla
    if (cajaInst && cajaInst.style.display !== 'none' && selInst && selInst.value) {
        institucionVisitante = selInst.value;
    }

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

        // GPS ACTIVADO
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

        alert("🎉 ¡Voto registrado con éxito! Gracias por participar en la TecnoFeria.");
        window.ingresarComoPublico(); 

    } catch (error) {
        alert("❌ " + error.message);
        btn.innerHTML = 'Confirmar Voto';
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
};

document.addEventListener("DOMContentLoaded", window.cargarProyectoParaVotar);