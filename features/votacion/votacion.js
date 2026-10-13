// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Votación con Huella Digital y Bloqueo Inmediato
// =========================================================================

// 🔥 OBTENER O GENERAR HUELLA DIGITAL 🔥
window.obtenerHuellaDispositivo = function() {
    let deviceId = localStorage.getItem('feria_device_id');
    if (!deviceId) {
        let match = document.cookie.match(new RegExp('(^| )feria_device_id=([^;]+)'));
        if (match) deviceId = match[2];
    }
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
        localStorage.setItem('feria_device_id', deviceId);
        document.cookie = "feria_device_id=" + deviceId + "; max-age=31536000; path=/";
    }
    return deviceId;
};

// Generamos la huella apenas carga el archivo
window.obtenerHuellaDispositivo();

// Congelamiento: Guarda los datos en cuanto los escribe
document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'voto-celular') {
        const val = e.target.value.replace(/[^0-9]/g, '').trim();
        e.target.value = val;
        if (val.length >= 8) localStorage.setItem('feria_ninja_celular', val);
    }
    if (e.target && e.target.id === 'voto-nombre') {
        const val = e.target.value.replace(/[0-9]/g, '').trim();
        if (val.length >= 3) localStorage.setItem('feria_ninja_nombre', val);
    }
});

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
    document.querySelectorAll('.navbar, header, #main-header').forEach(b => { b.style.setProperty('display', 'block', 'important'); });

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = 'block';

    const menusPrivados = ['nav-mi-proyecto', 'nav-registro', 'nav-evaluacion', 'nav-informes'];
    menusPrivados.forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; });

    localStorage.setItem('feria_rol', 'VISITANTE');
    localStorage.setItem('feria_nombre', 'Visitante Público');
    localStorage.setItem('feria_ci', 'publico');

    if (typeof window.applyPermissions === 'function') window.applyPermissions('VISITANTE', 'Visitante Público');
    if (typeof navigate === 'function') navigate('inicio', document.querySelector('#nav-links-menu li a'));
};

window.cargarProyectoParaVotar = async function() {
    const params = new URLSearchParams(window.location.search);
    const idProy = params.get('idProy');
    const deviceId = window.obtenerHuellaDispositivo();

    if (idProy) {
        document.getElementById('login-screen').style.display = 'none';
        document.body.classList.remove('login-active');
        document.querySelectorAll('.navbar, header, #main-header').forEach(b => b.style.setProperty('display', 'none', 'important'));
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'block';
            mainContent.style.setProperty('padding-top', '0px', 'important');
        }
        
        document.getElementById('votar-proyecto').style.display = 'block';

        const inputCel = document.getElementById('voto-celular');
        const inputNom = document.getElementById('voto-nombre');
        const btnEnviar = document.getElementById('btnEnviarVoto');
        
        let savedCelular = localStorage.getItem('feria_ninja_celular');
        let savedNombre = localStorage.getItem('feria_ninja_nombre');

        if(btnEnviar) { btnEnviar.disabled = true; btnEnviar.style.opacity = "0.5"; btnEnviar.style.cursor = "not-allowed"; }

        try {
            const res = await fetch(`/api/proyectos_qr/${idProy}`);
            if (res.ok) {
                const proyecto = await res.json();
                const tituloEl = document.getElementById('votar-titulo');
                const formEl = document.getElementById('form-votacion');

                // 🔥 GOLPE NINJA INMEDIATO 🔥: Le preguntamos al backend ANTES de mostrar el formulario
                let celVerificacion = savedCelular || "0000"; 
                try {
                    const resVerif = await fetch(`/api/verificar_permiso_voto/${celVerificacion}/${idProy}/${deviceId}`);
                    const dataVerif = await resVerif.json();
                    
                    if (!dataVerif.permitido) {
                        formEl.style.display = 'none'; 
                        tituloEl.style.border = 'none';
                        tituloEl.style.background = 'transparent';
                        
                        if (dataVerif.razon === 'ya_voto_dispositivo' || dataVerif.razon === 'ya_voto_celular') {
                            tituloEl.innerHTML = `
                                <div style="text-align: center; padding: 20px 10px;">
                                    <i class="fas fa-check-circle" style="font-size: 4.5rem; color: #28a745; margin-bottom: 20px; display: block;"></i>
                                    <h3 style="color: #ffc107; font-size: 1.6rem; margin-bottom: 15px;">¡Voto Registrado!</h3>
                                    <p style="color: #e2e8f0; font-size: 1rem; margin-bottom: 20px;">Tu dispositivo ya emitió un voto válido para la innovación:<br><b style="color: #4db8ff;">"${proyecto.titulo}"</b></p>
                                    <button onclick="window.location.href = window.location.pathname;" style="padding: 14px; background: var(--azul-uab); color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">Escanea Otro Proyecto</button>
                                </div>
                            `;
                        } else if (dataVerif.razon === 'es_autor') {
                            tituloEl.innerHTML = `
                                <div style="text-align: center; padding: 20px 10px;">
                                    <i class="fas fa-user-secret" style="font-size: 4.5rem; color: #d32f2f; margin-bottom: 20px; display: block;"></i>
                                    <h3 style="color: #ff6b6b; font-size: 1.6rem; margin-bottom: 15px;">¡Acción Bloqueada!</h3>
                                    <p style="color: #e2e8f0; font-size: 1rem; margin-bottom: 20px;">Usted pertenece al equipo responsable de este proyecto:<br><b style="color: #4db8ff;">"${proyecto.titulo}"</b></p>
                                    <p style="color: #ffc107; font-weight: bold; margin-bottom: 30px;"><i class="fas fa-exclamation-triangle"></i> No puedes calificar tu propia innovación.</p>
                                    <button onclick="window.ingresarComoPublico()" style="padding: 14px; background: #28a745; color: white; border: none; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">Ver Resultados</button>
                                </div>
                            `;
                        }
                        return; // Detiene la carga de la pantalla de votación
                    }
                } catch(e) {}

                // Si pasa el escudo ninja, mostramos el proyecto
                tituloEl.innerText = proyecto.titulo;
                document.getElementById('voto-idProy').value = proyecto.id;

                const rolActivo = localStorage.getItem('feria_rol');
                if (rolActivo === 'EXPOSITOR') {
                    savedCelular = localStorage.getItem('feria_ninja_celular') || savedCelular;
                }

                // Congelamiento Visual
                if (savedNombre && inputNom) {
                    inputNom.value = savedNombre;
                    inputNom.readOnly = true;
                    inputNom.style.backgroundColor = "rgba(0,0,0,0.5)";
                    inputNom.style.color = "#94a3b8";
                }
                
                if (savedCelular && inputCel) {
                    inputCel.value = savedCelular;
                    inputCel.readOnly = true;
                    inputCel.style.backgroundColor = "rgba(0,0,0,0.5)";
                    inputCel.style.color = "#94a3b8";
                    
                    window.validarFormularioVoto();
                }

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
    window.validarFormularioVoto(); 
};

window.validarFormularioVoto = async function() {
    const celInput = document.getElementById('voto-celular').value.trim();
    const nomInput = document.getElementById('voto-nombre').value.trim();
    const idProy = document.getElementById('voto-idProy').value;
    const deviceId = window.obtenerHuellaDispositivo();
    const msj = document.getElementById('mensaje-validacion-voto');
    const btn = document.getElementById('btnEnviarVoto');

    if (celInput.length < 8 || nomInput.length < 3) {
        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        msj.innerHTML = "";
        return;
    }

    try {
        const res = await fetch(`/api/verificar_permiso_voto/${celInput}/${idProy}/${deviceId}`);
        const data = await res.json();

        if (!data.permitido) {
            btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
            if (data.razon === 'es_autor') {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Fraude detectado: Perteneces a este equipo.</span>`;
            } else if (data.razon === 'ya_voto_dispositivo') {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Tu dispositivo ya votó por este proyecto.</span>`;
            } else {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> El número ingresado ya emitió un voto aquí.</span>`;
            }
        } else {
            msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Datos válidos. Puedes calificar.</span>`;
            if (window.calificacionActual > 0) {
                btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
            }
        }
    } catch(e) {
        if (window.calificacionActual > 0) {
            btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
        }
    }
};

function obtenerUbicacionGPS() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error("Tu dispositivo no soporta geolocalización.")); }
        navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => {
                let msg = "Error al obtener ubicación.";
                if (error.code === 1) msg = "DENEGADO: Debes darle 'Permitir' a la ubicación GPS para poder votar.";
                if (error.code === 2) msg = "NO DISPONIBLE: No se pudo conectar al satélite GPS.";
                if (error.code === 3) msg = "TIEMPO AGOTADO: El GPS tardó demasiado.";
                reject(new Error(msg));
            }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

window.enviarCalificacion = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnEnviarVoto');
    
    const idProy = document.getElementById('voto-idProy').value;
    const celInput = document.getElementById('voto-celular').value.trim();
    const nomInput = document.getElementById('voto-nombre').value.trim();
    const nota = document.getElementById('voto-puntaje').value;

    btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> Verificando GPS...';
    btn.disabled = true; btn.style.opacity = "0.7"; btn.style.cursor = "wait";

    try {
        const resConf = await fetch('/api/configuraciones');
        const configuracion = await resConf.json();
        
        const position = await obtenerUbicacionGPS();
        const userLat = parseFloat(position.coords.latitude);
        const userLon = parseFloat(position.coords.longitude);

        const LAT_FERIA = parseFloat(configuracion.gps_latitud);
        const LON_FERIA = parseFloat(configuracion.gps_longitud);
        const RADIO_FERIA = parseInt(configuracion.gps_radio, 10);

        const distanciaMetros = calcularDistanciaMetros(LAT_FERIA, LON_FERIA, userLat, userLon);

        if (distanciaMetros > RADIO_FERIA) {
            alert(`⛔ ALERTA: ESTÁS DEMASIADO LEJOS\n\nEstás a ${distanciaMetros.toFixed(0)} metros.\nSolo se permite votar dentro de un radio de ${RADIO_FERIA} metros de la feria.`);
            btn.innerHTML = 'Confirmar Voto'; btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
            return;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

        const res = await fetch('/api/votar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProyecto: idProy,
                celular: celInput,
                nombre: nomInput,
                nota: nota,
                lat: userLat,
                lon: userLon,
                deviceId: window.obtenerHuellaDispositivo()
            })
        });
        
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Error al registrar el voto.");

        alert("🎉 ¡Voto registrado con éxito! Gracias por apoyar las innovaciones tecnológicas.");
        window.ingresarComoPublico(); 

    } catch (error) {
        alert("❌ " + error.message);
        btn.innerHTML = 'Confirmar Voto';
        btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
    }
};

document.addEventListener("DOMContentLoaded", window.cargarProyectoParaVotar);