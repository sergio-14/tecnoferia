// =========================================================================
// ARCHIVO: features/registro/registro.js
// FUNCIÓN: Registro de expositores con Sistema de Tarjetas (Cards)
// =========================================================================

window.contadorRegistro = 0;

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

// 🔥 FUNCIÓN: Crear Tarjeta de Registro (Diseño Corregido) 🔥
window.agregarCasillaIntegrante = function(nombre='', ci='', cel='', correo='', inst='', guardado=false) {
    if (window.contadorRegistro >= 8) {
        alert("El límite máximo por proyecto es de 9 personas (Tú como líder + 8 Compañeros).");
        return;
    }
    
    window.contadorRegistro++;
    const idUnico = `reg-int-${Date.now()}`;
    const contenedor = document.getElementById('contenedor-integrantes-extra');
    if (!contenedor) return;

    const selInstBase = document.getElementById('regInstitucion');
    const opcionesInst = selInstBase ? selInstBase.innerHTML : '<option value="">Cargando opciones...</option>';

    const div = document.createElement('div');
    div.id = idUnico;
    div.className = "integrante-box";
    div.style.cssText = "background: rgba(0,0,0,0.25); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; position: relative; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);";
    
    // 🔥 EL BOTÓN QUITAR AHORA TIENE POSICIÓN ABSOLUTA CORRECTA Y TAMAÑO REDUCIDO 🔥
    div.innerHTML = `
        <!-- MODO EDICIÓN -->
        <div class="edit-mode" style="display: ${guardado ? 'none' : 'block'};">
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; position: relative;">
                <h5 style="margin: 0; color: #4db8ff; font-size: 1.1rem; padding-right: 40px;"><i class="fas fa-user-plus"></i> Compañero #${window.contadorRegistro}</h5>
                <button type="button" onclick="document.getElementById('${idUnico}').remove(); window.contadorRegistro--;" style="position: absolute; right: 0; top: -5px; background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); font-size: 0.9rem; cursor: pointer; transition: 0.2s; border-radius: 6px; padding: 4px 10px;" onmouseover="this.style.background='rgba(220,53,69,0.3)'" onmouseout="this.style.background='rgba(220,53,69,0.15)'" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
            
            <div class="input-group" style="margin-bottom: 15px;">
                <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Nombre Completo</label>
                <input type="text" class="int-nombre" placeholder="Ej. Ana Soto" value="${nombre}" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div class="input-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 5px;">C.I.</label>
                    <input type="text" class="int-ci" placeholder="Ej. 1234567" value="${ci}" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;">
                </div>
                <div class="input-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Celular (Opcional)</label>
                    <input type="tel" class="int-celular" placeholder="Ej. 71234567" value="${cel}" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;">
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div class="input-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Correo Electrónico (Opcional)</label>
                    <input type="email" class="int-correo" placeholder="ejemplo@correo.com" value="${correo}" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;">
                </div>
                <div class="input-group" style="margin-bottom: 0;">
                    <label style="font-size: 0.85rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Institución</label>
                    <select class="int-institucion" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.6); color: white; outline: none; box-sizing: border-box;">
                        ${opcionesInst}
                    </select>
                </div>
            </div>

            <button type="button" onclick="window.guardarCasillaRegistro('${idUnico}')" style="width: 100%; background: #28a745; color: white; border: none; border-radius: 6px; padding: 14px; cursor: pointer; font-weight: bold; font-size: 1.05rem; box-shadow: 0 4px 10px rgba(40,167,69,0.3); transition: 0.2s;"><i class="fas fa-check-circle"></i> Confirmar y Guardar Compañero</button>
        </div>

        <!-- MODO VISTA (Tarjeta) -->
        <div class="view-mode" style="display: ${guardado ? 'block' : 'none'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(77, 184, 255, 0.15); color: #4db8ff; width: 45px; height: 45px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; border: 1px solid rgba(77, 184, 255, 0.3);">
                        <i class="fas fa-user-check"></i>
                    </div>
                    <div>
                        <h4 class="view-nombre" style="margin: 0; color: #ffffff; font-size: 1.1rem; text-transform: capitalize;">${nombre}</h4>
                        <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 0.85rem;">
                            <i class="fas fa-id-card" style="color: #94a3b8;"></i> <span class="view-ci">${ci}</span> &nbsp;|&nbsp; 
                            <i class="fas fa-university" style="color: #94a3b8;"></i> <span class="view-inst">${inst}</span>
                        </p>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button type="button" onclick="window.editarCasillaRegistro('${idUnico}')" style="background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button type="button" onclick="document.getElementById('${idUnico}').remove(); window.contadorRegistro--;" style="background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(220,53,69,0.3)'" onmouseout="this.style.background='rgba(220,53,69,0.15)'" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;

    contenedor.appendChild(div);

    if (inst) {
        setTimeout(() => { const sel = div.querySelector('.int-institucion'); if (sel) sel.value = inst; }, 50);
    }
};

window.guardarCasillaRegistro = function(idUnico) {
    const div = document.getElementById(idUnico);
    const nom = div.querySelector('.int-nombre').value.trim();
    const ci = div.querySelector('.int-ci').value.trim();
    const inst = div.querySelector('.int-institucion').value;

    if (!nom || !ci || !inst) {
        alert("⚠️ Por favor completa obligatoriamente el Nombre, C.I. y la Institución.");
        return;
    }

    div.querySelector('.view-nombre').innerText = nom;
    div.querySelector('.view-ci').innerText = ci;
    div.querySelector('.view-inst').innerText = inst;

    div.querySelector('.edit-mode').style.display = 'none';
    div.querySelector('.view-mode').style.display = 'block';
};

window.editarCasillaRegistro = function(idUnico) {
    const div = document.getElementById(idUnico);
    div.querySelector('.edit-mode').style.display = 'block';
    div.querySelector('.view-mode').style.display = 'none';
};

window.handleRegister = async function(e) {
    if(e && typeof e.preventDefault === 'function') e.preventDefault();
    
    // Verificar si hay tarjetas en modo de edición abiertas
    let hayCajasAbiertas = false;
    const boxes = document.querySelectorAll('#contenedor-integrantes-extra .integrante-box');
    boxes.forEach(box => {
        if (box.querySelector('.edit-mode').style.display !== 'none') hayCajasAbiertas = true;
    });

    if (hayCajasAbiertas) {
        alert("⚠️ Tienes compañeros sin guardar (en modo edición). Por favor, dale al botón verde 'Guardar Compañero' en cada tarjeta o bórralos antes de registrar al grupo.");
        return;
    }

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
        
        // Empaquetar a los compañeros
        let listaIntegrantes = [];
        boxes.forEach(box => {
            const nom = box.querySelector('.int-nombre').value.trim();
            const ced = box.querySelector('.int-ci').value.trim();
            const cel = box.querySelector('.int-celular').value.trim() || 'S/N';
            const cor = box.querySelector('.int-correo').value.trim() || email; 
            const inst = box.querySelector('.int-institucion').value;
            if (nom && ced) {
                listaIntegrantes.push({ nombre: nom, ci: ced, celular: cel, correo: cor, institucion: inst });
            }
        });
        
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
                integrantesExtra: listaIntegrantes 
            })
        });

        if (!res.ok) throw new Error("Error guardando datos. Revise que los C.I. no estén repetidos en el sistema.");

        let mensajeExito = `¡Registro del Grupo completado con éxito!\n\nSe ha registrado al líder y a ${listaIntegrantes.length} compañeros.\nPor favor, inicie sesión con su C.I. para subir el proyecto.`;
        alert(mensajeExito);

        window.history.replaceState({}, document.title, window.location.pathname);
        e.target.reset();
        document.getElementById('contenedor-integrantes-extra').innerHTML = ''; 
        window.contadorRegistro = 0;
        
        window.toggleAuthMode(null, 'login');

    } catch (error) {
        console.error("Error técnico al registrar:", error);
        alert(" Ocurrió un error: " + error.message);
    } finally {
        if (btn) { btn.innerHTML = textoOriginal; btn.disabled = false; }
    }
};