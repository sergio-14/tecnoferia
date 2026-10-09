// =========================================================================
// ARCHIVO: features/votacion/votacion.js
// FUNCIÓN: Lógica de la pantalla pública de votación por QR con Huella Digital y Selección de Institución
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

// 🔥 ALGORITMO ESTRICTO DE HUELLA FÍSICA (Ignora la memoria caché) 🔥
window.generarHuellaDigitalFuerte = async function() {
    // Si ya existe en esta sesión, lo usamos para no recalcular
    let savedId = localStorage.getItem('feria_device_id');
    if(savedId) return savedId;

    // 1. Datos estables de la pantalla
    const screenW = Math.max(screen.width, screen.height);
    const screenH = Math.min(screen.width, screen.height);

    // 2. Renderizado de Canvas (La gráfica de cada celular lo dibuja con diferencias invisibles)
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

    // 3. Juntamos la info del hardware
    const hardwareData = [
        navigator.hardwareConcurrency || 2, // Núcleos del procesador
        screenW + 'x' + screenH,            // Resolución real
        screen.colorDepth || 24,            // Profundidad de color
        canvasData                          // Huella gráfica
    ].join('|');

    // 4. Convertimos a Hash Numérico
    let hash = 0;
    for (let i = 0; i < hardwareData.length; i++) {
        const char = hardwareData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    
    // Retornamos SIEMPRE el mismo ID para ese dispositivo
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
        if (inputCi) {
            document.getElementById('caja-ci-oculta').style.display = 'none';

            // 🔥 1. OBTENER HUELLA FÍSICA ESTRICTA 🔥
            let deviceId = await window.generarHuellaDigitalFuerte();
            inputCi.value = deviceId;

            // 🔥 2. PREGUNTAR A LA BASE DE DATOS SI CONOCE ESTE DISPOSITIVO 🔥
            try {
                const resUser = await fetch(`/api/usuarios/${deviceId}`);
                if (resUser.ok) {
                    // El servidor lo conoce: Ocultar caja de colegio
                    document.getElementById('caja-institucion-visitante').style.display = 'none';
                } else {
                    // El servidor NO lo conoce: Mostrar caja de colegio
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
                
                // CANDADO DEL TRIBUNAL COMENTADO PARA PRUEBAS
                /*
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
        try {
            const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
            const dataVerif = await resVerif.json();
            
            if (dataVerif.yaVoto) {
                msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Este dispositivo ya emitió un voto para este proyecto.</span>`;
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

    if (ciInput.length < 5) {
        msj.innerHTML = ""; btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
        return;
    }

    try {
        const res = await fetch(`/api/usuarios/${ciInput}`);
        if (res.ok) {
            const data = await res.json();
            if (data && data.datos) {
                try {
                    const resVerif = await fetch(`/api/verificar_voto_duplicado/${ciInput}/${idProy}`);
                    const dataVerif = await resVerif.json();
                    if (dataVerif.yaVoto) {
                        msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-ban"></i> Bloqueado: Ya calificaste este proyecto.</span>`;
                        btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                        return;
                    }
                } catch(e) {}

                msj.innerHTML = `<span style="color: #28a745;"><i class="fas fa-check-circle"></i> Habilitado: ${data.datos.nombre_completo}</span>`;

                if (window.completadosPublico === 4 && instSeleccionada) {
                    btn.disabled = false; btn.style.opacity = "1"; btn.style.cursor = "pointer";
                } else {
                    btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
                }
            }
        } else {
            msj.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> CI no habilitado. Acércate al punto de Habilitación.</span>`;
            btn.disabled = true; btn.style.opacity = "0.5"; btn.style.cursor = "not-allowed";
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
    
    const selInst = document.getElementById('voto-institucion');
    const institucionVisitante = (selInst && selInst.value) ? selInst.value : "Visitante Anónimo (Dispositivo)";

    if (!idProy || !nota || !ci) {
        alert("⚠️ Completa todos los campos y la rúbrica.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando Voto...';
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "wait";

    try {
        // CANDADO DE GPS COMENTADO PARA PRUEBAS (Enviando coordenadas en 0)
        
        const position = await obtenerUbicacionGPS();
        const userLat = parseFloat(position.coords.latitude);
        const userLon = parseFloat(position.coords.longitude);
        // Validaciones de distancia...
        

        const res = await fetch('/api/votar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProyecto: idProy,
                ci: ci,
                nota: nota,
                lat: 0, 
                lon: 0, 
                institucionVisitante: institucionVisitante
            })
        });
        
        const resData = await res.json();
        
        if (!res.ok) throw new Error(resData.error || "Error al registrar el voto.");

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