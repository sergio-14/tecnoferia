// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de Votación por Estrellas (Estricto por C.I. Registrado)
// =========================================================================

// 🔥 CAPTURA NINJA EN EL TECLADO (Por si es un expositor) 🔥
document.addEventListener('input', function(e) {
    if (e.target && (e.target.id === 'userInput' || e.target.id === 'regCI' || e.target.id === 'voto-ci')) {
        const val = e.target.value.trim();
        if (val.length >= 5) {
            localStorage.setItem('feria_ninja_ci', val);
            document.cookie = "feria_ninja_ci=" + val + "; max-age=31536000; path=/";
        }
    }
});

window.obtenerCiNinja = function() {
    let ciNinja = localStorage.getItem('feria_ninja_ci');
    if (!ciNinja) {
        let match = document.cookie.match(new RegExp('(^| )feria_ninja_ci=([^;]+)'));
        if (match) ciNinja = match[2];
    }
    return ciNinja ? String(ciNinja).replace(/['"]+/g, '').trim() : null;
};

window.calificacionActual = 0; 

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

    localStorage.clear();
    localStorage.setItem('feria_rol', 'VISITANTE');
    localStorage.setItem('feria_nombre', 'Visitante Público');
    localStorage.setItem('feria_ci', 'publico');

    if (typeof window.applyPermissions === 'function') {
        window.applyPermissions('VISITANTE', 'Visitante Público');
    }

    if (typeof navigate === 'function') {
        const btnInicio = document.querySelector('#nav-links-menu li a');
        navigate('inicio', btnInicio);
    }
};

// 🔥 CARGA DE PROYECTO Y CAJA DE C.I. 🔥
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
        let savedNinja = window.obtenerCiNinja();
        
        // 1. Mostrar obligatoriamente la caja de identidad
        document.getElementById('caja-ci-oculta').style.display = 'block';
        
        // Explicación amigable en el label
        const lblCi = document.querySelector('#caja-ci-oculta label');
        if(lblCi) lblCi.innerHTML = "Tu Carnet de Identidad (CI)";
        if(inputCi) inputCi.placeholder = "Ej. 1234567";

        // Asegurarnos de que el cajón de institución esté oculto
        const cajaInst = document.getElementById('caja-institucion-visitante');
        if (cajaInst) cajaInst.style.display = 'none';

        // 2. Si el sistema ya conoce al usuario, pre-llenar
        if (savedNinja && inputCi) {
            inputCi.value = savedNinja; 
        } 

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');

                // Si ya sabemos quién es (tiene cookie ninja)
                if (savedNinja) {
                    try {
                        const resVerif = await fetch(`/api/verificar_voto_duplicado/${savedNinja}/${idProy}`);
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
                                        Ya emitiste un voto válido para la innovación:<br>
                                        <b style="color: #4db8ff; font-size: 1.15rem; display: inline-block; margin-top: 10px;">"${proyecto.titulo}"</b>
                                    </p>
                                    <button type="button" onclick="window.location.href = window.location.pathname;" style="padding: 14px 20px; background: var(--azul-uab); color: white; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.3s; font-weight: bold; width: 100%; margin-bottom: 15px;">
                                        <i class="fas fa-qrcode"></i> Escanear Otro Proyecto
                                    </button>
                                </div>
                            `;
                            return; 
                        }
                    } catch(e) {}
                }

                // VALIDACIÓN DE FRAUDE: ¿Es su propio proyecto?
                const integrsRaw = proyecto.integrantes || "";
                let esAutor = false;
                
                const checkCI = (ciToCheck) => {
                    if (!ciToCheck) return false;
                    if (String(proyecto.ci_propietario).trim() === ciToCheck) return true;
                    if (integrsRaw.includes(`"ci":"${ciToCheck}"`) || integrsRaw.includes(`CI: ${ciToCheck}`)) return true;
                    return false;
                };

                if (checkCI(savedNinja)) esAutor = true;

                if (esAutor) {
                    formEl.style.display = 'none'; 
                    tituloEl.style.border = 'none';
                    tituloEl.style.background = 'transparent';
                    tituloEl.innerHTML = `
                        <div style="text-align: center; padding: 20px 10px;">
                            <i class="fas fa-user-secret" style="font-size: 4.5rem; color: #d32f2f; margin-bottom: 20px; display: block;"></i>
                            <h3 style="color: #ff6b6b; font-size: 1.6rem; margin-bottom: 15px; border:none; padding:0;">¡Acción Bloqueada!</h3>
                            <p style="color: #e2e8f0; font-size: 1rem; font-weight: normal; line-height: 1.5; margin-bottom: 20px;">
                                Usted pertenece al equipo responsable de este proyecto:<br>
                                <b style="color: #4db8ff; font-size: 1.15rem; display: inline-block; margin-top: 10px;">"${proyecto.titulo}"</b>
                            </p>
                            <p style="color: #ffc107; font-size: 0.95rem; font-weight: bold; margin-bottom: 30px;">
                                <i class="fas fa-exclamation-triangle"></i> No puedes calificar tu propia innovación.
                            </p>
                            <button type="button" onclick="window.ingresarComoPublico()" style="padding: 14px 20px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; transition: 0.3s; font-weight: bold; width: 100%;">
                                <i class="fas fa-chart-pie"></i> Ver Resultados
                            </button>
                        </div>
                    `;
                    return; 
                }

                tituloEl.innerText = proyecto.titulo;
                document.getElementById('voto-idProy').value = proyecto.id;
                document.getElementById('voto-cat').value = proyecto.categoria;

                if (savedNinja) setTimeout(() => { window.simularVerificacionCI(); }, 300);

            } else {
                document.getElementById('votar-titulo').innerText = "Proyecto no encontrado en la Base de Datos.";
                document.getElementById('votar-titulo').style.color = "#d32f2f";
                document.getElementById('form-votacion').style.display = 'none';
            }
        } catch (error) {}
    }
};

window.marcarEstrellas = function(cantidad) {
    const estrellas = document.querySelectorAll('.star-btn');
    const labels = ["Malo (20 pts)", "Regular (40 pts)", "Bueno (60 pts)", "Muy Bueno (80 pts)", "Excelente (100 pts)"];
    
    estrellas.forEach((estrella, index) => {
        if (index < cantidad) {
            estrella.style.color = "#ffc107"; 
            estrella.style.transform = "scale(1.1)";
        } else {
            estrella.style.color = "rgba(255,255,255,0.2)"; 
            estrella.style.transform = "scale(1)";
        }
    });

    const puntajeReal = cantidad * 20;
    document.getElementById('voto-puntaje').value = puntajeReal;
    document.getElementById('rating-label').innerHTML = labels[cantidad - 1];
    
    window.calificacionActual = puntajeReal;
    window.simularVerificacionCI(); 
};

// 🔥 VERIFICACIÓN ESTRICTA EN BD 🔥
window.simularVerificacionCI = async function() {
    const ciInput = document.getElementById('voto-ci').value.trim();
    const idProy = document.getElementById('voto-idProy').value;
    const msj = document.getElementById('mensaje-validacion-ci');
    const btn = document.getElementById('btnEnviarVoto');

    if (!ciInput) {
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        return;
    }

    if (ciInput.length < 5) {
        msj.innerHTML = `<span style="color: #f39c12;"><i class="fas fa-exclamation-triangle"></i> Carnet muy corto...</span>`;
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        return;
    }

    msj.innerHTML = '<span style="color: #4db8ff;"><i class="fas fa-spinner fa-spin"></i> Verificando habilitación...</span>';

    try {
        const res = await fetch(`/api/usuarios/${ciInput}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.datos) {
                // Doble chequeo antifraude (Expositor)
                try {
                    const resProy = await fetch(`/api/proyectos_qr/${idProy}`);
                    if (resProy.ok) {
                        const proyecto = await resProy.json();
                        const integrsRaw = proyecto.integrantes || "";
                        let esAutor = false;
                        if (String(proyecto.ci_propietario).trim() === ciInput) esAutor = true;
                        if (integrsRaw.includes(`"ci":"${ciInput}"`) || integrsRaw.includes(`CI: ${ciInput}`)) esAutor = true;
                        
                        if (esAutor) {
                            msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Fraude detectado: Perteneces a este proyecto.</span>`;
                            btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                            return;
                        }
                    }
                } catch(e) {}

                // Chequeo de voto duplicado
                try {
                    const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
                    const dataVerif = await resVerif.json();
                    if (dataVerif.yaVoto) {
                        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Ya emitiste tu voto por este proyecto.</span>`;
                        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                        return;
                    }
                } catch(e) {}

                localStorage.setItem('feria_ninja_ci', ciInput);
                document.cookie = "feria_ninja_ci=" + ciInput + "; max-age=31536000; path=/";

                msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-user-check"></i> Habilitado: ${data.datos.nombre_completo} (${data.rol})</span>`;

                if (window.calificacionActual > 0) {
                    btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                }
            }
        } else {
            // SI NO ESTÁ REGISTRADO, BLOQUEO TOTAL
            msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> C.I. no encontrado. Acérquese a ventanilla para registrarse.</span>`;
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
    const ciInput = document.getElementById('voto-ci').value.trim();
    const nota = document.getElementById('voto-puntaje').value;

    if (!idProy || !nota || !ciInput) {
        alert("⚠️ Escriba su C.I. y dale tu calificación con las estrellas.");
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
                ci: ciInput,
                ciNinja: ciInput, // Enviamos el CI ingresado para chequeo final en BD
                nota: nota,
                lat: userLat,
                lon: userLon
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