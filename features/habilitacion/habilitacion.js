// =========================================================================
// ARCHIVO: features/habilitacion/habilitacion.js
// FUNCIÓN: Registro de visitantes, auto-llenado y filtros de seguridad
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    const bloquearNumeros = function() { this.value = this.value.replace(/[0-9]/g, ''); };
    const soloNumeros = function() { this.value = this.value.replace(/[^0-9]/g, ''); };

    const inputPreNombre = document.getElementById('preNombre');
    const inputHabNombre = document.getElementById('hab-nombre');
    const inputAdminHabNombre = document.getElementById('admin-hab-nombre');
    
    if (inputPreNombre) inputPreNombre.addEventListener('input', bloquearNumeros);
    if (inputHabNombre) inputHabNombre.addEventListener('input', bloquearNumeros);
    if (inputAdminHabNombre) inputAdminHabNombre.addEventListener('input', bloquearNumeros);

    if (document.getElementById('preCelular')) document.getElementById('preCelular').addEventListener('input', soloNumeros);
    if (document.getElementById('hab-celular')) document.getElementById('hab-celular').addEventListener('input', soloNumeros);
    if (document.getElementById('admin-hab-celular')) document.getElementById('admin-hab-celular').addEventListener('input', soloNumeros);

    //  FIX: Añadimos idCelular a la configuración del escuchador 
    const configurarEscuchadorCI = (idCI, idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro) => {
        const inputCI = document.getElementById(idCI);
        if (inputCI) {
            inputCI.addEventListener('input', async function() {
                this.value = this.value.replace(/[^0-9]/g, ''); 
                const ci = this.value.trim();
                
                if (ci.length >= 4) { 
                    await window.verificarYAutoLlenarExpositor(ci, idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
                } else {
                    window.limpiarSiEstabaAutollenado(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
                }
            });
        }
    };

    configurarEscuchadorCI('preCI', 'preNombre', 'preCelular', 'preInst', 'caja-pre-otro', 'preInstOtro');
    configurarEscuchadorCI('hab-ci', 'hab-nombre', 'hab-celular', 'hab-institucion', 'caja-hab-otro', 'hab-institucion-otro');
    configurarEscuchadorCI('admin-hab-ci', 'admin-hab-nombre', 'admin-hab-celular', 'admin-hab-institucion', 'caja-admin-hab-otro', 'admin-hab-institucion-otro'); 
});

window.toggleOtro = function(selectElement, divOtroId, inputOtroId) {
    const divOtro = document.getElementById(divOtroId);
    const inputOtro = document.getElementById(inputOtroId);
    
    if (selectElement.value === "OTRO") {
        divOtro.style.display = "block";
        inputOtro.setAttribute("required", "true");
        inputOtro.focus();
    } else {
        divOtro.style.display = "none";
        inputOtro.removeAttribute("required");
        inputOtro.value = "";
    }
};

//  FIX: Función actualizada para jalar e inyectar el número de celular 
window.verificarYAutoLlenarExpositor = async function(ci, idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro) {
    const inputNombre = document.getElementById(idNombre);
    const inputCelular = document.getElementById(idCelular);
    const selectInst = document.getElementById(idSelectInst);
    const divOtro = document.getElementById(idDivOtro);
    const inputOtro = document.getElementById(idInputOtro);
    
    if (!inputNombre || !selectInst) return;

    try {
        const respuesta = await fetch(`/api/usuarios/${ci}`);
        
        if (respuesta.ok) {
            const data = await respuesta.json();
            
            if (data.rol) {
                const datosUsuario = data.datos;
                const nombreCompleto = datosUsuario.nombre_completo || "";
                const institucionReal = datosUsuario.institucion || (data.rol === "EXPOSITOR" ? "Estudiante UABJB - Ing. de Sistemas" : "No registrada");
                const celularReal = datosUsuario.celular || "";

                selectInst.style.display = "none";
                selectInst.removeAttribute("required");
                
                divOtro.style.display = "block";
                inputOtro.value = institucionReal;
                inputOtro.disabled = true;

                inputNombre.value = nombreCompleto;
                inputNombre.disabled = true;
                
                // Si el usuario tiene celular registrado en la BD, lo inyectamos y bloqueamos
                if (inputCelular && celularReal !== "") {
                    inputCelular.value = celularReal;
                    inputCelular.disabled = true;
                    inputCelular.setAttribute("data-autofilled", "true");
                    inputCelular.style.backgroundColor = "#e2e3e5";
                }
                
                inputNombre.setAttribute("data-autofilled", "true");
                inputOtro.setAttribute("data-autofilled", "true");
                
                inputNombre.style.backgroundColor = "#e2e3e5";
                inputOtro.style.backgroundColor = "#e2e3e5";
                inputOtro.style.color = "#333";
            } else {
                window.limpiarSiEstabaAutollenado(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
            }
        } else {
            window.limpiarSiEstabaAutollenado(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
        }
    } catch (error) {
        console.error("Error al consultar BD:", error);
        window.limpiarSiEstabaAutollenado(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
    }
};

window.limpiarSiEstabaAutollenado = function(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro) {
    const inputNombre = document.getElementById(idNombre);
    const inputCelular = document.getElementById(idCelular);
    const selectInst = document.getElementById(idSelectInst);
    const divOtro = document.getElementById(idDivOtro);
    const inputOtro = document.getElementById(idInputOtro);
    
    if (!inputNombre || !selectInst) return;

    if (inputNombre.getAttribute("data-autofilled") === "true") {
        inputNombre.value = "";
        inputNombre.disabled = false;
        inputNombre.removeAttribute("data-autofilled");
        inputNombre.style.backgroundColor = (idNombre === 'admin-hab-nombre') ? "#fff" : "#f9f9f9";

        // Limpiar también el celular
        if (inputCelular) {
            inputCelular.value = "";
            inputCelular.disabled = false;
            inputCelular.removeAttribute("data-autofilled");
            inputCelular.style.backgroundColor = (idNombre === 'admin-hab-nombre') ? "#fff" : "#f9f9f9";
        }

        selectInst.style.display = "block";
        selectInst.value = ""; 
        selectInst.setAttribute("required", "true");

        divOtro.style.display = "none";
        inputOtro.value = "";
        inputOtro.disabled = false;
        inputOtro.removeAttribute("data-autofilled");
        
        if (idInputOtro === 'preInstOtro') {
            inputOtro.style.backgroundColor = "rgba(255,255,255,0.15)";
            inputOtro.style.color = "#fff";
        } else {
            inputOtro.style.backgroundColor = "#fff";
            inputOtro.style.color = "#333";
        }
    }
};

window.registrarVisitanteBD = async function(e) {
    e.preventDefault();
    
    let idCI, idNombre, idSelectInst, idInputOtro, idBtn, idDivOtro, idCelular;

    if (e.target.id === "form-habilitacion") {
        idCI = 'hab-ci'; idNombre = 'hab-nombre'; idSelectInst = 'hab-institucion';
        idInputOtro = 'hab-institucion-otro'; idBtn = 'btnHabilitar'; idDivOtro = 'caja-hab-otro';
        idCelular = 'hab-celular';
    } else if (e.target.id === "form-admin-habilitacion") {
        idCI = 'admin-hab-ci'; idNombre = 'admin-hab-nombre'; idSelectInst = 'admin-hab-institucion';
        idInputOtro = 'admin-hab-institucion-otro'; idBtn = 'btnAdminHabilitar'; idDivOtro = 'caja-admin-hab-otro';
        idCelular = 'admin-hab-celular';
    } else {
        idCI = 'preCI'; idNombre = 'preNombre'; idSelectInst = 'preInst';
        idInputOtro = 'preInstOtro'; idBtn = null; idDivOtro = 'caja-pre-otro';
        idCelular = 'preCelular';
    }

    const inputNombre = document.getElementById(idNombre);
    const selectInst = document.getElementById(idSelectInst);
    const inputOtro = document.getElementById(idInputOtro);
    const inputCI = document.getElementById(idCI);
    const inputCelular = document.getElementById(idCelular);

    const ciValue = inputCI.value.trim();
    let nombreValue = inputNombre.value.trim();
    const celularValue = inputCelular ? inputCelular.value.trim() : "";
    let instValue = "";
    
    if (selectInst.style.display === "none" || selectInst.value === "OTRO") {
        instValue = inputOtro.value.trim();
        if (instValue === "") {
            alert("⚠️ Por favor, escriba el nombre de su institución manualmente.");
            inputOtro.focus();
            return;
        }
    } else {
        instValue = selectInst.value;
        if (instValue === "" || instValue === null) {
            alert("⚠️ Por favor, seleccione una institución de la lista.");
            selectInst.focus();
            return;
        }
    }
    
    const btn = idBtn ? document.getElementById(idBtn) : e.target.querySelector('button[type="submit"]');
    const textoOriginal = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;

    try {
        const respuesta = await fetch('/api/visitantes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ci: ciValue,
                nombreCompleto: nombreValue,
                institucion: instValue,
                celular: celularValue
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            alert("⚠️ " + (datos.error || "Error desconocido"));
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            
            e.target.reset();
            window.limpiarSiEstabaAutollenado(idNombre, idCelular, idSelectInst, idDivOtro, idInputOtro);
            inputCI.focus();
            return; 
        }

        alert(datos.mensaje);
        
        e.target.reset(); 
        
        selectInst.style.display = "block";
        selectInst.setAttribute("required", "true");

        const divOtro = document.getElementById(idDivOtro);
        if (divOtro) divOtro.style.display = "none";

        inputNombre.disabled = false;
        inputNombre.removeAttribute("data-autofilled");
        inputNombre.style.backgroundColor = (idNombre === 'admin-hab-nombre') ? "#fff" : "#f9f9f9";

        if (inputCelular) {
            inputCelular.disabled = false;
            inputCelular.removeAttribute("data-autofilled");
            inputCelular.style.backgroundColor = (idNombre === 'admin-hab-nombre') ? "#fff" : "#f9f9f9";
        }

        inputOtro.disabled = false;
        inputOtro.removeAttribute("required");
        inputOtro.removeAttribute("data-autofilled");

        if (idSelectInst === 'preInst') {
            inputOtro.style.backgroundColor = "rgba(255,255,255,0.15)";
            inputOtro.style.color = "#fff";
        } else {
            inputOtro.style.backgroundColor = "#fff";
            inputOtro.style.color = "#333";
        }

        inputCI.focus();

    } catch (error) {
        console.error("Error de conexión con el Backend:", error);
        alert("❌ No se pudo conectar con el servidor. Verifica que Node.js esté encendido.");
    } finally {
        if (btn) {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    }
};

window.handlePreRegistro = window.registrarVisitanteBD;