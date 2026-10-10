// =========================================================================
// ARCHIVO: features/registro/registro.js
// FUNCIÓN: Registro de expositores a PostgreSQL (Con Integrantes Múltiples)
// =========================================================================

let contadorIntegrantes = 0;

window.addEventListener('DOMContentLoaded', () => {
    const parametros = new URLSearchParams(window.location.search);
    const accion = parametros.get('action');

    if (accion === 'registro_expositor' && typeof toggleAuthMode === 'function') {
        toggleAuthMode(null, 'register');
    }

    const soloLetras = function() { this.value = this.value.replace(/[0-9]/g, ''); };
    const soloNumeros = function() { this.value = this.value.replace(/[^0-9]/g, ''); };

    const inputRegName = document.getElementById('regName');
    const inputRegPhone = document.getElementById('regPhone');

    if (inputRegName) inputRegName.addEventListener('input', soloLetras);
    if (inputRegPhone) inputRegPhone.addEventListener('input', soloNumeros);
});

// 🔥 NUEVO: Función para agregar formularios dinámicos de integrantes 🔥
window.agregarCasillaIntegrante = function() {
    if (contadorIntegrantes >= 8) {
        alert("El límite máximo por proyecto es de 9 personas (1 Líder + 8 Compañeros).");
        return;
    }
    
    contadorIntegrantes++;
    const idUnico = `int-${Date.now()}`;
    
    const contenedor = document.getElementById('contenedor-integrantes-extra');
    const div = document.createElement('div');
    div.id = idUnico;
    div.style.cssText = "background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; position: relative;";
    
    div.innerHTML = `
        <h5 style="margin-top: 0; color: #4db8ff; margin-bottom: 10px; font-size: 0.95rem;">Compañero #${contadorIntegrantes}</h5>
        <button type="button" onclick="document.getElementById('${idUnico}').remove(); window.restarContador();" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;"><i class="fas fa-times"></i> Quitar</button>
        
        <div class="input-group" style="margin-bottom: 10px;">
            <label style="font-size: 0.8rem;">Nombre Completo</label>
            <input type="text" class="input-int-nombre" placeholder="Ej. Ana Soto" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.2); color: white;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="input-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem;">C.I.</label>
                <input type="text" class="input-int-ci" placeholder="Ej. 1234567" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.2); color: white;">
            </div>
            <div class="input-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem;">Celular (Opcional)</label>
                <input type="tel" class="input-int-cel" placeholder="Ej. 71234567" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.2); color: white;">
            </div>
        </div>
    `;
    
    contenedor.appendChild(div);
};

window.restarContador = function() {
    contadorIntegrantes--;
};

window.handleRegister = async function(e) {
    if(e && typeof e.preventDefault === 'function') e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando Grupo...';
    btn.disabled = true;

    try {
        const resConf = await fetch('/api/configuraciones');
        const dataConf = await resConf.json();
        const FECHA_LIMITE_REGISTRO = new Date(dataConf.fecha_registro);

        if (new Date() > FECHA_LIMITE_REGISTRO) {
            alert(" INSCRIPCIONES CERRADAS\n\nEl plazo oficial para registrarse ha finalizado.");
            btn.innerHTML = textoOriginal; btn.disabled = false;
            return;
        }

        const name = document.getElementById('regName').value.trim();
        const ci = document.getElementById('regCI').value.trim();
        const institution = document.getElementById('regInstitucion').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const pass = document.getElementById('regPass').value;
        
        // RECOLECTAR A LOS COMPAÑEROS
        let listaIntegrantes = [];
        const nombresExtra = document.querySelectorAll('.input-int-nombre');
        const cisExtra = document.querySelectorAll('.input-int-ci');
        const celsExtra = document.querySelectorAll('.input-int-cel');
        
        for (let i = 0; i < nombresExtra.length; i++) {
            listaIntegrantes.push({
                nombre: nombresExtra[i].value.trim(),
                ci: cisExtra[i].value.trim(),
                celular: celsExtra[i].value.trim()
            });
        }
        
        const res = await fetch('/api/expositores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ci, 
                nombreCompleto: name, 
                institucion: institution, 
                correo: email, 
                celular: phone, 
                password: pass,
                integrantesExtra: listaIntegrantes // Mandamos el array al servidor
            })
        });

        if (!res.ok) throw new Error("Error guardando datos. Revise que los C.I. no estén repetidos en el sistema.");

        let mensajeExito = `¡Registro del Grupo completado con éxito!\n\nSe ha registrado al líder y a ${listaIntegrantes.length} compañeros.\nPor favor, inicie sesión con su C.I. para subir el proyecto.`;
        alert(mensajeExito);

        //  Limpiar la URL para evitar el bucle al recargar
        window.history.replaceState({}, document.title, window.location.pathname);

        e.target.reset();
        document.getElementById('contenedor-integrantes-extra').innerHTML = ''; // Limpiamos las casillas extra
        contadorIntegrantes = 0;
        
        window.toggleAuthMode(null, 'login');

    } catch (error) {
        console.error("Error técnico al registrar:", error);
        alert(" Ocurrió un error: " + error.message);
    } finally {
        if (btn) { btn.innerHTML = textoOriginal; btn.disabled = false; }
    }
};