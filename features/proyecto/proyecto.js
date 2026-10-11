// =========================================================================
// ARCHIVO: features/proyecto/proyecto.js
// FUNCIÓN: Gestión de Proyectos con Lógica Lider/Compañero
// =========================================================================

window.contadorIntegrantesProyecto = 0;

window.agregarCasillaIntegranteProyecto = function(nombre = '', ci = '', celular = '', correo = '', institucion = '', guardado = false) {
    if (window.contadorIntegrantesProyecto >= 8) {
        alert("El límite máximo por proyecto es de 9 personas (Tú como líder + 8 Compañeros).");
        return;
    }
    
    window.contadorIntegrantesProyecto++;
    const idUnico = `proy-int-${Date.now()}`;
    
    const selInstBase = document.getElementById('regInstitucion') || document.getElementById('hab-institucion');
    const opcionesInst = selInstBase ? selInstBase.innerHTML : '<option value="">Cargando opciones...</option>';

    const contenedor = document.getElementById('contenedor-integrantes-proyecto');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.id = idUnico;
    div.className = "integrante-box"; 
    div.style.cssText = "background: rgba(0,0,0,0.25); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; position: relative; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);";
    
    div.innerHTML = `
        <div class="edit-mode" style="display: ${guardado ? 'none' : 'block'};">
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; position: relative;">
                <h5 style="margin: 0; color: #4db8ff; font-size: 1.1rem; padding-right: 40px;"><i class="fas fa-user-edit"></i> Compañero #${window.contadorIntegrantesProyecto}</h5>
                <button type="button" onclick="document.getElementById('${idUnico}').remove(); window.contadorIntegrantesProyecto--;" style="position: absolute; right: 0; top: -5px; background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); font-size: 0.9rem; cursor: pointer; transition: 0.2s; border-radius: 6px; padding: 4px 10px;" onmouseover="this.style.background='rgba(220,53,69,0.3)'" onmouseout="this.style.background='rgba(220,53,69,0.15)'" title="Eliminar"><i class="fas fa-trash"></i> Quitar</button>
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
                    <input type="tel" class="int-celular" placeholder="Ej. 71234567" value="${celular}" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(0,0,0,0.3); color: white; outline: none; box-sizing: border-box;">
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

            <button type="button" onclick="window.guardarIntegranteProyecto('${idUnico}')" style="width: 100%; background: #28a745; color: white; border: none; border-radius: 6px; padding: 14px; cursor: pointer; font-weight: bold; font-size: 1.05rem; box-shadow: 0 4px 10px rgba(40,167,69,0.3); transition: 0.2s;"><i class="fas fa-check-circle"></i> Confirmar y Guardar Compañero</button>
        </div>

        <div class="view-mode" style="display: ${guardado ? 'block' : 'none'};">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="background: rgba(77, 184, 255, 0.15); color: #4db8ff; width: 45px; height: 45px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; border: 1px solid rgba(77, 184, 255, 0.3);">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div>
                        <h4 class="view-nombre" style="margin: 0; color: #ffffff; font-size: 1.1rem; text-transform: capitalize;">${nombre}</h4>
                        <p style="margin: 4px 0 0 0; color: #cbd5e1; font-size: 0.85rem;">
                            <i class="fas fa-id-card" style="color: #94a3b8;"></i> <span class="view-ci">${ci}</span> &nbsp;|&nbsp; 
                            <i class="fas fa-university" style="color: #94a3b8;"></i> <span class="view-inst">${institucion}</span>
                        </p>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" onclick="window.editarIntegranteProyecto('${idUnico}')" style="background: rgba(255,255,255,0.1); color: #ffffff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 8px 12px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                    <button type="button" onclick="document.getElementById('${idUnico}').remove(); window.contadorIntegrantesProyecto--;" style="background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); border-radius: 6px; padding: 8px 12px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(220,53,69,0.3)'" onmouseout="this.style.background='rgba(220,53,69,0.15)'" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `;

    contenedor.appendChild(div);

    if (institucion) {
        setTimeout(() => { const sel = div.querySelector('.int-institucion'); if (sel) sel.value = institucion; }, 50);
    }
};

window.guardarIntegranteProyecto = function(idUnico) {
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

window.editarIntegranteProyecto = function(idUnico) {
    const div = document.getElementById(idUnico);
    div.querySelector('.edit-mode').style.display = 'block';
    div.querySelector('.view-mode').style.display = 'none';
};

window.habilitarCasillasIntegrantes = function(habilitar) {
    const contenedor = document.getElementById('contenedor-integrantes-proyecto');
    if (contenedor) {
        contenedor.querySelectorAll('input, select, button').forEach(n => n.disabled = !habilitar);
    }
    const btnAdd = document.getElementById('btn-add-integrante-proy');
    if (btnAdd) btnAdd.style.display = habilitar ? 'block' : 'none';
};

window.verificarFechaLimite = async function() {
    try {
        const res = await fetch('/api/configuraciones');
        const conf = await res.json();
        const limite = new Date(conf.fecha_subida);
        if (isNaN(limite.getTime())) return true; 
        return new Date() > limite;
    } catch(e) { console.error(e); return true; }
};

window.validarPDF = function(input) {
    if (input.files && input.files.length > 0) {
        const archivo = input.files[0];
        const nombreArchivo = archivo.name.toLowerCase();
        if (archivo.type !== "application/pdf" || !nombreArchivo.endsWith(".pdf")) {
            alert("🛑 BLOQUEO DE SEGURIDAD\n\nÚNICAMENTE se aceptan documentos en formato .PDF legítimo.");
            input.value = ""; return false;
        }
        if (archivo.size < 30 * 1024) { alert(`🛑 ARCHIVO DEMASIADO LIGERO\n\nEl documento parece estar vacío o dañado.`); input.value = ""; return false; }
        if (archivo.size > 25 * 1024 * 1024) { alert(`🛑 ARCHIVO DEMASIADO PESADO\n\nEl límite máximo es de 25 MB.`); input.value = ""; return false; }
        return true;
    }
    return false;
};

// 🔥 LA BÚSQUEDA AHORA SABE SI ERES LÍDER O COMPAÑERO 🔥
window.buscarProyectoUsuario = async function(ci) {
    try {
        const respuesta = await fetch(`/api/proyectos/${ci}`);
        const data = await respuesta.json();
        if (data) {
            return {
                data: {
                    tituloProyecto: data.titulo, tipoExpositor: data.categoria, integrantes: data.integrantes, 
                    ejeTematico: data.eje_tematico, enlacePDF: data.enlace_pdf, estadoEvaluacion: data.estado_evaluacion,
                    notaTribunal: data.nota_tribunal, notaPonderada: data.nota_ponderada, observacionesTribunal: data.observaciones_tribunal,
                    esLider: data.esLider // Bandera secreta enviada desde el servidor
                }
            };
        }
        return null; 
    } catch (error) { return null; }
};

window.cargarDatosProyecto = async function() {
    const ciLocal = localStorage.getItem("feria_ci");
    const rolActual = localStorage.getItem("feria_rol");
    const correoLider = localStorage.getItem('feria_correo'); 
    
    if (!ciLocal) return;

    try {
        window.contadorIntegrantesProyecto = 0;
        const contInt = document.getElementById('contenedor-integrantes-proyecto');
        if (contInt) contInt.innerHTML = '';

        const tarjetaBlanca = document.querySelector('#mi-proyecto .form-card');
        if (tarjetaBlanca) tarjetaBlanca.style.display = 'none';

        let divEstado = document.getElementById('panel-estado-proyecto');
        if (!divEstado && tarjetaBlanca) {
            divEstado = document.createElement('div');
            divEstado.id = 'panel-estado-proyecto';
            tarjetaBlanca.parentNode.insertBefore(divEstado, tarjetaBlanca);
        }
        
        if (rolActual === "ADMIN") {
            if (divEstado) divEstado.style.display = 'none';
            if (tarjetaBlanca) {
                tarjetaBlanca.style.display = 'block';
                document.getElementById('proyTipo').disabled = false;
                const cartelCat = document.getElementById('aviso-cat-bloqueada');
                if (cartelCat) cartelCat.remove();
            }
            return; 
        }

        if (divEstado) {
            divEstado.style.display = 'block';
            divEstado.innerHTML = '<div style="text-align:center; padding:50px; color:#fff;"><i class="fas fa-spinner fa-spin fa-3x"></i><p style="margin-top:15px; font-size:1.1rem;">Cargando tu proyecto...</p></div>';
        }

        let categoriaObligatoria = "estudiantes"; 
        try {
            const resUsu = await fetch(`/api/usuarios/${ciLocal}`);
            if (resUsu.ok) {
                const dataUsu = await resUsu.json();
                if (dataUsu && dataUsu.datos && dataUsu.datos.institucion) {
                    const inst = dataUsu.datos.institucion.toLowerCase();
                    if (inst.includes('docente')) categoriaObligatoria = "docentes";
                    else if (inst.includes('titulado') || inst.includes('universi') || inst.includes('uabjb')) categoriaObligatoria = "emprendimientos";
                }
            }
        } catch(e){}

        const selectTipo = document.getElementById('proyTipo');
        if (selectTipo) {
            selectTipo.value = categoriaObligatoria;
            selectTipo.disabled = true; 
            let cartelCat = document.getElementById('aviso-cat-bloqueada');
            if (!cartelCat) {
                cartelCat = document.createElement('small');
                cartelCat.id = 'aviso-cat-bloqueada';
                cartelCat.style.cssText = 'color: #4db8ff; display: block; margin-top: 5px; font-size: 0.85rem;';
                cartelCat.innerHTML = '<i class="fas fa-lock"></i> Categoría asignada automáticamente según su institución.';
                selectTipo.parentNode.appendChild(cartelCat);
            }
        }

        const proyectoExistente = await window.buscarProyectoUsuario(ciLocal);
        const btnSubir = document.getElementById('btnSubirProyecto');
        const archivoInput = document.getElementById('proyArchivo');
        const tiempoAgotado = await window.verificarFechaLimite(); 
        
        let fechaFormateada = "Fecha Inválida";
        try {
            const resConf = await fetch('/api/configuraciones');
            const dataConf = await resConf.json();
            const limiteVisual = new Date(dataConf.fecha_subida);
            if (!isNaN(limiteVisual.getTime())) {
                const opc = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
                fechaFormateada = limiteVisual.toLocaleDateString('es-ES', opc);
            }
        } catch(e){}

        const cartelFechaFormulario = `<div id="aviso-fecha-form" style="background-color: #e8f4fd; color: #0056b3; padding: 12px 15px; border-radius: 6px; margin-bottom: 20px; font-size: 0.95rem; border-left: 5px solid #0056b3;"><i class="fas fa-calendar-alt"></i> <b>Recordatorio:</b> Tienes hasta el <b>${fechaFormateada}</b> para subir o modificar tu proyecto.</div>`;
        const viejoAviso = document.getElementById('aviso-fecha-form');
        if (viejoAviso) viejoAviso.remove();

        if (proyectoExistente) {
            if (tarjetaBlanca) tarjetaBlanca.style.display = 'none'; 
            if (divEstado) divEstado.style.display = 'block';  
            
            const esLider = proyectoExistente.data.esLider; // Vemos si es el líder
            const urlPDF = proyectoExistente.data.enlacePDF;
            const estadoActual = proyectoExistente.data.estadoEvaluacion || "Pendiente";
            window.enlacePdfExistente = urlPDF; 
            
            let tituloCartel = "¡Proyecto en Evaluación!"; let iconoCartel = "fas fa-check-circle"; let colorPrimario = "#2ecc71";
            let colorFondo = "rgba(0, 0, 0, 0.25)"; let colorBorde = "rgba(46, 204, 113, 0.4)"; let mensajeEstado = "Usted ya subió un proyecto para ser evaluado en la feria.";

            if (estadoActual === "Pre-seleccionado") {
                tituloCartel = "¡Felicidades! Etapa Superada"; iconoCartel = "fas fa-trophy"; colorPrimario = "#ffc107";
                colorFondo = "rgba(255, 193, 7, 0.12)"; colorBorde = "rgba(255, 193, 7, 0.5)"; mensajeEstado = "Tu proyecto ha sido <b style='color: #ffc107;'>PRE-SELECCIONADO</b> por el Tribunal.";
            } else if (estadoActual === "Evaluado (No clasifica)") {
                tituloCartel = "Proyecto Observado (Requiere Mejoras)"; iconoCartel = "fas fa-sync-alt"; colorPrimario = "#f39c12"; 
                colorFondo = "rgba(243, 156, 18, 0.1)"; colorBorde = "rgba(243, 156, 18, 0.3)"; mensajeEstado = "Tu proyecto fue evaluado pero no alcanzó la nota mínima ponderada. <b>¡No te rindas! Corrige las observaciones del tribunal y vuelve a subirlo.</b>";
            }

            let notasHTML = "";
            if (estadoActual !== "Pendiente") {
                notasHTML = `
                <div style="text-align: left; background: rgba(0, 43, 92, 0.4); padding: 20px; border-radius: 8px; border: 1px solid rgba(100, 181, 246, 0.3); border-left: 5px solid #3b82f6; margin-bottom: 20px; font-size: 0.95rem; color: #ffffff;">
                    <h4 style="margin-top: 0; color: #60a5fa; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 10px;">Resultados de Evaluación</h4>
                    <p><b>Nota Tribunal Bruta:</b> ${proyectoExistente.data.notaTribunal || 0} / 100 pts</p>
                    <p><b>Nota Ponderada (80%):</b> ${proyectoExistente.data.notaPonderada || 0} / 80 pts</p>
                    <p style="margin-top: 10px; color: #ffc107;"><b>Observaciones a corregir:</b><br>"${proyectoExistente.data.observacionesTribunal || "Sin comentarios adicionales."}"</p>
                </div>`;
            }

            let botonEdicionHTML = "";
            let mensajeExtra = "";

            // 🔥 COMPROBACIÓN INTELIGENTE DE ROL DE EQUIPO 🔥
            if (!esLider) {
                // SOFÍA (O COMPAÑEROS) LOGUEADA
                mensajeExtra = `
                    <div style="background: rgba(40, 167, 69, 0.15); color: #2ecc71; padding: 18px; margin-bottom: 25px; border-radius: 8px; border: 1px solid rgba(46, 204, 113, 0.3); text-align: left;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <i class="fas fa-users" style="font-size: 2.5rem;"></i>
                            <div>
                                <b style="font-size: 1.1rem;">¡Eres parte de este equipo!</b><br>
                                <span style="font-size: 0.9rem; color: #e2e8f0;">El líder del grupo ya presentó oficialmente este proyecto. Como integrante, puedes monitorear su estado aquí, pero <b>solo el líder principal tiene los permisos para editarlo.</b></span>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // LÍDER LOGUEADO
                mensajeExtra = tiempoAgotado ? `<div style="background: rgba(220, 53, 69, 0.15); color: #ff6b6b; padding: 15px; margin-bottom: 20px; border-radius: 6px; border: 1px solid rgba(220, 53, 69, 0.3);"><i class="fas fa-lock"></i> <b>Bloqueado:</b> El plazo ha finalizado.</div>` : `<div style="background: rgba(59, 130, 246, 0.15); color: #93c5fd; padding: 12px; margin-bottom: 20px;">Puedes hacer modificaciones hasta el <b>${fechaFormateada}</b>.</div>`;
                
                if (!tiempoAgotado) {
                    if (estadoActual === "Evaluado (No clasifica)") {
                        botonEdicionHTML = `
                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <button type="button" id="btnActivarEdicion" style="background: #e74c3c; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border:none; color: #fff;">
                                <i class="fas fa-upload"></i> Subir Versión Corregida
                            </button>
                            <button type="button" id="btnNuevoProyecto" style="background: #6c757d; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border:none; color: #fff;" title="Guarda el proyecto actual en el historial y empieza uno nuevo">
                                <i class="fas fa-file-medical"></i> Participar con otro proyecto
                            </button>
                        </div>`;
                    } else {
                        botonEdicionHTML = `<button type="button" id="btnActivarEdicion" style="background: #ffc107; padding: 12px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; border:none; color: #000;"><i class="fas fa-edit"></i> Editar Proyecto</button>`;
                    }
                }
            }

            let listaNombresFront = "";
            let jsonIntegrantes = [];
            const integrsRaw = proyectoExistente.data.integrantes || "";

            if (integrsRaw.includes('|||')) {
                const partes = integrsRaw.split('|||');
                try { jsonIntegrantes = JSON.parse(partes[1].trim()); } catch(e){}
            }

            if (jsonIntegrantes.length > 0) {
                listaNombresFront = jsonIntegrantes.map(i => i.nombre).join(', ');
            } else {
                listaNombresFront = "Sin compañeros extras";
            }

            if (divEstado) {
                divEstado.innerHTML = `
                    <div style="text-align: center; padding: 40px 25px; background: ${colorFondo}; border-radius: 12px; border: 2px dashed ${colorBorde}; margin-bottom: 20px;">
                        <i class="${iconoCartel}" style="font-size: 55px; color: ${colorPrimario}; margin-bottom: 15px;"></i>
                        <h3 style="color: ${colorPrimario}; margin-bottom: 10px;">${tituloCartel}</h3>
                        <p style="color: #e2e8f0; margin-bottom: 25px;">${mensajeEstado}</p>
                        ${mensajeExtra}${notasHTML}
                        <div style="text-align: left; background: rgba(0, 0, 0, 0.3); padding: 22px; border-radius: 8px; margin-bottom: 25px; color: #ffffff;">
                            <p style="margin-bottom: 10px;"><b>📌 Título:</b> ${proyectoExistente.data.tituloProyecto}</p>
                            <p style="margin-bottom: 10px;"><b>📁 Categoría:</b> ${proyectoExistente.data.tipoExpositor}</p>
                            <p style="margin-bottom: 10px;"><b>👥 Compañeros:</b> ${listaNombresFront}</p>
                            <p style="margin-bottom: 0;"><b>🎯 Eje Temático:</b> ${proyectoExistente.data.ejeTematico}</p>
                        </div>
                        <button type="button" onclick="window.abrirVisorPDF('${urlPDF}')" style="padding: 12px 20px; background: #0056b3; color: white; border-radius: 6px; cursor: pointer; border:none; font-weight:bold;">Ver PDF Actual</button>
                        <br><br>${botonEdicionHTML}
                    </div>
                `;
            }

            // Ocultamos las funciones de edición si no es el líder
            if (!tiempoAgotado && esLider) {
                const btnEdicion = document.getElementById('btnActivarEdicion');
                if (btnEdicion) {
                    btnEdicion.addEventListener('click', async () => {
                        window.esNuevoIntentoProyecto = false; 
                        if (divEstado) divEstado.style.display = 'none';
                        if (tarjetaBlanca) tarjetaBlanca.style.display = 'block';
                        
                        document.getElementById('proyTitulo').value = proyectoExistente.data.tituloProyecto;
                        document.getElementById('proyEje').value = proyectoExistente.data.ejeTematico;

                        if (jsonIntegrantes && jsonIntegrantes.length > 0) {
                            jsonIntegrantes.forEach(exp => {
                                window.agregarCasillaIntegranteProyecto(exp.nombre, exp.ci, exp.celular !== 'S/N' ? exp.celular : '', exp.correo, exp.institucion, true);
                            });
                        }

                        if (estadoActual === "Pre-seleccionado") {
                            document.getElementById('proyTitulo').disabled = true;
                            document.getElementById('proyEje').disabled = true;
                            window.habilitarCasillasIntegrantes(false);
                        } else {
                            window.habilitarCasillasIntegrantes(true);
                        }

                        if(btnSubir) btnSubir.innerHTML = estadoActual === "Evaluado (No clasifica)" ? 'Re-enviar a Evaluación' : 'Actualizar Proyecto';
                        if(archivoInput) archivoInput.removeAttribute('required');
                    });
                }

                const btnNuevo = document.getElementById('btnNuevoProyecto');
                if (btnNuevo) {
                    btnNuevo.addEventListener('click', async () => {
                        if(confirm("⚠️ ¿Deseas participar con un NUEVO proyecto?\n\nTu proyecto actual quedará guardado en el historial como 'No Clasificado'.\nPodrás empezar una postulación desde cero con un nuevo título y documento.\n\n¿Estás seguro de continuar?")) {
                            window.esNuevoIntentoProyecto = true; 
                            if (divEstado) divEstado.style.display = 'none';
                            if (tarjetaBlanca) tarjetaBlanca.style.display = 'block';
                            
                            document.getElementById('proyTitulo').value = "";
                            document.getElementById('proyTitulo').disabled = false;
                            document.getElementById('proyEje').value = "";
                            document.getElementById('proyEje').disabled = false;

                            if (jsonIntegrantes && jsonIntegrantes.length > 0) {
                                jsonIntegrantes.forEach(exp => {
                                    window.agregarCasillaIntegranteProyecto(exp.nombre, exp.ci, exp.celular !== 'S/N' ? exp.celular : '', exp.correo, exp.institucion, true);
                                });
                            }

                            window.habilitarCasillasIntegrantes(true);

                            if(btnSubir) btnSubir.innerHTML = 'Enviar Nuevo Proyecto';
                            if(archivoInput) archivoInput.setAttribute('required', 'true');
                        }
                    });
                }
            }
        } else {
            if (tiempoAgotado) {
                if (tarjetaBlanca) tarjetaBlanca.style.display = 'none';
                if (divEstado) {
                    divEstado.style.display = 'block';
                    divEstado.innerHTML = `<div style="text-align: center; padding: 40px; background: rgba(220, 53, 69, 0.15); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 12px; color: #ff6b6b;"><i class="fas fa-lock" style="font-size: 3rem; margin-bottom: 15px;"></i><h3>Inscripciones Cerradas</h3><p>El plazo oficial para subir proyecto ha finalizado.</p></div>`;
                }
            } else {
                if (divEstado) divEstado.style.display = 'none';
                if (tarjetaBlanca) {
                    tarjetaBlanca.style.display = 'block';
                    const formInterno = tarjetaBlanca.querySelector('form');
                    if (formInterno && !document.getElementById('aviso-fecha-form')) {
                        formInterno.insertAdjacentHTML('afterbegin', cartelFechaFormulario);
                    }
                }
                if (archivoInput) archivoInput.setAttribute('required', 'true');

                if (correoLider && window.contadorIntegrantesProyecto === 0) {
                    try {
                        const resUsuarios = await fetch('/api/usuarios_admin');
                        if (resUsuarios.ok) {
                            const dataUsuarios = await resUsuarios.json();
                            const miGrupo = dataUsuarios.expositores.filter(exp => exp.correo === correoLider && String(exp.id) !== String(ciLocal));
                            if (miGrupo.length > 0) {
                                miGrupo.forEach(exp => {
                                    window.agregarCasillaIntegranteProyecto(exp.nombre_completo, exp.id, exp.celular !== 'S/N' ? exp.celular : '', exp.correo, exp.institucion, true);
                                });
                            }
                        }
                    } catch(e) { console.error(e); }
                }
            }
        }
    } catch (error) { console.error("Error al cargar datos:", error); }
};

window.subirProyectoFeria = async function(e) {
    e.preventDefault();
    if (await window.verificarFechaLimite()) {
        alert("❌ Error de Seguridad: El plazo límite ha finalizado."); return;
    }
    const ciLocal = localStorage.getItem("feria_ci");
    const correoLider = localStorage.getItem('feria_correo'); 

    if (!ciLocal) {
        alert("❌ Error: Su sesión caducó."); return;
    }

    let hayCajasAbiertas = false;
    const boxes = document.querySelectorAll('#contenedor-integrantes-proyecto .integrante-box');
    boxes.forEach(box => {
        if (box.querySelector('.edit-mode').style.display !== 'none') hayCajasAbiertas = true;
    });

    if (hayCajasAbiertas) {
        alert("⚠️ Tienes compañeros sin guardar (en modo edición). Por favor, dale al botón verde 'Confirmar y Guardar Compañero' en cada tarjeta o bórralos antes de enviar el proyecto.");
        return;
    }

    const btn = document.getElementById('btnSubirProyecto');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = 'Subiendo al Servidor...';
    btn.disabled = true;

    const inputTitulo = document.getElementById('proyTitulo');
    const inputTipo = document.getElementById('proyTipo');
    const inputEje = document.getElementById('proyEje');
    
    const estabaTituloBloqueado = inputTitulo.disabled;
    const estabaTipoBloqueado = inputTipo.disabled;
    const estabaEjeBloqueado = inputEje.disabled;
    
    inputTitulo.disabled = false; inputTipo.disabled = false; inputEje.disabled = false;

    try {
        let jsonBack = [];

        boxes.forEach(box => {
            const nom = box.querySelector('.int-nombre').value.trim();
            const ced = box.querySelector('.int-ci').value.trim();
            const cel = box.querySelector('.int-celular').value.trim() || 'S/N';
            const cor = box.querySelector('.int-correo').value.trim() || correoLider;
            const inst = box.querySelector('.int-institucion').value;

            if (nom && ced && inst) {
                jsonBack.push({ nombre: nom, ci: ced, celular: cel, correo: cor, institucion: inst }); 
            }
        });

        const stringJsonBack = JSON.stringify(jsonBack); 

        const proyectoExistente = await window.buscarProyectoUsuario(ciLocal);
        const archivoInput = document.getElementById('proyArchivo');
        
        const formData = new FormData();
        formData.append('ciPropietario', ciLocal);
        formData.append('titulo', inputTitulo.value);
        formData.append('categoria', inputTipo.value);
        
        formData.append('integrantesData', stringJsonBack); 
        formData.append('ejeTematico', inputEje.value);

        if (window.esNuevoIntentoProyecto) {
            formData.append('nuevoIntento', 'true');
        } else if (proyectoExistente && proyectoExistente.data.enlacePDF && archivoInput.files.length === 0) {
            formData.append('enlacePdfExistente', window.enlacePdfExistente || proyectoExistente.data.enlacePDF);
        }

        if (archivoInput.files.length > 0) {
            if (!window.validarPDF(archivoInput)) { 
                btn.innerHTML = textoOriginal; btn.disabled = false; return; 
            }
            formData.append('proyArchivo', archivoInput.files[0]); 
        }

        const res = await fetch('/api/proyectos', { method: 'POST', body: formData });
        if (!res.ok) throw new Error("Error guardando en el servidor.");

        window.esNuevoIntentoProyecto = false; 
        alert(" Proyecto guardado y subido correctamente.");
        await window.cargarDatosProyecto();
    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error: " + error.message);
    } finally {
        inputTitulo.disabled = estabaTituloBloqueado;
        inputTipo.disabled = estabaTipoBloqueado;
        inputEje.disabled = estabaEjeBloqueado;
        if(btn) { btn.innerHTML = textoOriginal; btn.disabled = false; }
    }
};

document.addEventListener('click', function(e) {
    const elemento = e.target.closest('a');
    if (elemento && (elemento.textContent || "").toUpperCase().includes("MI PROYECTO")) {
        setTimeout(() => window.cargarDatosProyecto(), 500); 
    }
});