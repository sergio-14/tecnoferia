// =========================================================================
// ARCHIVO: features/proyecto/proyecto.js
// FUNCIÓN: Gestión de Proyectos con Cajas Dinámicas Inteligentes
// =========================================================================

window.contadorIntegrantesProyecto = 0;

// 🔥 Función para crear los casilleros dinámicos 🔥
window.agregarCasillaIntegranteProyecto = function(nombre = '', ci = '', celular = '') {
    if (window.contadorIntegrantesProyecto >= 8) {
        alert("El límite máximo por proyecto es de 9 personas (Tú como líder + 8 Compañeros).");
        return;
    }
    
    window.contadorIntegrantesProyecto++;
    const idUnico = `proy-int-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const contenedor = document.getElementById('contenedor-integrantes-proyecto');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.id = idUnico;
    div.style.cssText = "background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 15px; position: relative;";
    
    div.innerHTML = `
        <h5 style="margin-top: 0; color: #4db8ff; margin-bottom: 10px; font-size: 0.95rem;">Compañero #${window.contadorIntegrantesProyecto}</h5>
        <button type="button" class="btn-quitar-int" onclick="document.getElementById('${idUnico}').remove(); window.contadorIntegrantesProyecto--;" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.8rem;"><i class="fas fa-times"></i> Quitar</button>
        
        <div class="input-group" style="margin-bottom: 10px;">
            <label style="font-size: 0.8rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Nombre Completo</label>
            <input type="text" class="input-proy-int-nombre" placeholder="Ej. Ana Soto" value="${nombre}" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); color: white; outline: none;">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="input-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; color: #cbd5e1; display: block; margin-bottom: 5px;">C.I.</label>
                <input type="text" class="input-proy-int-ci" placeholder="Ej. 1234567" value="${ci}" required style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); color: white; outline: none;">
            </div>
            <div class="input-group" style="margin-bottom: 0;">
                <label style="font-size: 0.8rem; color: #cbd5e1; display: block; margin-bottom: 5px;">Celular (Opcional)</label>
                <input type="tel" class="input-proy-int-cel" placeholder="Ej. 71234567" value="${celular}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.05); color: white; outline: none;">
            </div>
        </div>
    `;
    contenedor.appendChild(div);
};

// Función para bloquear o desbloquear las cajas si el proyecto ya fue calificado
window.habilitarCasillasIntegrantes = function(habilitar) {
    const contenedor = document.getElementById('contenedor-integrantes-proyecto');
    if (contenedor) {
        const nodos = contenedor.querySelectorAll('input, button');
        nodos.forEach(n => n.disabled = !habilitar);
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

window.buscarProyectoUsuario = async function(ci) {
    try {
        const respuesta = await fetch(`/api/proyectos/${ci}`);
        const data = await respuesta.json();
        if (data) {
            return {
                data: {
                    tituloProyecto: data.titulo, tipoExpositor: data.categoria, integrantes: data.integrantes,
                    ejeTematico: data.eje_tematico, enlacePDF: data.enlace_pdf, estadoEvaluacion: data.estado_evaluacion,
                    notaTribunal: data.nota_tribunal, notaPonderada: data.nota_ponderada, observacionesTribunal: data.observaciones_tribunal
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
        // Limpiamos los casilleros dinámicos en cada recarga
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
            let mensajeExtra = tiempoAgotado ? `<div style="background: rgba(220, 53, 69, 0.15); color: #ff6b6b; padding: 15px; margin-bottom: 20px; border-radius: 6px; border: 1px solid rgba(220, 53, 69, 0.3);"><i class="fas fa-lock"></i> <b>Bloqueado:</b> El plazo ha finalizado.</div>` : `<div style="background: rgba(59, 130, 246, 0.15); color: #93c5fd; padding: 12px; margin-bottom: 20px;">Puedes hacer modificaciones hasta el <b>${fechaFormateada}</b>.</div>`;
            
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

            // Para mostrar bonito el listado de integrantes en el panel informativo
            let listaNombresFront = "";
            const integrs = proyectoExistente.data.integrantes;
            if (integrs && integrs.includes('|')) {
                const arr = integrs.split('|');
                listaNombresFront = arr.map(i => i.split('-')[0].trim()).join(', ');
            } else {
                listaNombresFront = integrs || "Sin compañeros";
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

            if (!tiempoAgotado) {
                const btnEdicion = document.getElementById('btnActivarEdicion');
                if (btnEdicion) {
                    btnEdicion.addEventListener('click', () => {
                        window.esNuevoIntentoProyecto = false; 
                        if (divEstado) divEstado.style.display = 'none';
                        if (tarjetaBlanca) tarjetaBlanca.style.display = 'block';
                        
                        document.getElementById('proyTitulo').value = proyectoExistente.data.tituloProyecto;
                        document.getElementById('proyEje').value = proyectoExistente.data.ejeTematico;

                        // 🔥 RE-CONSTRUIR LOS CASILLEROS SI VA A EDITAR 🔥
                        if (integrs) {
                            if (integrs.includes('|')) {
                                const partes = integrs.split('|');
                                partes.forEach(p => {
                                    if(!p.trim()) return;
                                    let nombre = '', ciStr = '', cel = '';
                                    const sub = p.split('-');
                                    if(sub[0]) nombre = sub[0].trim();
                                    if(sub[1]) ciStr = sub[1].replace('CI:', '').trim();
                                    if(sub[2]) cel = sub[2].replace('Cel:', '').trim();
                                    window.agregarCasillaIntegranteProyecto(nombre, ciStr, cel !== 'S/N' ? cel : '');
                                });
                            } else {
                                // Soporte para proyectos antiguos guardados con comas
                                const partes = integrs.split(',');
                                partes.forEach(p => {
                                    if(p.trim()) window.agregarCasillaIntegranteProyecto(p.trim(), '', '');
                                });
                            }
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
                    btnNuevo.addEventListener('click', () => {
                        if(confirm("⚠️ ¿Deseas participar con un NUEVO proyecto?\n\nTu proyecto actual quedará guardado en el historial como 'No Clasificado'.\nPodrás empezar una postulación desde cero con un nuevo título y documento.\n\n¿Estás seguro de continuar?")) {
                            window.esNuevoIntentoProyecto = true; 
                            if (divEstado) divEstado.style.display = 'none';
                            if (tarjetaBlanca) tarjetaBlanca.style.display = 'block';
                            
                            document.getElementById('proyTitulo').value = "";
                            document.getElementById('proyTitulo').disabled = false;
                            
                            document.getElementById('proyEje').value = "";
                            document.getElementById('proyEje').disabled = false;

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

                // 🔥 MAGIA DE AUTO-COMPLETADO CON CASILLEROS 🔥
                if (correoLider && window.contadorIntegrantesProyecto === 0) {
                    try {
                        const resUsuarios = await fetch('/api/usuarios_admin');
                        if (resUsuarios.ok) {
                            const dataUsuarios = await resUsuarios.json();
                            // Buscamos a los compañeros (ignoramos al líder porque ya es el dueño)
                            const miGrupo = dataUsuarios.expositores.filter(exp => exp.correo === correoLider && String(exp.id) !== String(ciLocal));
                            
                            if (miGrupo.length > 0) {
                                miGrupo.forEach(exp => {
                                    window.agregarCasillaIntegranteProyecto(exp.nombre_completo, exp.id, exp.celular || '');
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
    if (!ciLocal) {
        alert("❌ Error: Su sesión caducó."); return;
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
        // 🔥 EMPAQUETAMOS LOS DATOS DE LOS CASILLEROS DINÁMICOS 🔥
        let arrIntegrantes = [];
        const noms = document.querySelectorAll('.input-proy-int-nombre');
        const cis = document.querySelectorAll('.input-proy-int-ci');
        const cels = document.querySelectorAll('.input-proy-int-cel');
        
        for(let i=0; i<noms.length; i++) {
            let n = noms[i].value.trim();
            let c = cis[i].value.trim();
            let cel = cels[i].value.trim() || 'S/N';
            if(n && c) {
                // Formato limpio para la base de datos: Nombre - CI: xxx - Cel: xxx | Nombre2 - CI: yyy
                arrIntegrantes.push(`${n} - CI: ${c} - Cel: ${cel}`);
            }
        }
        const finalIntegrantesStr = arrIntegrantes.join(' | ');

        const proyectoExistente = await window.buscarProyectoUsuario(ciLocal);
        const archivoInput = document.getElementById('proyArchivo');
        
        const formData = new FormData();
        formData.append('ciPropietario', ciLocal);
        formData.append('titulo', inputTitulo.value);
        formData.append('categoria', inputTipo.value);
        formData.append('integrantes', finalIntegrantesStr); 
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