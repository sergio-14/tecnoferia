// =========================================================================
// ARCHIVO: features/informes/informes.js
// FUNCIÓN: Generación de reportes dinámicos con Motor de Búsqueda Flexible EXTREMA
// =========================================================================

const generarCabeceraOficial = (tituloReporte, notaExtra = "") => {
    const extraHtml = notaExtra ? `<p style="font-family: Arial, sans-serif; font-size: 13px; color: #333; margin-bottom: 15px;"><strong>Nota Explicativa:</strong> ${notaExtra}</p>` : "";
    return `
        <div style="text-align: center; margin-bottom: 30px; font-family: Arial, sans-serif;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; color: #000;">Instituto de Investigación Interacción Social y Posgrado</h2>
            <h3 style="margin: 5px 0; font-size: 16px; color: #555;">Tecno Feria 2026 - Universidad Autónoma del Beni José Ballivián</h3>
            <h1 style="margin: 20px 0; font-size: 22px; text-decoration: underline; color: #000;">${tituloReporte}</h1>
            <p style="margin: 0; font-size: 12px; color: #333;">Fecha de emisión: ${new Date().toLocaleDateString()}</p>
        </div>
        ${extraHtml}
    `;
};

const normalizarNombre = str => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const extraerNombresDeProyecto = (integrantesStringRaw, ciLiderStr = "") => {
    if (!integrantesStringRaw) return "No registrado";
    if (integrantesStringRaw.includes('|||')) {
        const partes = integrantesStringRaw.split('|||');
        try {
            const arr = JSON.parse(partes[1].trim());
            const liderP = partes[0].replace('⭐ LÍDER:', '').split('|')[0].trim();
            
            const liderNorm = normalizarNombre(liderP);
            const pLider = liderNorm.split(' ');
            const n1 = pLider[0];
            const a1 = pLider.find(palabra => palabra.length > 2 && palabra !== n1) || '';

            const esElLider = (nombreEvaluar) => {
                const norm = normalizarNombre(nombreEvaluar);
                if (norm === liderNorm) return true;
                if (n1 && a1 && norm.includes(n1) && norm.includes(a1)) return true;
                return false;
            };

            const equipoFiltrado = arr.filter(m => String(m.ci).trim() !== ciLiderStr && !esElLider(m.nombre));
            
            if (equipoFiltrado.length > 0) return `Líder: ${liderP}, Equipo: ` + equipoFiltrado.map(i => i.nombre).join(', ');
            return `Líder: ${liderP}`;
        } catch(e) {}
    }
    return integrantesStringRaw.replace('⭐ LÍDER:', 'Líder:').replace('| 👥 EQUIPO:', ', Equipo:');
};

function inicializarFiltroVisitantes() {
    const tipoSelect = document.getElementById('tipo-informe-select');
    if(!tipoSelect) return;

    tipoSelect.addEventListener('change', async (e) => {
        let subContainer = document.getElementById('sub-filtro-visitantes');
        
        if (e.target.value === 'padron_visitantes') {
            if (!subContainer) {
                subContainer = document.createElement('div');
                subContainer.id = 'sub-filtro-visitantes';
                subContainer.style.margin = '15px 0';
                subContainer.innerHTML = `
                    <label style="display:block; margin-bottom:5px; font-weight:bold; color:#002b5c;">Seleccione la Institución / Colegio:</label>
                    <select id="institucion-select" style="width:100%; padding:10px; border-radius:5px; border:1px solid #ccc; outline:none; font-family: Arial; box-sizing: border-box;">
                        <option value="TODOS">Todas las Instituciones (Padrón General)</option>
                    </select>
                `;
                tipoSelect.parentNode.insertBefore(subContainer, tipoSelect.nextSibling);
                
                try {
                    const res = await fetch('/api/datos_informes');
                    const dbData = await res.json();
                    const instMap = new Map();
                    
                    const procesarInst = (p) => {
                        if (p.institucion) {
                            let inst = p.institucion.trim();
                            instMap.set(inst.toLowerCase(), inst);
                        }
                    };

                    dbData.visitantes.forEach(procesarInst);
                    dbData.expositores.forEach(procesarInst);
                    
                    const selectFiltro = document.getElementById('institucion-select');
                    Array.from(instMap.values()).sort().forEach(inst => {
                        let esColegio = /colegio|unidad educativa|escuela|uab|universidad|normal|instituto|u\.e|fatima|salle|suarez|agosto/i.test(inst);
                        selectFiltro.innerHTML += `<option value="${inst}">${esColegio ? inst : `Visitante Externo - ${inst}`}</option>`;
                    });
                    selectFiltro.addEventListener('change', window.generarVistaPrevia);
                } catch (error) { console.error(error); }
            }
            subContainer.style.display = 'block'; 
        } else {
            if (subContainer) subContainer.style.display = 'none'; 
        }
        window.generarVistaPrevia();
    });
}

document.addEventListener('DOMContentLoaded', inicializarFiltroVisitantes);

window.generarVistaPrevia = async function() {
    const tipoSelect = document.getElementById('tipo-informe-select');
    const valor = tipoSelect.value;
    const areaImpresion = document.getElementById('informe-impresion');
    const btn = document.querySelector('#informes .btn-save');

    if (!valor) return;
    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando Vista Previa...'; btn.disabled = true; }

    areaImpresion.style.display = 'block';
    areaImpresion.innerHTML = '<div style="text-align: center; padding: 40px; color: #333;"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top: 15px; font-weight: bold;">Generando vista previa del documento...</p></div>';

    try {
        const res = await fetch('/api/datos_informes');
        const db = await res.json();
        const { proyectos, expositores, tribunales, visitantes, votos, evaluaciones } = db;

        const obtenerRolesDeProyectos = (ci, nombre) => {
            const roles = [];
            const ciStr = String(ci).trim();
            const nomStr = (nombre || "").toLowerCase().trim();

            for (const p of proyectos) {
                if (p.estado_evaluacion === 'Evaluado (No clasifica)') continue; 
                
                if (String(p.ci_propietario).trim() === ciStr) {
                    roles.push({ tipo: 'LIDER', proyecto: p });
                    continue; 
                }

                let esCoExpositor = false;
                const rawText = (p.integrantes || "").toLowerCase();

                if (p.integrantes && p.integrantes.includes('|||')) {
                    try {
                        const arrInts = JSON.parse(p.integrantes.split('|||')[1].trim());
                        if (arrInts.some(m => String(m.ci).trim() === ciStr)) {
                            esCoExpositor = true;
                        }
                    } catch(e) {}
                }

                if (!esCoExpositor && rawText.includes(ciStr)) {
                    esCoExpositor = true;
                }

                if (!esCoExpositor && nomStr.length > 4 && rawText.includes(nomStr)) {
                    esCoExpositor = true;
                }

                if (!esCoExpositor && nomStr.length > 4) {
                    const partesNombre = nomStr.split(/\s+/);
                    if (partesNombre.length >= 2) {
                        const combo1 = partesNombre[0] + " " + partesNombre[1]; 
                        const combo2 = partesNombre[0] + " " + partesNombre[partesNombre.length - 1]; 
                        if (combo1.length > 5 && rawText.includes(combo1)) esCoExpositor = true;
                        if (combo2.length > 5 && rawText.includes(combo2)) esCoExpositor = true;
                    }
                }

                if (esCoExpositor) {
                    roles.push({ tipo: 'CO-EXPOSITOR', proyecto: p });
                }
            }
            return roles;
        };

        // ==========================================
        // 1. CUADRO DE HONOR Y RANKING
        // ==========================================
        if (valor === "ranking") {
            const diccionarioProyectos = {}; 

            proyectos.forEach(p => {
                if (p.estado_evaluacion === "Pre-seleccionado") {
                    let catName = p.categoria.includes('estudiante') ? "proyectos_estudiantes" :
                                  p.categoria.includes('docente') ? "proyectos_docentes" : "proyectos_emprendimientos";
                    diccionarioProyectos[p.id] = { titulo: p.titulo || "Sin Título", integrantes: extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim()), categoria: catName, sumaTribunal: 0, cantidadTribunal: 0, sumaPublico: 0, cantidadPublico: 0 };
                }
            });

            evaluaciones.forEach(ev => {
                if (diccionarioProyectos[ev.id_proyecto]) {
                    diccionarioProyectos[ev.id_proyecto].sumaTribunal += (parseFloat(ev.nota) || 0);
                    diccionarioProyectos[ev.id_proyecto].cantidadTribunal += 1;
                }
            });

            votos.forEach(v => {
                if (diccionarioProyectos[v.id_proyecto]) {
                    let notaP = parseFloat(v.nota) || 0; 
                    if (notaP > 100) notaP = 100;
                    diccionarioProyectos[v.id_proyecto].sumaPublico += notaP;
                    diccionarioProyectos[v.id_proyecto].cantidadPublico += 1;
                }
            });

            const [topEstudiantes, topDocentes, topEmprendimientos] = [[], [], []];

            Object.values(diccionarioProyectos).forEach(proy => {
                const pT = proy.cantidadTribunal > 0 ? (proy.sumaTribunal / proy.cantidadTribunal) : 0;
                const pP = proy.cantidadPublico > 0 ? (proy.sumaPublico / proy.cantidadPublico) : 0;
                const notaF = (pT * 0.80) + (pP * 0.20);
                const obj = { titulo: proy.titulo, integrantes: proy.integrantes, notaFinal: notaF };
                
                if (proy.categoria === "proyectos_estudiantes") topEstudiantes.push(obj);
                if (proy.categoria === "proyectos_docentes") topDocentes.push(obj);
                if (proy.categoria === "proyectos_emprendimientos") topEmprendimientos.push(obj);
            });

            const ordenar = (a, b) => b.notaFinal - a.notaFinal;
            topEstudiantes.sort(ordenar); topDocentes.sort(ordenar); topEmprendimientos.sort(ordenar);

            const generarTablaHTML = (tituloCat, datos) => {
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 12%;">Posición</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 38%;">Nombre del Proyecto</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 35%;">Expositor / Responsable</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Nota Final</th>
                            </tr>
                        </thead><tbody>`;
                if (datos.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay proyectos.</td></tr>`; } 
                else {
                    datos.forEach((p, index) => {
                        const lugar = index + 1;
                        let colorFondo = (lugar === 1 && p.notaFinal > 0) ? "#fff9e6" : (lugar === 2 && p.notaFinal > 0) ? "#f2f2f2" : (lugar === 3 && p.notaFinal > 0) ? "#ffe6e6" : "#fff";
                        html += `<tr>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; background-color: ${colorFondo};">${lugar}° LUGAR</td>
                            <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${p.titulo}</td>
                            <td style="padding: 10px; border: 1px solid #ccc;">${p.integrantes}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px;">${p.notaFinal.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("CUADRO DE HONOR Y RANKING GENERAL") + 
                generarTablaHTML("1. ESTUDIANTES (PREGRADO)", topEstudiantes) +
                generarTablaHTML("2. DOCENTES INVESTIGADORES", topDocentes) +
                generarTablaHTML("3. EMPRENDIMIENTOS TECNOLÓGICOS", topEmprendimientos) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div>
                </div>`;
        } 

        // ==========================================
        // 2. EJES TEMÁTICOS
        // ==========================================
        else if (valor === "ejes") {
            const ejesOficiales = ["Sistemas de Información para el Desarrollo Regional", "Tecnologías Emergentes y Transformación Digital", "Ingeniería de Software y Aplicaciones Web/Móviles", "Gobierno Electrónico y Transparencia Pública", "TIC para la Gestión Ambiental y Agropecuaria"];
            const proyectosPorEje = {};
            ejesOficiales.forEach(eje => proyectosPorEje[eje] = []);
            proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"] = [];

            proyectos.forEach(p => {
                const eje = p.eje_tematico ? p.eje_tematico.trim() : "Sin Línea Definida"; 
                let tipo = p.categoria.includes('docente') ? "Docentes Investigadores" : p.categoria.includes('emprendimiento') ? "Emprendimientos Tecnológicos" : "Estudiantes (Pregrado)";
                const n_ints = extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim());

                if (ejesOficiales.includes(eje)) proyectosPorEje[eje].push({ titulo: p.titulo || "Sin Título", integrantes: n_ints, tipo: tipo });
                else proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"].push({ titulo: p.titulo || "Sin Título", integrantes: n_ints, tipo: tipo });
            });

            let htmlEjes = "";
            let contadorEje = 1;

            const armarTablaEje = (nombreEje, lista, numeroStr, colorAlerta = false) => {
                const colorFondoHead = colorAlerta ? "#fff3cd" : "#e9ecef";
                const colorBorde = colorAlerta ? "#856404" : "#001f54";
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #000; background-color: ${colorFondoHead}; padding: 8px; border-left: 5px solid ${colorBorde}; margin-top: 30px;">${numeroStr} ${nombreEje}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="border-bottom: 2px solid #000;">
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 40%;">Nombre del Proyecto</th>
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 35%;">Responsables / Integrantes</th>
                                <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 25%;">Tipo de Expositor</th>
                            </tr>
                        </thead><tbody>`;
                
                if (lista.length === 0) { html += `<tr><td colspan="3" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666; font-style: italic;">No hay proyectos registrados en esta línea.</td></tr>`; } 
                else {
                    lista.forEach(proy => {
                        html += `<tr><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${proy.titulo}</td><td style="padding: 8px; border: 1px solid #ccc;">${proy.integrantes}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${proy.tipo}</td></tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            ejesOficiales.forEach(eje => { htmlEjes += armarTablaEje(eje, proyectosPorEje[eje], contadorEje + "."); contadorEje++; });
            if (proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"].length > 0) {
                htmlEjes += armarTablaEje("Otros (Líneas Anteriores / No Oficiales)", proyectosPorEje["Otros (Líneas Anteriores / No Oficiales)"], "⚠️", true);
            }

            areaImpresion.innerHTML = generarCabeceraOficial("RESUMEN DE PROYECTOS POR LÍNEAS DE INVESTIGACIÓN") + htmlEjes +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Revisado por:<br>Resp. de Investigación I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Aprobado por:<br>Director de Carrera UABJB</p></div>
                </div>`;
        }

        // ==========================================
        // 3. ACTA DE TRIBUNALES
        // ==========================================
        else if (valor === "tribunales") {
            const grupos = { "1. ESTUDIANTES (PREGRADO)": [], "2. DOCENTES INVESTIGADORES": [], "3. EMPRENDIMIENTOS TECNOLÓGICOS": [], "OTRAS EVALUACIONES (Registros sin categoría)": [] };

            evaluaciones.forEach(ev => { 
                const proy = proyectos.find(p => p.id === ev.id_proyecto);
                const trib = tribunales.find(t => t.usuario_tribunal === ev.usuario_tribunal);
                const nombreTribunalReal = trib ? trib.nombre_completo : (ev.usuario_tribunal || "Evaluador");
                let cat = "OTRAS EVALUACIONES (Registros sin categoría)";
                
                if (proy) {
                    cat = proy.categoria.includes('estudiante') ? "1. ESTUDIANTES (PREGRADO)" : proy.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                }
                grupos[cat].push({ tituloProyecto: proy ? proy.titulo : "Proyecto Desconocido", nombreTribunal: nombreTribunalReal, notaTribunal: ev.nota, observaciones: ev.observaciones });
            });

            const generarTabla = (tituloCat, lista) => {
                if (lista.length === 0 && tituloCat === "OTRAS EVALUACIONES (Registros sin categoría)") return "";
                lista.sort((a, b) => (parseFloat(b.notaTribunal) || 0) - (parseFloat(a.notaTribunal) || 0));
                let html = `
                    <h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tituloCat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead>
                            <tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 20%;">Proyecto Evaluado</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Tribunal Asignado</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Puntaje (80%)</th>
                                <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 45%;">Observaciones / Retroalimentación</th>
                            </tr>
                        </thead><tbody>`;
                if (lista.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">Aún no se han registrado calificaciones.</td></tr>`; } 
                else {
                    lista.forEach(ev => {
                        let tribunal = ev.nombreTribunal || "Ing. Evaluador";
                        if (!tribunal.toLowerCase().startsWith('ing')) tribunal = "Ing. " + tribunal;
                        const notaConv = ((parseFloat(ev.notaTribunal) || 0) * 0.80).toFixed(2);
                        let obs = ev.observaciones || "Sin observaciones registradas.";
                        if (!obs.startsWith('"')) obs = '"' + obs + '"';

                        html += `<tr>
                                <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold; color: var(--azul-uab);">${ev.tituloProyecto}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${tribunal}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px;">${notaConv}</td>
                                <td style="padding: 10px; border: 1px solid #ccc; font-style: italic;">${obs}</td>
                            </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("ACTA DETALLADA DE CALIFICACIONES DE TRIBUNALES", "El puntaje aquí reflejado representa únicamente la valoración técnica del Tribunal Evaluador, la cual equivale al 80% de la calificación final del proyecto.") + 
                generarTabla("1. ESTUDIANTES (PREGRADO)", grupos["1. ESTUDIANTES (PREGRADO)"]) + generarTabla("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + generarTabla("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) + generarTabla("OTRAS EVALUACIONES (Registros sin categoría)", grupos["OTRAS EVALUACIONES (Registros sin categoría)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Representante del Tribunal</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. Instituto de Investigación</p></div>
                </div>`;
        }
        
        // ==========================================
        // 4. VISITANTES Y AFLUENCIA
        // ==========================================
        else if (valor === "visitantes") {
            const diccProyectos = {};
            proyectos.forEach(p => {
                let cat = p.categoria.includes('estudiante') ? "1. ESTUDIANTES (PREGRADO)" : p.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                diccProyectos[p.id] = { titulo: p.titulo || "Sin Título", categoria: cat, visitas: 0, sumaNotas: 0 };
            });

            const afluenciaInst = {};
            visitantes.forEach(v => {
                const instNorm = (v.institucion || "Independiente").trim().toUpperCase();
                afluenciaInst[instNorm] = (afluenciaInst[instNorm] || 0) + 1;
            });

            votos.forEach(v => {
                if (diccProyectos[v.id_proyecto]) {
                    diccProyectos[v.id_proyecto].visitas += 1;
                    diccProyectos[v.id_proyecto].sumaNotas += Math.min(parseFloat(v.nota) || 0, 100);
                }
            });

            const listaProy = [];
            Object.values(diccProyectos).forEach(p => {
                if (p.visitas > 0) listaProy.push({ titulo: p.titulo, categoria: p.categoria, visitas: p.visitas, prom: p.sumaNotas / p.visitas, pts20: (p.sumaNotas / p.visitas) * 0.20 }); 
            });

            const totalProyValidos = proyectos.filter(p => p.estado_evaluacion === 'Pre-seleccionado').length;
            const promVotosProyecto = totalProyValidos > 0 ? (votos.length / totalProyValidos).toFixed(2) : "0.00";

            const generarTablaV = (cat) => {
                const filtrados = listaProy.filter(p => p.categoria === cat).sort((a, b) => b.pts20 - a.pts20);
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 20px; margin-bottom: 0;">${cat}</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                        <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 40%;">Nombre del Proyecto</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 20%;">Visitas Recibidas</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 20%;">Promedio (1-100)</th>
                            <th style="padding: 10px; border: 1px solid #ccc; text-align: center; color: var(--azul-uab); width: 20%;">Puntaje (20%)</th>
                        </tr></thead><tbody>`;
                if (filtrados.length === 0) { html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">Aún no hay votos del público en esta categoría.</td></tr>`; } 
                else {
                    filtrados.forEach(p => {
                        html += `<tr>
                            <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${p.titulo}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${p.visitas}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${p.prom.toFixed(2)}</td>
                            <td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-weight: bold; font-size: 14px; color: var(--azul-uab);">${p.pts20.toFixed(2)}</td>
                        </tr>`;
                    });
                }
                return html + `</tbody></table>`;
            };

            const listaInst = Object.keys(afluenciaInst).map(i => ({ nombre: i, cant: afluenciaInst[i], pct: visitantes.length > 0 ? Math.round((afluenciaInst[i] / visitantes.length) * 100) : 0 })).sort((a, b) => b.cant - a.cant);
            let htmlInst = "";
            if (listaInst.length === 0) htmlInst = `<tr><td colspan="3" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay visitantes habilitados registrados.</td></tr>`;
            else listaInst.forEach(i => htmlInst += `<tr><td style="padding: 10px; border: 1px solid #ccc; text-transform: capitalize;">${i.nombre.toLowerCase()}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i.cant}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i.pct}%</td></tr>`);

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE VOTACIÓN Y AFLUENCIA DEL PÚBLICO") + `
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-family: Arial, sans-serif;">
                    <div style="border: 2px solid #001f54; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Total de Visitantes</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${visitantes.length}</p></div>
                    <div style="border: 2px solid #28a745; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Votos Emitidos</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${votos.length}</p></div>
                    <div style="border: 2px solid #ffc107; border-radius: 8px; padding: 15px; width: 30%; text-align: center;"><h4 style="margin: 0; color: #555; font-size: 12px; text-transform: uppercase;">Promedio de Votos/Proyecto</h4><p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #000;">${promVotosProyecto}</p></div>
                </div>
                <h3 style="font-family: Arial, sans-serif; font-size: 15px; color: #000; border-bottom: 2px solid #001f54; padding-bottom: 5px; margin-top: 30px;">A. Desglose de Votación por Proyecto (20% de la Nota Final)</h3>
                ${generarTablaV("1. ESTUDIANTES (PREGRADO)") + generarTablaV("2. DOCENTES INVESTIGADORES") + generarTablaV("3. EMPRENDIMIENTOS TECNOLÓGICOS")}
                <h3 style="font-family: Arial, sans-serif; font-size: 15px; color: #000; border-bottom: 2px solid #001f54; padding-bottom: 5px; margin-top: 40px;">B. Afluencia por Instituciones Externas</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;"><th style="padding: 10px; border: 1px solid #ccc; text-align: left;">Nombre de la Institución</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center;">Cantidad de Visitantes</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center;">Porcentaje del Total</th></tr></thead>
                    <tbody>${htmlInst}</tbody>
                </table>
                <div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Interacción Social I.I.S.P.</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        // ==========================================
        // 5. REPORTES DE DOCUMENTOS RECIBIDOS
        // ==========================================
        else if (valor === "documentos") {
            const ciConProy = new Set();
            const grupos = { "1. ESTUDIANTES (PREGRADO)": [], "2. DOCENTES INVESTIGADORES": [], "3. EMPRENDIMIENTOS TECNOLÓGICOS": [], "4. PENDIENTES (SIN PROYECTO REGISTRADO)": [] };

            proyectos.forEach(p => {
                if (p.estado_evaluacion === 'Evaluado (No clasifica)') return;
                
                ciConProy.add(String(p.ci_propietario).trim()); 
                
                if (p.integrantes && p.integrantes.includes('|||')) {
                    try {
                        const arrInts = JSON.parse(p.integrantes.split('|||')[1].trim());
                        arrInts.forEach(miembro => {
                            if(miembro.ci) ciConProy.add(String(miembro.ci).trim());
                        });
                    } catch(e) {}
                }

                let cat = p.categoria.includes('estudiante') ? "1. ESTUDIANTES (PREGRADO)" : p.categoria.includes('docente') ? "2. DOCENTES INVESTIGADORES" : "3. EMPRENDIMIENTOS TECNOLÓGICOS";
                grupos[cat].push({ titulo: p.titulo || "Sin Título", integrantes: extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim()), eje: p.eje_tematico || "Sin Línea Definida", tienePDF: !!p.enlace_pdf });
            });

            expositores.forEach(exp => {
                // Verificar con el filtro avanzado de roles también
                const roles = obtenerRolesDeProyectos(exp.ci, exp.nombre_completo);
                if (roles.length === 0 && !ciConProy.has(String(exp.ci).trim())) {
                    grupos["4. PENDIENTES (SIN PROYECTO REGISTRADO)"].push({ titulo: "No registró información", integrantes: exp.nombre_completo, eje: "-", tienePDF: false });
                }
            });

            Object.values(grupos).forEach(g => g.sort((a, b) => a.titulo.localeCompare(b.titulo)));

            const generarTablaD = (tCat, lista) => {
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tCat} (Total: ${lista.length})</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 30%;">Título del Proyecto</th><th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 35%;">Autores / Expositores</th><th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 20%;">Línea de Investigación</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Archivo PDF</th>
                    </tr></thead><tbody>`;
                if (lista.length === 0) html += `<tr><td colspan="4" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay registros.</td></tr>`;
                else lista.forEach(p => html += `<tr><td style="padding: 10px; border: 1px solid #ccc; ${(p.titulo === "No registró información") ? "color: #dc3545; font-style: italic;" : "font-weight: bold;"}">${p.titulo}</td><td style="padding: 10px; border: 1px solid #ccc;">${p.integrantes}</td><td style="padding: 10px; border: 1px solid #ccc;">${p.eje}</td><td style="padding: 10px; border: 1px solid #ccc; text-align: center; font-size: 11px;">${p.tienePDF ? `<span style="color: #28a745; font-weight: bold;">✓<br>RECIBIDO</span>` : `<span style="color: #dc3545; font-weight: bold;">❌<br>FALTANTE</span>`}</td></tr>`);
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE INSCRIPCIÓN Y CONTROL DE DOCUMENTACIÓN", `Fecha de auditoría: ${new Date().toLocaleDateString()} — Estado: Concluido`) + 
                generarTablaD("1. ESTUDIANTES (PREGRADO)", grupos["1. ESTUDIANTES (PREGRADO)"]) + generarTablaD("2. DOCENTES INVESTIGADORES", grupos["2. DOCENTES INVESTIGADORES"]) + generarTablaD("3. EMPRENDIMIENTOS TECNOLÓGICOS", grupos["3. EMPRENDIMIENTOS TECNOLÓGICOS"]) + generarTablaD("4. PENDIENTES (SIN PROYECTO REGISTRADO)", grupos["4. PENDIENTES (SIN PROYECTO REGISTRADO)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 70px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Recibido y Verificado por:<br>Encargado de Soporte Técnico</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Sello de Conformidad<br>Instituto de Investigación</p></div>
                </div>`;
        }

        // ==========================================
        // 6. EXPOSITORES (LIMPIO, SIN ETIQUETAS)
        // ==========================================
        else if (valor === "expositores") {
            const grupos = { "1. Estudiantes (Pregrado)": [], "2. Docentes Investigadores": [], "3. Emprendimientos Tecnológicos": [], "4. Registrados sin Proyecto Subido (Pendientes)": [] };

            expositores.forEach(e => {
                let cat = "4. Registrados sin Proyecto Subido (Pendientes)";
                const roles = obtenerRolesDeProyectos(e.ci, e.nombre_completo);

                if (roles.length > 0) {
                    const proyPrincipal = roles.find(r => r.tipo === 'LIDER')?.proyecto || roles[0].proyecto;
                    cat = proyPrincipal.categoria.includes('estudiante') ? "1. Estudiantes (Pregrado)" : proyPrincipal.categoria.includes('docente') ? "2. Docentes Investigadores" : "3. Emprendimientos Tecnológicos";
                }

                // Solo el nombre puro
                const nombreCapitalizado = (e.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

                grupos[cat].push({ 
                    nombre_html: nombreCapitalizado, 
                    ci: e.ci || "N/A", 
                    institucion: e.institucion || "N/A", 
                    correo: (e.correo || "").toLowerCase(), 
                    celular: e.celular || "N/A",
                    orden: e.nombre_completo 
                });
            });

            Object.values(grupos).forEach(g => g.sort((a, b) => a.orden.localeCompare(b.orden)));

            const generarTablaE = (tCat, lista) => {
                if(lista.length === 0) return ""; 
                let html = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${tCat} (Total: ${lista.length})</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                    <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;"><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 25%;">Nombre Completo</th><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 10%;">C.I.</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 25%;">Institución</th><th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 20%;">Correo Electrónico</th><th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th></tr></thead><tbody>`;
                lista.forEach((e, i) => html += `<tr><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${e.nombre_html}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${e.ci}</td><td style="padding: 8px; border: 1px solid #ccc;">${e.institucion}</td><td style="padding: 8px; border: 1px solid #ccc; color: #0056b3;">${e.correo}</td><td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${e.celular}</td></tr>`);
                return html + `</tbody></table>`;
            };

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE EXPOSITORES REGISTRADOS") +
                generarTablaE("1. Estudiantes (Pregrado)", grupos["1. Estudiantes (Pregrado)"]) + generarTablaE("2. Docentes Investigadores", grupos["2. Docentes Investigadores"]) + generarTablaE("3. Emprendimientos Tecnológicos", grupos["3. Emprendimientos Tecnológicos"]) + generarTablaE("4. Registrados sin Proyecto Subido (Pendientes)", grupos["4. Registrados sin Proyecto Subido (Pendientes)"]) +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }

        // ==========================================
        // 7. VISITANTES PADRON (CON ETIQUETAS)
        // ==========================================
        else if (valor === "padron_visitantes") {
            const filtroSelect = document.getElementById('institucion-select');
            const institucionElegida = filtroSelect ? filtroSelect.value : "TODOS";
            const ciQueVotaron = new Set(votos.filter(v => v.ci_visitante).map(v => String(v.ci_visitante).trim()));

            const lVis = [];
            
            visitantes.forEach(v => {
                const i = (v.institucion || "N/A").trim();
                const cel = v.celular || "Sin número"; 
                if (institucionElegida === "TODOS" || institucionElegida.toLowerCase() === i.toLowerCase()) {
                    let n = (v.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    const roles = obtenerRolesDeProyectos(v.ci, v.nombre_completo);
                    
                    if (roles.length > 0) {
                        n += roles.map(r => {
                            if (r.tipo === 'LIDER') return `<br><span style="color: #0056b3; font-size: 0.82rem;">🔵 <b>Líder de Proyecto</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                            return `<br><span style="color: #008080; font-size: 0.82rem;">🟢 <b>Co-Expositor</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                        }).join('');
                    }
                    lVis.push({ n, ci: String(v.ci).trim(), i, cel, v: ciQueVotaron.has(String(v.ci).trim()) ? `<span style="color:#28a745; font-weight:bold;">✓ SÍ</span>` : `<span style="color:#dc3545; font-weight:bold;">❌ NO</span>` });
                }
            });

            expositores.forEach(e => {
                const i = (e.institucion || "N/A").trim();
                const cel = e.celular || "Sin número"; 
                if (institucionElegida === "TODOS" || institucionElegida.toLowerCase() === i.toLowerCase()) {
                    const c = String(e.ci).trim();
                    let n = (e.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
                    const roles = obtenerRolesDeProyectos(e.ci, e.nombre_completo);
                    
                    if (roles.length > 0) {
                        n += roles.map(r => {
                            if (r.tipo === 'LIDER') return `<br><span style="color: #0056b3; font-size: 0.82rem;">🔵 <b>Líder de Proyecto</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                            return `<br><span style="color: #008080; font-size: 0.82rem;">🟢 <b>Co-Expositor</b> — <i>"${r.proyecto.titulo}"</i></span>`;
                        }).join('');
                    } else {
                        n += `<br><span style="color: #dc3545; font-size: 0.82rem;">🔴 <b>Expositor</b> — <i style="color: #dc3545;">No subió proyecto</i></span>`;
                    }

                    const idx = lVis.findIndex(v => v.ci === c);
                    if (idx === -1) lVis.push({ n, ci: c, i, cel, v: ciQueVotaron.has(c) ? `<span style="color:#28a745; font-weight:bold;">✓ SÍ</span>` : `<span style="color:#dc3545; font-weight:bold;">❌ NO</span>` });
                    else { lVis[idx].n = n; lVis[idx].cel = cel; } 
                }
            });

            lVis.sort((a, b) => a.n.localeCompare(b.n));
            let titTab = institucionElegida === "TODOS" ? "Padrón General (Visitantes y Expositores)" : (/colegio|unidad|escuela|uab|universidad|instituto/i.test(institucionElegida)) ? `Lista de Asistencia: ${institucionElegida}` : `Visitantes Externos: ${institucionElegida}`;

            let htmlTabla = `<h3 style="font-family: Arial, sans-serif; font-size: 14px; color: #fff; background-color: #002b5c; padding: 8px; margin-top: 25px; margin-bottom: 0;">${titTab} (Total: ${lVis.length})</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: Arial, sans-serif; font-size: 11px; color: #000;">
                <thead><tr style="background-color: #f2f2f2; border-bottom: 2px solid #000;">
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 30%;">Nombre Completo</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 12%;">C.I.</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: left; width: 28%;">Institución</th>
                    <th style="padding: 8px; border: 1px solid #ccc; text-align: center; width: 10%;">Votos</th>
                </tr></thead><tbody>`;

            if (lVis.length === 0) htmlTabla += `<tr><td colspan="6" style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #666;">No hay personas registradas en esta institución.</td></tr>`;
            else lVis.forEach((v, i) => htmlTabla += `<tr>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${v.n}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${v.ci}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center;">${v.cel}</td>
                <td style="padding: 8px; border: 1px solid #ccc;">${v.i}</td>
                <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-size: 12px;">${v.v}</td>
            </tr>`);
            htmlTabla += `</tbody></table>`;

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE VISITANTES Y ESTADO DE VOTACIÓN", `Filtro aplicado: ${institucionElegida === "TODOS" ? "Padrón General (Todas las Instituciones)" : institucionElegida}`) + htmlTabla +
                `<div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }
        
        // ==========================================
        // 8. PADRON TRIBUNALES
        // ==========================================
        else if (valor === "padron_tribunales") {
            const lTrib = tribunales.map(t => ({ 
                n: (t.nombre_completo || "Sin Nombre").toLowerCase().replace(/\b\w/g, l => l.toUpperCase()), 
                e: t.especialidad || "No especificada", 
                c: t.correo || "No registrado",
                cel: t.celular || "Sin número"
            })).sort((a, b) => a.n.localeCompare(b.n));

            let htmlF = "";
            if (lTrib.length === 0) htmlF = `<tr><td colspan="5" style="padding: 10px; border: 1px solid #ccc; text-align: center; color: #666;">No hay tribunales registrados.</td></tr>`;
            else lTrib.forEach((t, i) => htmlF += `<tr>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${i + 1}</td>
                <td style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${t.n}</td>
                <td style="padding: 10px; border: 1px solid #ccc;">${t.e}</td>
                <td style="padding: 10px; border: 1px solid #ccc; text-align: center;">${t.cel}</td>
                <td style="padding: 10px; border: 1px solid #ccc; color: var(--azul-uab);">${t.c}</td>
            </tr>`);

            areaImpresion.innerHTML = generarCabeceraOficial("PADRÓN OFICIAL DE TRIBUNALES EVALUADORES") + `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; font-family: Arial, sans-serif; font-size: 12px; color: #000;">
                    <thead><tr style="background-color: #002b5c; color: #fff; border-bottom: 2px solid #000;">
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 30%;">Nombre del Tribunal</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Especialidad</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 15%;">Celular</th>
                        <th style="padding: 10px; border: 1px solid #ccc; text-align: left; width: 25%;">Correo Electrónico</th>
                    </tr></thead>
                    <tbody>${htmlF}</tbody>
                </table>
                <div style="display: flex; justify-content: space-around; margin-top: 70px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Resp. de Registro y Admisión</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 230px;">Firma y Sello<br>Comité Organizador</p></div>
                </div>`;
        }
        
        // ==========================================
        // 9. NO CLASIFICADOS
        // ==========================================
        else if (valor === "9" || valor === "no_clasificados" || valor.includes("No Clasificados")) {
            let html = `<table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; font-family: Arial, sans-serif;">
                <thead><tr style="background-color: #002b5c; color: white;"><th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 5%;">N°</th><th style="padding: 10px; border: 1px solid #ccc; width: 25%;">Título del Proyecto</th><th style="padding: 10px; border: 1px solid #ccc; width: 15%;">Categoría</th><th style="padding: 10px; border: 1px solid #ccc; width: 20%;">Integrantes</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Nota Tribunal</th><th style="padding: 10px; border: 1px solid #ccc; text-align: center; width: 10%;">Nota Ponderada (80%)</th><th style="padding: 10px; border: 1px solid #ccc; width: 15%;">Observaciones</th></tr></thead><tbody>`;

            let cont = 0;
            proyectos.forEach(p => {
                if (p.estado_evaluacion === "Evaluado (No clasifica)") {
                    cont++;
                    let cat = p.categoria.includes('docente') ? "Docentes" : p.categoria.includes('emprendimiento') ? "Emprendimientos" : "Estudiantes";
                    html += `<tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center;"><b>${cont}</b></td>
                        <td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; color: #002b5c;">${p.titulo || "Sin título"}</td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${cat}</td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${extraerNombresDeProyecto(p.integrantes, String(p.ci_propietario).trim())}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center; color: #666;">${p.nota_tribunal ? Number(p.nota_tribunal).toFixed(1) : "0.0"} / 100</td>
                        <td style="padding: 8px; border: 1px solid #ccc; text-align: center; font-weight: bold; color: #d32f2f;">${p.nota_ponderada ? Number(p.nota_ponderada).toFixed(1) : "0.0"} pts</td>
                        <td style="padding: 8px; border: 1px solid #ccc; font-style: italic; color: #444; font-size: 11px;">"${p.observaciones_tribunal || "Sin observaciones."}"</td>
                    </tr>`;
                }
            });

            if (cont === 0) html += `<tr><td colspan="7" style="text-align: center; padding: 25px; color: #666; font-style: italic;">No hay proyectos no clasificados registrados en el sistema en este momento.</td></tr>`;

            areaImpresion.innerHTML = generarCabeceraOficial("REPORTE DE PROYECTOS NO CLASIFICADOS", "Proyectos evaluados en la Etapa 1 que no alcanzaron el puntaje mínimo ponderado de aprobación (51 pts).") + html + `</tbody></table>
                <div style="display: flex; justify-content: space-around; margin-top: 60px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #000; page-break-inside: avoid;">
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Comité Evaluador</p></div>
                    <div><p style="margin: 0; border-top: 1px solid #000; padding-top: 5px; width: 220px;">Firma y Sello<br>Director de Carrera UABJB</p></div>
                </div>`;
        }

        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }

    } catch (error) {
        console.error("Error al generar reporte:", error);
        areaImpresion.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">❌ Error al conectar con la base de datos PostgreSQL.</div>';
        if (btn) { btn.innerHTML = '<i class="fas fa-print"></i> Imprimir Documento'; btn.disabled = false; }
    } 
};

window.imprimirInformeActual = function(event) {
    if (event) event.preventDefault(); 
    const areaImpresion = document.getElementById('informe-impresion');
    if (!areaImpresion || areaImpresion.style.display === 'none' || areaImpresion.innerHTML.trim() === '') {
        alert("Por favor, seleccione un tipo de informe primero para visualizarlo.");
        return;
    }
    imprimirElemento('informe-impresion');
};