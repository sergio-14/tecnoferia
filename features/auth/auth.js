// =========================================================================
// ARCHIVO: features/auth/auth.js
// FUNCIÓN: Manejo de interfaz de usuario, Login Seguro y Validador de Certificados
// =========================================================================

window.toggleAuthMode = function(event, mode) {
    if (event) event.preventDefault(); 
    const tarjetas = ['login-card', 'register-card', 'recover-card', 'preregister-card'];
    tarjetas.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.style.display = 'none';
    });
    const tarjetaDestino = document.getElementById(mode + '-card');
    if (tarjetaDestino) tarjetaDestino.style.display = 'block';
}

window.handleLogin = async function(e) {
    if(e && typeof e.preventDefault === 'function') e.preventDefault();
    
    const ciIngresado = document.getElementById('userInput').value.trim();
    const p = document.getElementById('passInput').value.trim();

    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando credenciales...';
    btn.disabled = true;
    btn.style.cursor = "not-allowed";
    btn.style.opacity = "0.8";

    try {
        if (ciIngresado.includes("@")) {
            alert("⚠️ Por favor, ingrese su Usuario o Carnet de Identidad (CI).");
            return;
        }

        const respuesta = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identificador: ciIngresado, password: p })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(data.error || "Usuario o contraseña incorrectos.");
        }

        const rol = data.rol;
        const usuarioDB = data.datos;
        const tokenBD = data.token;

        let nombreMostrar = "";
        const partesNombre = (usuarioDB.nombre_completo || "Usuario").trim().split(" ");
        let nombreCorto = partesNombre[0] + (partesNombre.length > 1 ? " " + partesNombre[1] : "");

        if (rol === "ADMIN") nombreMostrar = nombreCorto + " (Administrador)";
        else if (rol === "EXPOSITOR") nombreMostrar = nombreCorto + " (Expositor)";
        else if (rol === "TRIBUNAL") nombreMostrar = (usuarioDB.nombre_completo || "Tribunal") + " (Tribunal)";
        else if (rol === "VISITANTE") nombreMostrar = (usuarioDB.nombre_completo || "Visitante") + " (Público)";

        localStorage.clear();
        localStorage.setItem("feria_correo", usuarioDB.correo || "");
        
        darAccesoAlSistema(rol, nombreMostrar, ciIngresado, tokenBD);

    } catch (error) {
        console.error("[Error Interno]:", error);
        alert("❌ " + error.message);
        const passInput = document.getElementById('passInput');
        if (passInput) { passInput.value = ""; passInput.focus(); }
    } finally {
        if (document.getElementById('login-screen').style.display !== "none") {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            btn.style.cursor = "pointer";
            btn.style.opacity = "1";
        }
    }
}

window.darAccesoAlSistema = function(rol, nombreMostrar, ciUsuario, tokenUsuario) {
    localStorage.setItem("feria_rol", rol);
    localStorage.setItem("feria_nombre", nombreMostrar);
    
    if (ciUsuario && tokenUsuario) {
        localStorage.setItem("feria_ci", ciUsuario);
        localStorage.setItem("feria_token", tokenUsuario);
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    document.getElementById('login-screen').style.display = "none";
    document.getElementById('main-content').style.display = "block";
    document.body.classList.remove('login-active');
    
    if (typeof window.applyPermissions === 'function') window.applyPermissions(rol, nombreMostrar);
    if (typeof window.reiniciarRelojInactividad === 'function') window.reiniciarRelojInactividad();

    window.iniciarMonitoreoSesion();
}

window.logout = function() { 
    localStorage.clear();
    if (window.intervaloMonitoreo) clearInterval(window.intervaloMonitoreo);
    window.location.href = window.location.pathname; 
}

window.intervaloMonitoreo = null;
window.iniciarMonitoreoSesion = function() {
    const ci = localStorage.getItem("feria_ci");
    const token = localStorage.getItem("feria_token");
    
    if (!ci || !token) return;

    if (window.intervaloMonitoreo) clearInterval(window.intervaloMonitoreo);

    window.intervaloMonitoreo = setInterval(async () => {
        try {
            const res = await fetch(`/api/verificar_sesion/${ci}/${token}`);
            if (res.ok) {
                const data = await res.json();
                if (!data.valida) {
                    clearInterval(window.intervaloMonitoreo);
                    alert("🛑 SESIÓN CERRADA AUTOMÁTICAMENTE\n\nEl sistema detectó que alguien ha iniciado sesión con tu cuenta en otro dispositivo.\nPor motivos de seguridad, tu acceso en este dispositivo ha sido desconectado.");
                    window.logout(); 
                }
            }
        } catch (e) {}
    }, 10000); 
};

// =========================================================================
// 🔥 NUEVO: MÓDULO VISUAL DE VALIDACIÓN DE CERTIFICADOS 🔥
// =========================================================================
window.mostrarModalValidacion = function(esValido, datos = null) {
    const modalViejo = document.getElementById('modal-validacion-cert');
    if (modalViejo) modalViejo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-validacion-cert';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,25,50,0.9); z-index: 9999999; display: flex; justify-content: center; align-items: center; padding: 20px; font-family: Arial, sans-serif;';
    
    let contenidoHtml = '';
    if (esValido) {
        const fechaActual = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
        contenidoHtml = `
            <div style="background: #e8f5e9; color: #2e7d32; padding: 15px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; text-align: center; border: 1px solid #c8e6c9;">
                <i class="fas fa-check-circle"></i> Este certificado es válido
            </div>
            <div style="text-align: left; font-size: 0.95rem; color: #333;">
                <div style="display: flex; border-bottom: 1px solid #eee; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">Nombre completo</div>
                    <div style="width: 60%; color: #000; font-weight: bold; text-transform: capitalize;">${datos.nombre_completo.toLowerCase()}</div>
                </div>
                <div style="display: flex; border-bottom: 1px solid #eee; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">C.I. / ID</div>
                    <div style="width: 60%; color: #000;">${datos.ci}</div>
                </div>
                <div style="display: flex; border-bottom: 1px solid #eee; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">Certificado</div>
                    <div style="width: 60%; color: #000;">Participación en TecnoFeria 2026</div>
                </div>
                <div style="display: flex; border-bottom: 1px solid #eee; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">Fecha de emisión</div>
                    <div style="width: 60%; color: #000;">14 de octubre de 2026</div>
                </div>
                <div style="display: flex; border-bottom: 1px solid #eee; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">Fecha de consulta</div>
                    <div style="width: 60%; color: #000;">${fechaActual}</div>
                </div>
                <div style="display: flex; padding: 12px 0;">
                    <div style="width: 40%; color: #666; font-weight: bold;">Estado</div>
                    <div style="width: 60%; color: #28a745; font-weight: bold;">Válido Oficial</div>
                </div>
            </div>
        `;
    } else {
        contenidoHtml = `
            <div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 8px; font-weight: bold; margin-bottom: 20px; text-align: center; border: 1px solid #ffcdd2;">
                <i class="fas fa-times-circle"></i> Certificado no encontrado o inválido
            </div>
            <p style="text-align: center; color: #666; font-size: 0.95rem; line-height: 1.5;">El código identificador ingresado no corresponde a ningún registro oficial emitido por la TecnoFeria 2026.<br><b>El documento físico podría estar alterado o falsificado.</b></p>
        `;
    }

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 100%; max-width: 450px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5); animation: fadeUp 0.3s ease;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #eee;">
                <img src="assets/img/LogoAcreditadaa.png" style="height: 50px; margin-bottom: 10px;">
                <h2 style="margin: 0; color: #002b5c; font-size: 1.3rem;">Verificación Oficial UABJB</h2>
            </div>
            <div style="padding: 25px;">
                ${contenidoHtml}
                <button onclick="document.getElementById('modal-validacion-cert').remove()" style="width: 100%; background: #002b5c; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; margin-top: 20px; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='#004080'" onmouseout="this.style.background='#002b5c'">Cerrar Verificador</button>
            </div>
        </div>
        <style>@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }</style>
    `;
    document.body.appendChild(modal);
};

// 🔥 Función para abrir el buscador manual desde la pantalla de inicio 🔥
window.abrirBuscadorCertificados = function() {
    const modalViejo = document.getElementById('modal-ingreso-cert');
    if (modalViejo) modalViejo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-ingreso-cert';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,25,50,0.9); z-index: 9999999; display: flex; justify-content: center; align-items: center; padding: 20px; font-family: Arial, sans-serif;';
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 100%; max-width: 400px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5); animation: fadeUp 0.3s ease;">
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 1px solid #eee; position: relative;">
                <h2 style="margin: 0; color: #002b5c; font-size: 1.4rem;"><i class="fas fa-shield-alt" style="color: #f39c12;"></i> Verificar Certificado</h2>
                <button onclick="document.getElementById('modal-ingreso-cert').remove()" style="position: absolute; right: 15px; top: 18px; background: none; border: none; font-size: 1.5rem; color: #666; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 25px;">
                <label style="display: block; font-weight: bold; color: #333; margin-bottom: 10px;">Código ID o C.I. del participante</label>
                <input type="text" id="input-verif-cert" placeholder="Ej. 1234567" style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 1.1rem; box-sizing: border-box; margin-bottom: 20px; outline: none; background: #fff; color: #000;">
                
                <button onclick="window.ejecutarValidacionManual()" style="width: 100%; background: #0056b3; color: white; border: none; padding: 14px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: 0.3s;" onmouseover="this.style.background='#004080'" onmouseout="this.style.background='#0056b3'">
                    <i class="fas fa-search"></i> Verificar Autenticidad
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => { document.getElementById('input-verif-cert').focus(); }, 100);
};

window.ejecutarValidacionManual = function() {
    const ci = document.getElementById('input-verif-cert').value.trim();
    if (!ci) { alert('⚠️ Ingrese un código válido.'); return; }
    
    document.getElementById('modal-ingreso-cert').remove();
    
    fetch(`/api/usuarios/${ci}`)
    .then(res => res.json())
    .then(data => {
        if(data && data.datos) {
            data.datos.ci = ci;
            window.mostrarModalValidacion(true, data.datos);
        } else {
            window.mostrarModalValidacion(false);
        }
    }).catch(e => window.mostrarModalValidacion(false));
};

// =========================================================================
// AUTO-LOGIN UNIVERSAL Y CAPTURA DEL QR
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const parametros = new URLSearchParams(window.location.search);
    const accion = parametros.get('action');
    const idProy = parametros.get('idProy'); 

    // 🔥 SI ENTRA POR ESCANEO DE QR DE CERTIFICADO 🔥
    const validarCert = parametros.get('validar_certificado');
    if (validarCert) {
        fetch(`/api/usuarios/${validarCert}`)
        .then(res => res.json())
        .then(data => {
            if(data && data.datos) {
                data.datos.ci = validarCert;
                window.mostrarModalValidacion(true, data.datos);
            } else {
                window.mostrarModalValidacion(false);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }).catch(e => {
            window.mostrarModalValidacion(false);
            window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    if (idProy) return;

    if (accion) {
        localStorage.clear();
        if (window.intervaloMonitoreo) clearInterval(window.intervaloMonitoreo);

        document.getElementById('login-screen').style.display = ""; 
        document.getElementById('main-content').style.display = "none";
        document.body.classList.add('login-active');

        if (accion === 'registro_expositor') {
            window.toggleAuthMode(null, 'register');
        } else if (accion === 'registro_visitante' || accion === 'preregistro') {
            window.toggleAuthMode(null, 'preregister'); 
        }
        return; 
    }

    const rolGuardado = localStorage.getItem("feria_rol");
    const nombreGuardado = localStorage.getItem("feria_nombre");
    const tokenActivo = localStorage.getItem("feria_token");

    if (rolGuardado === "VISITANTE") {
        document.getElementById('login-screen').style.display = "none";
        document.getElementById('main-content').style.display = "block";
        document.body.classList.remove('login-active');
        if (typeof window.applyPermissions === 'function') window.applyPermissions(rolGuardado, nombreGuardado);
        if (typeof window.reiniciarRelojInactividad === 'function') window.reiniciarRelojInactividad();
        window.iniciarMonitoreoSesion(); 
        return; 
    }

    if (rolGuardado && tokenActivo) {
        document.getElementById('login-screen').style.display = "none";
        document.getElementById('main-content').style.display = "block";
        document.body.classList.remove('login-active');
        
        if (typeof window.applyPermissions === 'function') window.applyPermissions(rolGuardado, nombreGuardado);
        if (typeof window.reiniciarRelojInactividad === 'function') window.reiniciarRelojInactividad();
        window.iniciarMonitoreoSesion();
    } else {
        document.getElementById('login-screen').style.display = ""; 
        document.getElementById('main-content').style.display = "none";
        document.body.classList.add('login-active');
    }
});

const TIEMPO_MAXIMO_INACTIVIDAD = 15 * 60 * 1000; 
let temporizadorInactividad;

window.reiniciarRelojInactividad = function() {
    const pantallaPrincipal = document.getElementById('main-content');
    if (pantallaPrincipal && pantallaPrincipal.style.display === "block") {
        clearTimeout(temporizadorInactividad);
        temporizadorInactividad = setTimeout(() => {
            alert(" Por motivos de seguridad, su sesión ha caducado debido a inactividad.\n\nPor favor, vuelva a iniciar sesión.");
            window.logout(); 
        }, TIEMPO_MAXIMO_INACTIVIDAD);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('mousemove', window.reiniciarRelojInactividad);
    window.addEventListener('touchmove', window.reiniciarRelojInactividad);
    window.addEventListener('touchstart', window.reiniciarRelojInactividad);
    window.addEventListener('click', window.reiniciarRelojInactividad);
    window.addEventListener('scroll', window.reiniciarRelojInactividad, true);
    window.addEventListener('keydown', window.reiniciarRelojInactividad);
});