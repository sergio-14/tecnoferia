// =========================================================================
// ARCHIVO: features/evaluacion/evaluacion.js
// FUNCIÓN: Módulo de Tribunales conectado a PostgreSQL
// =========================================================================

window.cargarProyectosParaEvaluar = async function() {
    const select = document.getElementById('eval-select-proyecto');
    const btnDoc = document.getElementById('eval-btn-doc');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Buscando proyectos asignados a su perfil...</option>';
    
    try {
        const idTribunal = localStorage.getItem("feria_ci");
        
        if (!idTribunal) { 
            select.innerHTML = '<option value="" disabled selected>Sesión inválida</option>'; return; 
        }

        const resTribunal = await fetch(`/api/tribunal_id/${idTribunal}`);
        const datosTribunal = await resTribunal.json();
        
        if (!datosTribunal) {
            select.innerHTML = '<option value="" disabled selected>No se encontraron sus datos de tribunal.</option>';
            return;
        }

        let proyectosAsignadosArray = [];
        try { 
            proyectosAsignadosArray = JSON.parse(datosTribunal.proyectos_asignados || "[]"); 
            proyectosAsignadosArray = proyectosAsignadosArray.map(id => String(id));
        } catch(e){}

        if (proyectosAsignadosArray.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Aún no se te han asignado proyectos a evaluar.</option>';
            return;
        }

        const resProyectos = await fetch('/api/proyectos_admin');
        const todosLosProyectosRaw = await resProyectos.json();

        // 🔥 LÓGICA DE NUMERACIÓN SINCRONIZADA CON EL ADMIN 🔥
        // 1. Descartamos los proyectos eliminados/rechazados
        const todosLosProyectosValidos = todosLosProyectosRaw.filter(p => p.estado_evaluacion !== 'Evaluado (No clasifica)');
        
        // 2. Creamos un diccionario de números exactos por categoría
        let cEst = 1, cDoc = 1, cEmp = 1;
        let mapeoNumerosGlobales = {};
        
        todosLosProyectosValidos.forEach(p => {
            if(p.categoria.includes('estudiante')) mapeoNumerosGlobales[p.id] = cEst++;
            else if(p.categoria.includes('docente')) mapeoNumerosGlobales[p.id] = cDoc++;
            else if(p.categoria.includes('emprendimiento')) mapeoNumerosGlobales[p.id] = cEmp++;
        });

        let opcionesHTML = '<option value="" disabled selected>Seleccione un proyecto a evaluar...</option>';
        let proyectosEncontrados = 0;

        todosLosProyectosValidos.forEach(p => {
            // Solo carga los proyectos cuyo ID está explícitamente en la lista de asignación
            if (!proyectosAsignadosArray.includes(String(p.id))) return;

            // Extraemos el número oficial del proyecto
            let numeroOficial = mapeoNumerosGlobales[p.id] || 0;
            
            // Marca de "Ya evaluado"
            let extraText = (p.estado_evaluacion === 'Evaluado' || p.estado_evaluacion === 'Pre-seleccionado') ? ' ✅ (Ya evaluado)' : '';
            
            opcionesHTML += `<option value="${p.id}" data-url="${p.enlace_pdf || ''}">#${numeroOficial} - ${p.titulo}${extraText}</option>`;
            proyectosEncontrados++;
        });

        if (proyectosEncontrados === 0) {
            select.innerHTML = '<option value="" disabled selected>No tienes proyectos pendientes en tu lista.</option>';
        } else {
            select.innerHTML = opcionesHTML;
        }

        select.addEventListener('change', function() {
            const opcionSeleccionada = this.options[this.selectedIndex];
            const url = opcionSeleccionada.getAttribute('data-url');
            
            if (url && url !== "undefined" && url !== "") {
                btnDoc.href = "javascript:void(0)";
                btnDoc.onclick = (e) => { e.preventDefault(); window.abrirVisorPDF(url); };
                btnDoc.style.opacity = "1";
                btnDoc.style.cursor = "pointer";
                btnDoc.style.backgroundColor = "var(--azul-uab)";
            } else {
                btnDoc.onclick = (e) => { e.preventDefault(); alert('⚠️ Este proyecto no tiene un documento PDF subido.'); };
                btnDoc.style.opacity = "0.5";
                btnDoc.style.cursor = "not-allowed";
                btnDoc.style.backgroundColor = "#666";
            }
        });
    } catch (error) {
        console.error("Error al cargar proyectos:", error);
        select.innerHTML = '<option value="" disabled selected>❌ Error de conexión</option>';
    }
};

window.guardarEvaluacionTribunal = async function(e) {
    e.preventDefault();
    
    const select = document.getElementById('eval-select-proyecto');
    const nota = parseInt(document.getElementById('eval-nota').value);
    const observaciones = document.getElementById('eval-obs').value.trim();
    const btn = document.querySelector('.btn-tribunal');

    if (select.selectedIndex === 0) {
        alert("⚠️ Por favor, seleccione un proyecto de la lista antes de enviar.");
        return;
    }
    
    let incompletos = false;
    const inputsRubrica = document.querySelectorAll('.trib-nota');
    inputsRubrica.forEach(inp => { if(inp.value === "") incompletos = true; });
    
    if (incompletos || isNaN(nota) || nota < 1 || nota > 100) {
        alert("⛔ VALOR INVÁLIDO:\nDebe completar las 6 casillas de la rúbrica correctamente (sin ceros ni espacios vacíos).");
        return;
    }

    const notaImpacto = inputsRubrica.length > 4 ? parseInt(inputsRubrica[4].value) : 0;

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando y Evaluando...';
    btn.disabled = true;

    try {
        const idTribunal = localStorage.getItem("feria_ci"); 

        const respuesta = await fetch('/api/evaluar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idProyecto: select.value,
                identificadorTribunal: idTribunal,
                notaTribunal: nota,
                notaImpacto: notaImpacto,
                observaciones: observaciones || "El tribunal no dejó comentarios adicionales."
            })
        });

        const dataRespuesta = await respuesta.json();

        if (!respuesta.ok) {
            alert(dataRespuesta.error);
            btn.innerHTML = textoOriginal; btn.disabled = false; return;
        }

        let mensajeCorreo = "";
        if (dataRespuesta.estado === "Pre-seleccionado" || dataRespuesta.estado === "Evaluado") {
            mensajeCorreo = `¡Felicidades! Su proyecto "${dataRespuesta.tituloProyecto}" ha finalizado su evaluación.\nObtuvo ${nota}/100 puntos brutos (${dataRespuesta.notaPonderada}/80 ponderados).\n\n📝 Retroalimentación del jurado:\n"${observaciones}"\n\nPuede ver su posición oficial en el ranking a través de la pestaña de Resultados del sistema.`;
        }

        let correoEnviado = false;
        if (dataRespuesta.correoEstudiante) {
            try {
                if (typeof emailjs !== 'undefined') {
                    emailjs.init({ publicKey: "njcIu3KNPNiVrfy9f" }); 
                    
                    await emailjs.send("service_m4ueyce", "template_0a9gr2t", {
                        to_email: dataRespuesta.correoEstudiante,
                        to_name: dataRespuesta.nombreExpositor, 
                        message: mensajeCorreo    
                    }, "njcIu3KNPNiVrfy9f"); 
                    
                    correoEnviado = true;
                }
            } catch (err) { console.error(err); }
        }

        if(correoEnviado) {
            alert(` ¡Calificación Guardada Oficialmente!\n\nSe envió un correo de notificación automática al expositor informando que su proyecto ha sido evaluado.`);
        } else {
            alert(` ¡Calificación Guardada Oficialmente en la Base de Datos!\n\n⚠️ NOTA: Tu navegador bloqueó EmailJS, por lo que el expositor no recibió el correo automático, pero la nota de ${nota}/100 ya está registrada y procesada en los resultados.`);
        }
        
        document.getElementById('form-evaluacion-tribunal').reset();
        document.getElementById('eval-btn-doc').href = "#";
        document.getElementById('eval-btn-doc').style.opacity = "0.5";
        window.cargarProyectosParaEvaluar(); // 🔥 Actualiza la lista para que aparezca "✅ (Ya evaluado)"

    } catch (error) {
        console.error("Error guardando nota:", error);
        alert("❌ Error de conexión al guardar la evaluación. Reintente.");
    } finally {
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

async function verificarBloqueoTribunal() {
    try {
        const res = await fetch('/api/configuraciones');
        const conf = await res.json();
        
        if (!conf.fecha_apertura_tribunal || conf.fecha_apertura_tribunal.includes('2026-01-01')) return; 

        const fechaAperturaStr = conf.fecha_apertura_tribunal.replace('T', ' ');
        const fechaApertura = new Date(fechaAperturaStr);
        const ahora = new Date();
        
        if (ahora < fechaApertura) {
            document.querySelectorAll('.trib-nota, #eval-obs').forEach(el => {
                el.disabled = true;
                el.style.backgroundColor = "rgba(0,0,0,0.5)";
                el.style.cursor = "not-allowed";
            });
            
            const btnSubmit = document.querySelector('.btn-tribunal');
            if(btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-lock"></i> Evaluación bloqueada hasta: ' + fechaAperturaStr;
                btnSubmit.style.background = '#6c757d';
                btnSubmit.style.cursor = 'not-allowed';
            }
        }
    } catch(e) {}
}

document.addEventListener("click", function(e) {
    if (e.target.innerText && e.target.innerText.includes('EVALUACIÓN')) {
        setTimeout(verificarBloqueoTribunal, 500);
    }
});