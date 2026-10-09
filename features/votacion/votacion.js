// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de Votación con Trampa Silenciosa para Expositores
// =========================================================================

window.calificacionActual = 0; 
window.completadosPublico = 0;

function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371e3; 
    const radLat1 = lat1 * Math.PI / 180;
    const radLat2 = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
}

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
    if (mainContent) mainContent.style.display = 'block';

    const menusPrivados = ['nav-mi-proyecto', 'nav-registro', 'nav-evaluacion', 'nav-informes'];
    menusPrivados.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    // Registramos que es visitante, pero SIN borrar la trampa ninja si existe
    localStorage.setItem('usuario_rol', 'VISITANTE');
    
    // Solo sobreescribimos los datos visuales, no la identidad profunda
    const datosActuales = localStorage.getItem('usuario_datos');
    if (!datosActuales || JSON.parse(datosActuales).ci === 'publico') {
        localStorage.setItem('usuario_datos', JSON.stringify({ ci: 'publico', nombre_completo: 'Visitante Público' }));
    }

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
            lista.forEach(inst => { htmlOpciones += `<option value="${inst.nombre}" style="background: #fff; color: #000;">${inst.nombre}</option>`; });
            htmlOpciones += `</optgroup>`;
        }
        htmlOpciones += `<optgroup label="Otros" style="background: #fff; color: #000;"><option value="Visitante Particular / Otro" style="background: #fff; color: #000;">Visitante Particular / Otro</option></optgroup>`;
        selVoto.innerHTML = htmlOpciones;
    } catch (e) { console.error("Error al cargar colegios", e); }
};

window.generarIdFuerte = function() {
    let id = localStorage.getItem('feria_device_id') || sessionStorage.getItem('feria_device_id');
    if (!id) {
        let match = document.cookie.match(new RegExp('(^| )feria_device_id=([^;]+)'));
        if (match) id = match[2];
    }
    if (id) {
        localStorage.setItem('feria_device_id', id);
        sessionStorage.setItem('feria_device_id', id);
        document.cookie = "feria_device_id=" + id + "; max-age=31536000; path=/";
        return id;
    }
    const randomHash = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const finalId = 'DEV-' + randomHash.toUpperCase();
    localStorage.setItem('feria_device_id', finalId);
    sessionStorage.setItem('feria_device_id', finalId);
    document.cookie = "feria_device_id=" + finalId + "; max-age=31536000; path=/";
    return finalId;
};

window.activarModoExpositor = function(e) {
    if(e) e.preventDefault();
    
    document.getElementById('toggle-expositor-container').style.display = 'none';
    const cajaInst = document.getElementById('caja-institucion-visitante');
    if(cajaInst) cajaInst.style.display = 'none';
    
    const cajaCi = document.getElementById('caja-ci-oculta');
    cajaCi.style.display = 'block';
    
    const inputCi = document.getElementById('voto-ci');
    inputCi.value = ''; 
    inputCi.readOnly = false;
    inputCi.focus();
    
    document.getElementById('mensaje-validacion-ci').innerHTML = '<span style="color: #ffc107; font-size: 0.9rem;"><i class="fas fa-info-circle"></i> Escriba su C.I. para verificar su identidad...</span>';
    
    const btn = document.getElementById('btnEnviarVoto');
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
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
        
        // 🔥 INICIO DE LA TRAMPA NINJA 🔥
        let ciTrampa = localStorage.getItem('feria_ci_real_trampa'); // Buscamos si dejó rastro antes
        try {
            const datosStr = localStorage.getItem('usuario_datos');
            if (datosStr) {
                const datos = JSON.parse(datosStr);
                // Si el sistema encuentra que este celular tiene una sesión de usuario real guardada
                if (datos.ci && datos.ci !== 'publico') {
                    ciTrampa = datos.ci;
                    localStorage.setItem('feria_ci_real_trampa', ciTrampa); // Lo marcamos de por vida
                }
            }
        } catch(e) {}
        
        if (inputCi) {
            document.getElementById('caja-ci-oculta').style.display = 'none';

            if (ciTrampa) {
                // EL USUARIO CAYÓ EN LA TRAMPA: Le forzamos su C.I. verdadero silenciosamente
                deviceId = ciTrampa;
                inputCi.value = deviceId;
                document.getElementById('caja-institucion-visitante').style.display = 'none';
                
            } else {
                // Es un visitante 100% puro y anónimo
                deviceId = window.generarIdFuerte();
                inputCi.value = deviceId;

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
        }

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');
                
                // Mostrar botón de expositor SOLO si no cayó en la trampa
                if (!ciTrampa && !document.getElementById('toggle-expositor-container')) {
                    const toggleHtml = `
                        <div id="toggle-expositor-container" style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <a href="#" onclick="window.activarModoExpositor(event)" style="color: #ffc107; font-size: 0.95rem; text-decoration: underline; font-weight: bold; padding: 10px; display: inline-block;">
                                <i class="fas fa-id-badge"></i> ¿Eres Expositor? Vota con tu C.I. aquí
                            </a>
                        </div>
                    `;
                    tituloEl.parentElement.insertAdjacentHTML('afterend', toggleHtml);
                }

                if (deviceId) {
                    try {
                        const resVerif = await fetch(`/api/verificar_voto_duplicado/${deviceId}/${idProy}`);
                        const dataVerif = await resVerif.json();
                        
                        if (dataVerif.yaVoto) {
                            formEl.style.display = 'none'; 
                            if(document.getElementById('toggle-expositor-container')) document.getElementById('toggle-expositor-container').style.display = 'none';
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

                // Si cayó en la trampa ninja, mostramos un pequeño texto advirtiendo que lo reconocimos
                if (ciTrampa) {
                    document.getElementById('caja-ci-oculta').style.display = 'block';
                    inputCi.readOnly = true;
                    document.getElementById('mensaje-validacion-ci').innerHTML = `<span style="color: #4db8ff;"><i class="fas fa-user-secret"></i> Sesión detectada. Votando como: ${ciTrampa}</span>`;
                }

                setTimeout(() => { window.simularVerificacionCI(); }, 300);

            } else {
                document.getElementById('votar-titulo').innerText = "Proyecto no encontrado en la Base de Datos.";
                document.getElementById('votar-titulo').style.color = "#d32f2f";
                document.getElementById('form-votacion').style.display = 'none';
            }
        } catch (error) { console.error(error); }
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

    if (!ciInput) {
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        return;
    }

    msj.innerHTML = '<span style="color: #666;"><i class="fas fa-spinner fa-spin"></i> Verificando conexión...</span>';

    if (ciInput.startsWith('DEV-')) {
        try {
            const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
            const dataVerif = await resVerif.json();
            
            if (dataVerif.yaVoto) {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Este celular ya votó por este proyecto.</span>`;
                btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                return;
            }
        } catch(e) {}

        msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-mobile-alt"></i> Dispositivo Habilitado</span>`;
        
        if (window.completadosPublico === 4 && instSeleccionada) {
            btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
        } else {
            btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        }
        return;
    }

    if (ciInput.length < 5) {
        msj.innerHTML = `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Carnet muy corto...</span>`;
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        return;
    }

    // SI ESCRIBE SU C.I. MANUALMENTE, CAE EN LA TRAMPA Y LO GUARDAMOS PARA SIEMPRE
    localStorage.setItem('feria_ci_real_trampa', ciInput);

    msj.innerHTML = '<span style="color: #4db8ff;"><i class="fas fa-spinner fa-spin"></i> Buscando en Base de Datos...</span>';

    try {
        const res = await fetch(`/api/usuarios/${ciInput}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.datos) {
                try {
                    const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
                    const dataVerif = await resVerif.json();
                    if (dataVerif.yaVoto) {
                        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Ya emitiste tu voto por este proyecto.</span>`;
                        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                        return;
                    }
                } catch(e) {}

                msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-user-check"></i> Hola ${data.datos.nombre_completo} (${data.rol})</span>`;

                if (window.completadosPublico === 4) {
                    btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                }
            }
        } else {
            msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> C.I. no encontrado. Debes estar registrado.</span>`;
            btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        }
    } catch(e) {
        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-wifi"></i> Error de conexión con el servidor.</span>`;
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
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